"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createParkingReport } from "@/lib/actions/reports";
import { compressImage } from "@/lib/images/compress";
import { queueDraft } from "@/lib/offline/queue";
import { createClient } from "@/lib/supabase/client";
import {
  EVIDENCE_CATEGORIES,
  PARKING_TYPES,
  PAYMENT_MODES,
  type EvidenceCategory,
  type ParkingType,
  type PaymentMode,
} from "@/lib/types";
import {
  EVIDENCE_CATEGORY_LABELS,
  PARKING_TYPE_LABELS,
  PAYMENT_MODE_LABELS,
} from "@/lib/constants";
import {
  EvidencePicker,
  type LocalEvidence,
} from "@/components/verify/evidence-picker";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const steps = ["Location", "Evidence", "Operator", "Payment", "Review"];

type EvidenceItem = LocalEvidence;

type FormState = {
  sector: string;
  address: string;
  landmark: string;
  latitude: string;
  longitude: string;
  googleMapsUrl: string;
  description: string;
  parkingType: ParkingType | "";
  operatorName: string;
  attendantName: string;
  attendantId: string;
  phone: string;
  uniformIdVisible: string;
  contractorOnSign: string;
  contractNumber: string;
  parkingLicenceNumber: string;
  operatorNotes: string;
  amount: string;
  paymentMode: PaymentMode | "";
  upiRecipientName: string;
  upiId: string;
  utr: string;
  paymentTimestamp: string;
  receiptAvailable: string;
  receiptNumber: string;
  parkingNumber: string;
  spotNumber: string;
  deviceNumber: string;
  entryTime: string;
  exitTime: string;
  durationMinutes: string;
  receiptAmount: string;
  issuerName: string;
  receiptText: string;
  visibility: "PRIVATE" | "ANONYMISED_PUBLIC";
};

const initial: FormState = {
  sector: "",
  address: "",
  landmark: "",
  latitude: "",
  longitude: "",
  googleMapsUrl: "",
  description: "",
  parkingType: "",
  operatorName: "",
  attendantName: "",
  attendantId: "",
  phone: "",
  uniformIdVisible: "",
  contractorOnSign: "",
  contractNumber: "",
  parkingLicenceNumber: "",
  operatorNotes: "",
  amount: "",
  paymentMode: "",
  upiRecipientName: "",
  upiId: "",
  utr: "",
  paymentTimestamp: "",
  receiptAvailable: "",
  receiptNumber: "",
  parkingNumber: "",
  spotNumber: "",
  deviceNumber: "",
  entryTime: "",
  exitTime: "",
  durationMinutes: "",
  receiptAmount: "",
  issuerName: "",
  receiptText: "",
  visibility: "PRIVATE",
};

function yesNo(value: string): boolean | null {
  if (value === "yes") return true;
  if (value === "no") return false;
  return null;
}

export function VerifyWizard({ userId }: { userId: string }) {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [form, setForm] = useState<FormState>(initial);
  const [evidence, setEvidence] = useState<EvidenceItem[]>([]);
  const [geoError, setGeoError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [offlineNote, setOfflineNote] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const set = (key: keyof FormState, value: string) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const payload = useMemo(
    () => ({
      location: {
        sector: form.sector || undefined,
        address: form.address || undefined,
        landmark: form.landmark || undefined,
        latitude: form.latitude ? Number(form.latitude) : null,
        longitude: form.longitude ? Number(form.longitude) : null,
        googleMapsUrl: form.googleMapsUrl || undefined,
        description: form.description || undefined,
        parkingType: form.parkingType || undefined,
      },
      operator: {
        operatorName: form.operatorName || undefined,
        attendantName: form.attendantName || undefined,
        attendantId: form.attendantId || undefined,
        phone: form.phone || undefined,
        uniformIdVisible: yesNo(form.uniformIdVisible),
        contractorOnSign: yesNo(form.contractorOnSign),
        contractNumber: form.contractNumber || undefined,
        parkingLicenceNumber: form.parkingLicenceNumber || undefined,
        notes: form.operatorNotes || undefined,
      },
      payment: {
        amount: form.amount ? Number(form.amount) : null,
        paymentMode: form.paymentMode || undefined,
        upiRecipientName: form.upiRecipientName || undefined,
        upiId: form.upiId || undefined,
        utr: form.utr || undefined,
        paymentTimestamp: form.paymentTimestamp || undefined,
        receiptAvailable: yesNo(form.receiptAvailable),
      },
      receipt: {
        receiptNumber: form.receiptNumber || undefined,
        parkingNumber: form.parkingNumber || undefined,
        spotNumber: form.spotNumber || undefined,
        deviceNumber: form.deviceNumber || undefined,
        entryTime: form.entryTime || undefined,
        exitTime: form.exitTime || undefined,
        durationMinutes: form.durationMinutes ? Number(form.durationMinutes) : null,
        amount: form.receiptAmount ? Number(form.receiptAmount) : null,
        issuerName: form.issuerName || undefined,
        receiptText: form.receiptText || undefined,
      },
      visibility: form.visibility,
    }),
    [form],
  );

  async function useCurrentLocation() {
    setGeoError(null);
    if (!navigator.geolocation) {
      setGeoError("Geolocation is not available. Enter coordinates manually.");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        set("latitude", pos.coords.latitude.toFixed(6));
        set("longitude", pos.coords.longitude.toFixed(6));
      },
      () => {
        setGeoError("Permission unavailable. Enter coordinates or an address instead. Location is not mandatory.");
      },
      { enableHighAccuracy: true, timeout: 12000 },
    );
  }

  async function onFiles(files: FileList | null, category: EvidenceCategory) {
    if (!files) return;
    const next: EvidenceItem[] = [];
    for (const file of Array.from(files)) {
      const compressed = await compressImage(file);
      next.push({
        id: crypto.randomUUID(),
        file: compressed,
        category,
        previewUrl: URL.createObjectURL(compressed),
      });
    }
    setEvidence((prev) => [...prev, ...next]);
  }

  function removeEvidence(id: string) {
    setEvidence((prev) => {
      const target = prev.find((item) => item.id === id);
      if (target?.previewUrl.startsWith("blob:")) {
        URL.revokeObjectURL(target.previewUrl);
      }
      return prev.filter((item) => item.id !== id);
    });
  }

  async function uploadEvidence(reportIdGuess: string) {
    const supabase = createClient();
    const uploaded: { storagePath: string; category: EvidenceCategory }[] = [];
    for (const item of evidence) {
      const path = `${userId}/${reportIdGuess}/${crypto.randomUUID()}-${item.file.name}`;
      const { error } = await supabase.storage.from("evidence").upload(path, item.file, {
        upsert: false,
        contentType: item.file.type,
      });
      if (!error) uploaded.push({ storagePath: path, category: item.category });
    }
    return uploaded;
  }

  async function submit() {
    setBusy(true);
    setSubmitError(null);
    setOfflineNote(null);

    if (typeof navigator !== "undefined" && !navigator.onLine) {
      await queueDraft(payload);
      setOfflineNote("Saved on this device — waiting for connection. It has not been submitted to the server.");
      setBusy(false);
      return;
    }

    const tempId = crypto.randomUUID();
    let uploaded: { storagePath: string; category: EvidenceCategory }[] = [];
    try {
      uploaded = evidence.length ? await uploadEvidence(tempId) : [];
    } catch {
      await queueDraft(payload);
      setOfflineNote("Upload failed. Saved on this device — waiting for connection.");
      setBusy(false);
      return;
    }

    const result = await createParkingReport({
      ...payload,
      evidence: uploaded.map((e) => ({
        storagePath: e.storagePath,
        category: e.category,
      })),
    });
    setBusy(false);
    if (result.error || !result.id) {
      setSubmitError(result.error ?? "Could not submit report.");
      return;
    }
    router.push(`/reports/${result.id}`);
  }

  return (
    <div className="space-y-5">
      <ol className="flex gap-1 text-xs">
        {steps.map((label, i) => (
          <li
            key={label}
            className={`flex-1 rounded-full px-2 py-1 text-center ${
              i === step ? "bg-zinc-900 text-white" : i < step ? "bg-zinc-300" : "bg-zinc-100"
            }`}
          >
            {label}
          </li>
        ))}
      </ol>

      {step === 0 && (
        <div className="space-y-3 rounded-lg border bg-white p-4">
          <Button type="button" className="h-12 w-full" onClick={useCurrentLocation}>
            Use current location
          </Button>
          {geoError ? <p className="text-sm text-amber-800">{geoError}</p> : null}
          <Field label="Sector" value={form.sector} onChange={(v) => set("sector", v)} placeholder="142" />
          <Field label="Address / landmark" value={form.landmark} onChange={(v) => set("landmark", v)} placeholder="Advant Navis" />
          <Field label="Address" value={form.address} onChange={(v) => set("address", v)} />
          <div className="grid grid-cols-2 gap-3">
            <Field label="Latitude" value={form.latitude} onChange={(v) => set("latitude", v)} placeholder="28.50002" />
            <Field label="Longitude" value={form.longitude} onChange={(v) => set("longitude", v)} placeholder="77.41088" />
          </div>
          <Field label="Google Maps URL (optional)" value={form.googleMapsUrl} onChange={(v) => set("googleMapsUrl", v)} />
          <div className="space-y-1">
            <Label>Parking type</Label>
            <Select value={form.parkingType} onValueChange={(v) => set("parkingType", v)}>
              <SelectTrigger className="h-12"><SelectValue placeholder="Select type" /></SelectTrigger>
              <SelectContent>
                {PARKING_TYPES.map((t) => (
                  <SelectItem key={t} value={t}>{PARKING_TYPE_LABELS[t]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label>Location description</Label>
            <Textarea value={form.description} onChange={(e) => set("description", e.target.value)} />
          </div>
        </div>
      )}

      {step === 1 && (
        <div className="space-y-3 rounded-lg border bg-white p-4">
          <p className="text-sm text-zinc-600">
            Add evidence with the camera, photo library, or a file from this device.
            Images are compressed on the phone before upload. Receipts can also be a PDF.
          </p>
          {EVIDENCE_CATEGORIES.map((cat) => (
            <EvidencePicker
              key={cat}
              title={EVIDENCE_CATEGORY_LABELS[cat]}
              category={cat}
              hint={
                cat === "RECEIPT"
                  ? "Camera, gallery, or a file/PDF of the parking slip."
                  : cat === "QR_CODE"
                    ? "Parking QR, UPI QR, or payment screenshot."
                    : "Camera, photo library, or a file from this device."
              }
              allowPdf={cat === "RECEIPT" || cat === "QR_CODE"}
              items={evidence}
              onAdd={onFiles}
              onRemove={removeEvidence}
            />
          ))}
        </div>
      )}

      {step === 2 && (
        <div className="space-y-3 rounded-lg border bg-white p-4">
          <Field label="Operator / contractor name" value={form.operatorName} onChange={(v) => set("operatorName", v)} />
          <Field label="Attendant name" value={form.attendantName} onChange={(v) => set("attendantName", v)} />
          <Field label="Attendant ID" value={form.attendantId} onChange={(v) => set("attendantId", v)} />
          <Field label="Phone (optional)" value={form.phone} onChange={(v) => set("phone", v)} />
          <YesNo label="Uniform / ID visible?" value={form.uniformIdVisible} onChange={(v) => set("uniformIdVisible", v)} />
          <YesNo label="Contractor displayed on sign?" value={form.contractorOnSign} onChange={(v) => set("contractorOnSign", v)} />
          <Field label="Contract number" value={form.contractNumber} onChange={(v) => set("contractNumber", v)} />
          <Field label="Parking licence number" value={form.parkingLicenceNumber} onChange={(v) => set("parkingLicenceNumber", v)} />
          <div className="space-y-1">
            <Label>Notes</Label>
            <Textarea value={form.operatorNotes} onChange={(e) => set("operatorNotes", e.target.value)} />
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="space-y-3 rounded-lg border bg-white p-4">
          <Field label="Amount charged (₹)" value={form.amount} onChange={(v) => set("amount", v)} placeholder="20" />
          <div className="space-y-1">
            <Label>Payment mode</Label>
            <Select value={form.paymentMode} onValueChange={(v) => set("paymentMode", v)}>
              <SelectTrigger className="h-12"><SelectValue placeholder="Select mode" /></SelectTrigger>
              <SelectContent>
                {PAYMENT_MODES.map((m) => (
                  <SelectItem key={m} value={m}>{PAYMENT_MODE_LABELS[m]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {form.paymentMode === "UPI" && (
            <div className="space-y-3 rounded-md border border-zinc-200 bg-zinc-50 p-3">
              <p className="text-xs text-zinc-600">A personal UPI name is not proof that collection is unauthorised.</p>
              <Field label="UPI recipient name" value={form.upiRecipientName} onChange={(v) => set("upiRecipientName", v)} placeholder="Arvind Yadav" />
              <Field label="UPI ID" value={form.upiId} onChange={(v) => set("upiId", v)} />
              <Field label="Transaction reference / UTR" value={form.utr} onChange={(v) => set("utr", v)} />
              <Field label="Payment timestamp" value={form.paymentTimestamp} onChange={(v) => set("paymentTimestamp", v)} placeholder="2026-08-20T19:15" />
            </div>
          )}
          {form.paymentMode === "CASH" && (
            <YesNo label="Receipt available?" value={form.receiptAvailable} onChange={(v) => set("receiptAvailable", v)} />
          )}
          <EvidencePicker
            title="Payment screenshot / confirmation"
            hint="UPI success screen, card slip, SMS, or bank PDF — camera, photos, or file."
            category="QR_CODE"
            allowPdf
            items={evidence}
            onAdd={onFiles}
            onRemove={removeEvidence}
          />
          <div className="space-y-3 rounded-md border p-3">
            <p className="text-sm font-medium">Parking receipt</p>
            <EvidencePicker
              title="Receipt image or PDF"
              hint="Take a photo, pick from your gallery, or upload a file/PDF."
              category="RECEIPT"
              allowPdf
              items={evidence}
              onAdd={onFiles}
              onRemove={removeEvidence}
            />
            <Field label="Parking name / number" value={form.parkingNumber} onChange={(v) => set("parkingNumber", v)} placeholder="Noida Auth Parking 142" />
            <Field label="Spot number" value={form.spotNumber} onChange={(v) => set("spotNumber", v)} placeholder="00102" />
            <Field label="Device number" value={form.deviceNumber} onChange={(v) => set("deviceNumber", v)} placeholder="842129340" />
            <Field label="Receipt number" value={form.receiptNumber} onChange={(v) => set("receiptNumber", v)} />
            <Field label="Receipt issuer / name" value={form.issuerName} onChange={(v) => set("issuerName", v)} />
            <div className="grid grid-cols-2 gap-3">
              <Field label="Entry time" value={form.entryTime} onChange={(v) => set("entryTime", v)} placeholder="2026-08-29T18:46" />
              <Field label="Exit time" value={form.exitTime} onChange={(v) => set("exitTime", v)} placeholder="2026-08-29T19:14" />
            </div>
            <Field label="Duration (minutes)" value={form.durationMinutes} onChange={(v) => set("durationMinutes", v)} placeholder="27" />
            <Field label="Receipt amount (₹)" value={form.receiptAmount} onChange={(v) => set("receiptAmount", v)} placeholder="20" />
            <div className="space-y-1">
              <Label>Receipt text</Label>
              <Textarea value={form.receiptText} onChange={(e) => set("receiptText", e.target.value)} />
            </div>
          </div>
        </div>
      )}

      {step === 4 && (
        <div className="space-y-3 rounded-lg border bg-white p-4 text-sm">
          <p><strong>Sector:</strong> {form.sector || "—"}</p>
          <p><strong>Landmark:</strong> {form.landmark || form.address || "—"}</p>
          <p><strong>Coordinates:</strong> {form.latitude && form.longitude ? `${form.latitude}, ${form.longitude}` : "Not recorded"}</p>
          <p><strong>Operator:</strong> {form.operatorName || "—"}</p>
          <p><strong>Attendant:</strong> {form.attendantName || "—"}</p>
          <p><strong>Amount:</strong> {form.amount ? `₹${form.amount}` : "—"}</p>
          <p><strong>Payment:</strong> {form.paymentMode || "—"} {form.upiRecipientName ? `(${form.upiRecipientName})` : ""}</p>
          <div>
            <p><strong>Attachments:</strong> {evidence.length}</p>
            {evidence.length > 0 ? (
              <ul className="mt-1 list-inside list-disc text-zinc-600">
                {EVIDENCE_CATEGORIES.filter((cat) => evidence.some((item) => item.category === cat)).map((cat) => (
                  <li key={cat}>
                    {EVIDENCE_CATEGORY_LABELS[cat]}: {evidence.filter((item) => item.category === cat).length}
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
          <div className="space-y-1">
            <Label>Visibility</Label>
            <Select value={form.visibility} onValueChange={(v) => set("visibility", v)}>
              <SelectTrigger className="h-12"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="PRIVATE">Private — only me and staff</SelectItem>
                <SelectItem value="ANONYMISED_PUBLIC">Anonymised public map pin</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      )}

      {submitError ? <p className="text-sm text-red-700">{submitError}</p> : null}
      {offlineNote ? <p className="rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-950">{offlineNote}</p> : null}

      <div className="sticky bottom-16 z-20 flex gap-2 bg-zinc-50/95 py-3 md:bottom-0">
        {step > 0 ? (
          <Button type="button" variant="outline" className="h-12 flex-1" onClick={() => setStep((s) => s - 1)}>
            Back
          </Button>
        ) : null}
        {step < steps.length - 1 ? (
          <Button type="button" className="h-12 flex-1" onClick={() => setStep((s) => s + 1)}>
            Next
          </Button>
        ) : (
          <Button type="button" className="h-12 flex-1" disabled={busy} onClick={submit}>
            {busy ? "Submitting…" : "Submit and verify"}
          </Button>
        )}
      </div>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <div className="space-y-1">
      <Label>{label}</Label>
      <Input className="h-12" value={value} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} />
    </div>
  );
}

function YesNo({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="space-y-1">
      <Label>{label}</Label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className="h-12"><SelectValue placeholder="Select" /></SelectTrigger>
        <SelectContent>
          <SelectItem value="yes">Yes</SelectItem>
          <SelectItem value="no">No</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}

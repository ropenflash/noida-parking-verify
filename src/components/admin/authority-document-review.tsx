"use client";

import { useState } from "react";
import {
  approveProposedRecord,
  extractAuthorityDocument,
  rejectProposedRecord,
  updateProposedRecord,
} from "@/lib/actions/authority";
import type { ProposedPayload } from "@/lib/authority/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

type ProposedRow = {
  id: string;
  entity_kind: string;
  review_status: string;
  verification_status: string;
  confidence_score: number | null;
  payload: ProposedPayload;
  review_notes: string | null;
};

export function AuthorityDocumentReview({
  documentId,
  workflowStatus,
  records,
}: {
  documentId: string;
  workflowStatus: string;
  records: ProposedRow[];
}) {
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  return (
    <div className="space-y-4">
      <form
        action={async () => {
          setBusy(true);
          const result = await extractAuthorityDocument(documentId);
          setBusy(false);
          setMessage(
            result.error ??
              `${result.count} proposed record(s). None are verified until you approve them.`,
          );
        }}
      >
        <Button className="h-12 w-full" disabled={busy}>
          {busy ? "Extracting…" : "Extract proposed records"}
        </Button>
      </form>
      <p className="text-xs text-zinc-600">
        Workflow: DOCUMENT → EXTRACTION → PROPOSED DATA → ADMIN REVIEW → VERIFIED AUTHORITY DATA →
        ACTIVE/EXPIRED. Current step: {workflowStatus}. AI or file extraction never writes verified
        authority data on its own.
      </p>
      {message ? <p className="text-sm">{message}</p> : null}
      {records.map((record) => (
        <ProposedEditor key={record.id} record={record} />
      ))}
    </div>
  );
}

function ProposedEditor({ record }: { record: ProposedRow }) {
  const p = record.payload ?? {};
  const locked = record.review_status === "APPROVED";
  const [error, setError] = useState<string | null>(null);

  function read(fd: FormData): ProposedPayload {
    const num = (key: string) => {
      const v = String(fd.get(key) ?? "").trim();
      return v ? Number(v) : null;
    };
    return {
      name: String(fd.get("name") ?? "") || undefined,
      sector: String(fd.get("sector") ?? "") || undefined,
      address: String(fd.get("address") ?? "") || undefined,
      landmark: String(fd.get("landmark") ?? "") || undefined,
      latitude: num("latitude"),
      longitude: num("longitude"),
      parkingType: String(fd.get("parkingType") ?? "") || undefined,
      cluster: String(fd.get("cluster") ?? "") || undefined,
      workCircle: String(fd.get("workCircle") ?? "") || undefined,
      tenderNumber: String(fd.get("tenderNumber") ?? "") || undefined,
      contractNumber: String(fd.get("contractNumber") ?? "") || undefined,
      contractorName: String(fd.get("contractorName") ?? "") || undefined,
      parkingSiteId: String(fd.get("parkingSiteId") ?? "") || undefined,
      approvedRate: num("approvedRate"),
      rateUnit: String(fd.get("rateUnit") ?? "") || undefined,
      effectiveFrom: String(fd.get("effectiveFrom") ?? "") || undefined,
      effectiveUntil: String(fd.get("effectiveUntil") ?? "") || undefined,
      notes: String(fd.get("notes") ?? "") || undefined,
    };
  }

  return (
    <form
      className="space-y-2 rounded-lg border bg-white p-4"
      action={async (fd) => {
        const intent = String(fd.get("intent"));
        if (intent === "save") {
          const result = await updateProposedRecord(record.id, read(fd));
          setError(result.error);
          return;
        }
        if (intent === "approve") {
          await updateProposedRecord(record.id, read(fd));
          const result = await approveProposedRecord(record.id);
          setError(result.error);
          return;
        }
        if (intent === "reject") {
          const result = await rejectProposedRecord(record.id, String(fd.get("reviewNotes") ?? ""));
          setError(result.error);
        }
      }}
    >
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
        <p className="font-semibold">{record.entity_kind}</p>
        <p>
          {record.review_status} · confidence {record.confidence_score ?? "—"}
        </p>
      </div>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        <Field name="name" label="Name / site" defaultValue={p.name} disabled={locked} />
        <Field name="sector" label="Sector" defaultValue={p.sector} disabled={locked} />
        <Field name="address" label="Address" defaultValue={p.address} disabled={locked} />
        <Field name="landmark" label="Landmark" defaultValue={p.landmark} disabled={locked} />
        <Field name="latitude" label="Latitude" defaultValue={p.latitude ?? ""} disabled={locked} />
        <Field name="longitude" label="Longitude" defaultValue={p.longitude ?? ""} disabled={locked} />
        <Field name="parkingType" label="Parking type" defaultValue={p.parkingType ?? ""} disabled={locked} />
        <Field name="cluster" label="Cluster" defaultValue={p.cluster} disabled={locked} />
        <Field name="workCircle" label="Work circle" defaultValue={p.workCircle} disabled={locked} />
        <Field name="tenderNumber" label="Tender number" defaultValue={p.tenderNumber} disabled={locked} />
        <Field name="contractNumber" label="Contract number" defaultValue={p.contractNumber} disabled={locked} />
        <Field name="contractorName" label="Contractor" defaultValue={p.contractorName} disabled={locked} />
        <Field name="parkingSiteId" label="Existing site ID (for contract/rate)" defaultValue={p.parkingSiteId} disabled={locked} />
        <Field name="approvedRate" label="Approved rate" defaultValue={p.approvedRate ?? ""} disabled={locked} />
        <Field name="effectiveFrom" label="Effective from" defaultValue={p.effectiveFrom ?? ""} disabled={locked} />
        <Field name="effectiveUntil" label="Effective until" defaultValue={p.effectiveUntil ?? ""} disabled={locked} />
      </div>
      <div className="space-y-1">
        <Label>Notes</Label>
        <Textarea name="notes" defaultValue={p.notes ?? p.rawText ?? ""} disabled={locked} />
      </div>
      {error ? <p className="text-sm text-red-700">{error}</p> : null}
      {locked ? (
        <p className="text-xs text-zinc-600">Approved. Historical contracts are preserved; expire them instead of overwriting.</p>
      ) : (
        <div className="flex flex-col gap-2 sm:flex-row">
          <Button name="intent" value="save" variant="outline" className="h-11 flex-1">
            Save edits
          </Button>
          <Button name="intent" value="approve" className="h-11 flex-1">
            Approve into verified data
          </Button>
          <Button name="intent" value="reject" variant="outline" className="h-11 flex-1">
            Reject
          </Button>
        </div>
      )}
      <Input name="reviewNotes" placeholder="Reject reason (optional)" disabled={locked} />
    </form>
  );
}

function Field({
  name,
  label,
  defaultValue,
  disabled,
}: {
  name: string;
  label: string;
  defaultValue?: string | number | null;
  disabled?: boolean;
}) {
  return (
    <div className="space-y-1">
      <Label>{label}</Label>
      <Input name={name} defaultValue={defaultValue ?? ""} disabled={disabled} className="h-11" />
    </div>
  );
}

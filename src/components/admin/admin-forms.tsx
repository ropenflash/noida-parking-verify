"use client";

import { useState } from "react";
import {
  addAuthoritySource,
  addContract,
  addContractor,
  addParkingRate,
  addParkingSite,
  markSiteExpired,
} from "@/lib/actions/admin";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type Source = { id: string; source_title: string };
type Site = { id: string; name: string; official_status: string };
type Contractor = { id: string; legal_name: string };

export function AdminForms({
  sites,
  contractors,
  sources,
}: {
  sites: Site[];
  contractors: Contractor[];
  sources: Source[];
}) {
  const [message, setMessage] = useState<string | null>(null);

  async function run(fn: (input: unknown) => Promise<{ error: string | null }>, input: unknown) {
    const result = await fn(input);
    setMessage(result.error ?? "Saved.");
  }

  return (
    <div className="space-y-6">
      {message ? <p className="text-sm">{message}</p> : null}

      <form
        className="space-y-2 rounded-lg border bg-white p-4"
        action={async (fd) => {
          await run(addAuthoritySource, {
            sourceType: fd.get("sourceType"),
            authority: fd.get("authority"),
            sourceTitle: fd.get("sourceTitle"),
            sourceUrl: fd.get("sourceUrl"),
            sourceDate: fd.get("sourceDate"),
            notes: fd.get("notes"),
          });
        }}
      >
        <h2 className="text-sm font-semibold">Add authority source</h2>
        <Select name="sourceType" options={["NOIDA_AUTHORITY", "UP_ETENDER", "RTI_RESPONSE", "GOVERNMENT_NOTICE", "OFFICIAL_DOCUMENT"]} />
        <Field name="authority" label="Authority" />
        <Field name="sourceTitle" label="Source title" required />
        <Field name="sourceUrl" label="Source URL" />
        <Field name="sourceDate" label="Publication date" type="date" />
        <Field name="notes" label="Notes" />
        <Button className="h-11">Save source</Button>
      </form>

      <form
        className="space-y-2 rounded-lg border bg-white p-4"
        action={async (fd) => {
          await run(addParkingSite, {
            name: fd.get("name"),
            sector: fd.get("sector"),
            address: fd.get("address"),
            landmark: fd.get("landmark"),
            latitude: fd.get("latitude") || null,
            longitude: fd.get("longitude") || null,
            officialStatus: fd.get("officialStatus"),
            sourceId: fd.get("sourceId") || undefined,
            sourceUrl: fd.get("sourceUrl"),
            notes: fd.get("notes"),
          });
        }}
      >
        <h2 className="text-sm font-semibold">Add parking site</h2>
        <Field name="name" label="Name" required />
        <Field name="sector" label="Sector" />
        <Field name="address" label="Address" />
        <Field name="landmark" label="Landmark" />
        <Field name="latitude" label="Latitude" />
        <Field name="longitude" label="Longitude" />
        <Select name="officialStatus" options={["AUTHORISED", "UNVERIFIED", "EXPIRED", "DISPUTED"]} />
        <SourceSelect sources={sources} />
        <Field name="sourceUrl" label="Source URL" />
        <Field name="notes" label="Notes" />
        <Button className="h-11">Save site</Button>
      </form>

      <form
        className="space-y-2 rounded-lg border bg-white p-4"
        action={async (fd) => {
          await run(addContractor, {
            legalName: fd.get("legalName"),
            displayName: fd.get("displayName"),
            verificationStatus: fd.get("verificationStatus"),
            sourceId: fd.get("sourceId") || undefined,
            notes: fd.get("notes"),
          });
        }}
      >
        <h2 className="text-sm font-semibold">Add contractor</h2>
        <Field name="legalName" label="Legal name" required />
        <Field name="displayName" label="Display name" />
        <Select name="verificationStatus" options={["VERIFIED", "UNVERIFIED", "EXPIRED", "DISPUTED"]} />
        <SourceSelect sources={sources} />
        <Button className="h-11">Save contractor</Button>
      </form>

      <form
        className="space-y-2 rounded-lg border bg-white p-4"
        action={async (fd) => {
          await run(addContract, {
            contractorId: fd.get("contractorId"),
            parkingSiteId: fd.get("parkingSiteId") || undefined,
            contractNumber: fd.get("contractNumber"),
            approvedRate: fd.get("approvedRate") || null,
            status: fd.get("status"),
            startDate: fd.get("startDate") || undefined,
            endDate: fd.get("endDate") || undefined,
            sourceId: fd.get("sourceId") || undefined,
          });
        }}
      >
        <h2 className="text-sm font-semibold">Add contract</h2>
        <label className="block text-sm">
          Contractor
          <select name="contractorId" className="mt-1 h-11 w-full rounded-md border px-2" required>
            {contractors.map((c) => (
              <option key={c.id} value={c.id}>{c.legal_name}</option>
            ))}
          </select>
        </label>
        <label className="block text-sm">
          Site
          <select name="parkingSiteId" className="mt-1 h-11 w-full rounded-md border px-2">
            <option value="">None</option>
            {sites.map((s) => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
        </label>
        <Field name="contractNumber" label="Contract number" />
        <Field name="approvedRate" label="Approved rate" />
        <Select name="status" options={["ACTIVE", "EXPIRED", "PENDING", "DISPUTED"]} />
        <Field name="startDate" label="Start" type="date" />
        <Field name="endDate" label="End" type="date" />
        <SourceSelect sources={sources} />
        <Button className="h-11">Save contract</Button>
      </form>

      <form
        className="space-y-2 rounded-lg border bg-white p-4"
        action={async (fd) => {
          await run(addParkingRate, {
            parkingSiteId: fd.get("parkingSiteId"),
            rateAmount: fd.get("rateAmount"),
            sourceId: fd.get("sourceId") || undefined,
          });
        }}
      >
        <h2 className="text-sm font-semibold">Add approved rate</h2>
        <label className="block text-sm">
          Site
          <select name="parkingSiteId" className="mt-1 h-11 w-full rounded-md border px-2" required>
            {sites.map((s) => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
        </label>
        <Field name="rateAmount" label="Rate amount" required />
        <SourceSelect sources={sources} />
        <Button className="h-11">Save rate</Button>
      </form>

      <form
        className="space-y-2 rounded-lg border bg-white p-4"
        action={async (fd) => {
          const id = String(fd.get("siteId") ?? "");
          const result = await markSiteExpired(id);
          setMessage(result.error ?? "Marked expired.");
        }}
      >
        <h2 className="text-sm font-semibold">Mark site expired</h2>
        <select name="siteId" className="h-11 w-full rounded-md border px-2">
          {sites.map((s) => (
            <option key={s.id} value={s.id}>{s.name} ({s.official_status})</option>
          ))}
        </select>
        <Button variant="outline" className="h-11">Mark expired</Button>
      </form>
    </div>
  );
}

function Field({
  name,
  label,
  required,
  type = "text",
}: {
  name: string;
  label: string;
  required?: boolean;
  type?: string;
}) {
  return (
    <div className="space-y-1">
      <Label htmlFor={name}>{label}</Label>
      <Input id={name} name={name} required={required} type={type} className="h-11" />
    </div>
  );
}

function Select({ name, options }: { name: string; options: string[] }) {
  return (
    <select name={name} className="h-11 w-full rounded-md border px-2 text-sm">
      {options.map((o) => (
        <option key={o} value={o}>{o}</option>
      ))}
    </select>
  );
}

function SourceSelect({ sources }: { sources: Source[] }) {
  return (
    <label className="block text-sm">
      Source
      <select name="sourceId" className="mt-1 h-11 w-full rounded-md border px-2">
        <option value="">None</option>
        {sources.map((s) => (
          <option key={s.id} value={s.id}>{s.source_title}</option>
        ))}
      </select>
    </label>
  );
}

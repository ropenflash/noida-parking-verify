"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createAuthorityDocument } from "@/lib/actions/authority";
import { AUTHORITY_SOURCE_TYPES } from "@/lib/authority/types";
import { SOURCE_TYPE_LABELS } from "@/lib/constants";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export function AuthorityIngestForm() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  return (
    <form
      className="space-y-3 rounded-lg border bg-white p-4"
      action={async (formData) => {
        setBusy(true);
        setError(null);
        const result = await createAuthorityDocument(formData);
        setBusy(false);
        if (result.error || !result.id) {
          setError(result.error ?? "Could not save.");
          return;
        }
        router.push(`/admin/authority/${result.id}`);
      }}
    >
      <h2 className="text-sm font-semibold">Ingest official source</h2>
      <p className="text-xs text-zinc-600">
        PDF, XLS/XLSX, or an official URL. Newspaper articles, Google Maps listings, Reddit posts,
        and user reports are not authority sources. Extracted rows stay proposed until you approve them.
      </p>
      <div className="space-y-1">
        <Label htmlFor="sourceType">Source type</Label>
        <select id="sourceType" name="sourceType" required className="h-12 w-full rounded-md border px-2">
          {AUTHORITY_SOURCE_TYPES.map((t) => (
            <option key={t} value={t}>
              {SOURCE_TYPE_LABELS[t] ?? t}
            </option>
          ))}
        </select>
      </div>
      <div className="space-y-1">
        <Label htmlFor="sourceTitle">Source title</Label>
        <Input id="sourceTitle" name="sourceTitle" required className="h-12" />
      </div>
      <div className="space-y-1">
        <Label htmlFor="sourceUrl">Source URL</Label>
        <Input id="sourceUrl" name="sourceUrl" type="url" className="h-12" placeholder="https://etender.up.nic.in/…" />
      </div>
      <div className="space-y-1">
        <Label htmlFor="file">PDF / XLS / XLSX</Label>
        <Input
          id="file"
          name="file"
          type="file"
          accept=".pdf,.xls,.xlsx,.csv,application/pdf,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
          className="h-12"
        />
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="space-y-1">
          <Label htmlFor="publicationDate">Publication date</Label>
          <Input id="publicationDate" name="publicationDate" type="date" className="h-12" />
        </div>
        <div className="space-y-1">
          <Label htmlFor="effectiveFrom">Effective from</Label>
          <Input id="effectiveFrom" name="effectiveFrom" type="date" className="h-12" />
        </div>
        <div className="space-y-1">
          <Label htmlFor="effectiveUntil">Effective until</Label>
          <Input id="effectiveUntil" name="effectiveUntil" type="date" className="h-12" />
        </div>
      </div>
      <div className="space-y-1">
        <Label htmlFor="notes">Notes</Label>
        <Textarea id="notes" name="notes" />
      </div>
      {error ? <p className="text-sm text-red-700">{error}</p> : null}
      <Button className="h-12 w-full" disabled={busy}>
        {busy ? "Saving…" : "Save document"}
      </Button>
    </form>
  );
}

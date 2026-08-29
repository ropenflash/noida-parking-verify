import type { AuthorityProvenance } from "@/lib/authority/types";
import { SOURCE_TYPE_LABELS } from "@/lib/constants";

export function SourceSection({
  provenance,
  documentUrl,
}: {
  provenance: Partial<AuthorityProvenance> | null | undefined;
  documentUrl?: string | null;
}) {
  if (!provenance) return null;
  return (
    <section className="rounded-md border border-zinc-200 bg-zinc-50 p-3 text-sm">
      <h3 className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Source</h3>
      <p className="mt-1 font-medium">{provenance.sourceTitle ?? "Sourced authority record"}</p>
      <p className="text-zinc-600">
        {SOURCE_TYPE_LABELS[provenance.sourceType ?? ""] ?? provenance.sourceType ?? "Official document"}
      </p>
      {provenance.sourceUrl ? (
        <p className="mt-1 break-all">
          <a href={provenance.sourceUrl} className="underline" target="_blank" rel="noreferrer">
            {provenance.sourceUrl}
          </a>
        </p>
      ) : null}
      {documentUrl ? (
        <p className="mt-1">
          <a href={documentUrl} className="underline" target="_blank" rel="noreferrer">
            View source document
          </a>
        </p>
      ) : null}
      <p className="mt-2 text-xs text-zinc-600">
        Published {provenance.publicationDate ?? "—"} · Effective {provenance.effectiveFrom ?? "—"} to{" "}
        {provenance.effectiveUntil ?? "—"}
      </p>
      <p className="text-xs text-zinc-600">
        Verification {provenance.verificationStatus ?? "UNVERIFIED"}
        {provenance.verifiedAt ? ` · ${new Date(provenance.verifiedAt).toLocaleDateString("en-IN")}` : ""}
      </p>
      {provenance.confidenceScore != null ? (
        <p className="text-xs text-zinc-600">Confidence {provenance.confidenceScore}/100</p>
      ) : null}
    </section>
  );
}

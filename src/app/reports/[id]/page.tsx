import { notFound, redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth/session";
import { getReport } from "@/lib/actions/reports";
import { StatusBadge, SectionCard } from "@/components/status-badge";
import { LegalDisclaimer } from "@/components/legal-disclaimer";
import { SourceSection } from "@/components/authority/source-section";
import { CLASSIFICATION_HELP, EVIDENCE_CATEGORY_LABELS } from "@/lib/constants";
import { formatDateTime, formatInr, formatMeters } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";

export default async function ReportDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { userId } = await getSessionUser();
  if (!userId) redirect("/login");
  const { id } = await params;
  const { report, error } = await getReport(id);
  if (error || !report) notFound();

  const loc = first(report.report_locations);
  const op = first(report.report_operators);
  const pay = first(report.report_payments);
  const rec = first(report.report_receipts);
  const result = first(report.verification_results);
  const events = Array.isArray(report.verification_events)
    ? [...report.verification_events].sort(
        (a: { created_at: string }, b: { created_at: string }) =>
          a.created_at.localeCompare(b.created_at),
      )
    : [];
  const evidence = Array.isArray(report.report_evidence)
    ? report.report_evidence
    : [];
  const site = Array.isArray(report.parking_sites)
    ? report.parking_sites[0]
    : report.parking_sites;
  const sections = (result?.section_statuses ?? {}) as Record<string, string>;
  const explanation = (result?.explanation ?? []) as {
    title: string;
    detail: string;
    tone: string;
  }[];

  const supabase = await createClient();
  const signed = await Promise.all(
    evidence.map(async (item: { storage_path: string; id: string; category: string }) => {
      const { data } = await supabase.storage
        .from("evidence")
        .createSignedUrl(item.storage_path, 3600);
      return { ...item, url: data?.signedUrl };
    }),
  );

  return (
    <div className="space-y-5">
      <div className="rounded-lg border bg-white p-5">
        <p className="text-xs uppercase tracking-wide text-zinc-500">
          Parking verification result
        </p>
        <div className="mt-3">
          <StatusBadge classification={result?.classification ?? report.classification} large />
        </div>
        <p className="mt-3 text-3xl font-semibold tabular-nums">
          {result?.evidence_score ?? "—"}
          <span className="text-lg font-normal text-zinc-500">/100</span>
        </p>
        <p className="text-sm text-zinc-600">Evidence score — not a legal determination.</p>
        <p className="mt-2 text-sm text-zinc-700">
          {CLASSIFICATION_HELP[result?.classification ?? ""] ?? ""}
        </p>
        {site ? (
          <p className="mt-3 text-sm">
            Known parking site{site.is_demo ? " (DEMO DATA)" : ""} approximately{" "}
            {formatMeters(result?.distance_meters)} away. Nearby is not proof that this exact pin is authorised.
          </p>
        ) : null}
      </div>

      <LegalDisclaimer />

      <div className="space-y-3">
        {explanation.map((item) => (
          <div key={item.title} className="rounded-md border bg-white p-3 text-sm">
            <p className="font-medium">{item.title}</p>
            <p className="text-zinc-600">{item.detail}</p>
          </div>
        ))}
      </div>

      <SectionCard title="📍 Location" status={sections.location}>
        <p>{report.location_name}</p>
        <p>{loc?.sector ? `Sector ${loc.sector}` : "Sector not recorded"}</p>
        <p>
          {loc?.latitude && loc?.longitude
            ? `${loc.latitude}, ${loc.longitude}`
            : "Coordinates not recorded"}
        </p>
        <p>{loc?.description}</p>
      </SectionCard>

      <SectionCard title="👤 Operator" status={sections.operator}>
        <p>Operator: {op?.operator_name || "—"}</p>
        <p>Attendant: {op?.attendant_name || "—"}</p>
        <p>Attendant ID: {op?.attendant_id || "—"}</p>
        <p>Contract no.: {op?.contract_number || "—"}</p>
      </SectionCard>

      <SectionCard title="💳 Payment" status={sections.payment}>
        <p>Amount: {formatInr(pay?.amount)}</p>
        <p>Mode: {pay?.payment_mode || "—"}</p>
        <p>UPI recipient: {pay?.upi_recipient_name || "—"}</p>
        <p>UPI ID: {pay?.upi_id || "—"}</p>
        {pay?.upi_recipient_kind === "INDIVIDUAL" ? (
          <p className="mt-2">
            Operator/payment recipient could not be matched to an authorised contractor. A personal UPI recipient does not by itself prove that the parking collection is unauthorised.
          </p>
        ) : null}
      </SectionCard>

      <SectionCard title="🧾 Receipt" status={sections.receipt}>
        <p>Parking: {rec?.parking_number || "—"}</p>
        <p>Spot: {rec?.spot_number || "—"}</p>
        <p>Device: {rec?.device_number || "—"}</p>
        <p>Amount: {formatInr(rec?.amount)}</p>
        <p>Issuer: {rec?.issuer_name || "—"}</p>
      </SectionCard>

      <SectionCard title="📄 Authority records" status={sections.authority}>
        {site ? (
          <>
            <p>{site.name}</p>
            <p>Status: {site.official_status}</p>
            {site.is_demo ? <p className="font-medium">DEMO DATA — not a live official extract.</p> : null}
            <div className="mt-3">
              <SourceSection
                provenance={{
                  sourceType: site.source_type,
                  sourceTitle: site.source_title,
                  sourceUrl: site.source_url,
                  sourceDocumentId: site.source_document_id,
                  publicationDate: site.publication_date,
                  effectiveFrom: site.effective_from,
                  effectiveUntil: site.effective_until,
                  extractedAt: site.extracted_at,
                  verifiedBy: site.verified_by,
                  verifiedAt: site.verified_at,
                  verificationStatus: site.verification_status,
                  confidenceScore: site.confidence_score,
                }}
              />
            </div>
          </>
        ) : (
          <p>No sourced authority site matched this point.</p>
        )}
      </SectionCard>

      <SectionCard title="💰 Rate comparison" status={sections.rate}>
        <p>Charged: {formatInr(pay?.amount ?? rec?.amount)}</p>
        {result?.is_overcharging ? (
          <p>Evidence conflicts with the sourced approved rate at a closely matched site.</p>
        ) : (
          <p>Rate comparison depends on an exact location match and a sourced approved rate.</p>
        )}
      </SectionCard>

      <SectionCard title="📸 Evidence" status={sections.evidence}>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {signed.map((item) =>
            item.url ? (
              isPdfPath(item.storage_path) ? (
                <a
                  key={item.id}
                  href={item.url}
                  target="_blank"
                  rel="noreferrer"
                  className="flex h-32 flex-col items-center justify-center rounded-md border bg-zinc-50 p-3 text-center text-sm text-zinc-800"
                >
                  <span className="font-medium">
                    {EVIDENCE_CATEGORY_LABELS[item.category] ?? item.category}
                  </span>
                  <span className="mt-1 text-xs text-zinc-600">Open PDF</span>
                </a>
              ) : (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  key={item.id}
                  src={item.url}
                  alt={item.category}
                  className="h-32 w-full rounded-md object-cover"
                />
              )
            ) : (
              <p key={item.id} className="text-xs">
                {item.category}
              </p>
            ),
          )}
          {signed.length === 0 ? <p>No files attached.</p> : null}
        </div>
      </SectionCard>

      <section className="rounded-lg border bg-white p-4">
        <h2 className="mb-3 text-sm font-semibold">Evidence timeline</h2>
        <ol className="space-y-2 text-sm">
          {events.map((event: { id: string; created_at: string; event_type: string }) => (
            <li key={event.id}>
              <span className="tabular-nums text-zinc-500">{formatDateTime(event.created_at)}</span>
              <span className="ml-2">{event.event_type.replaceAll("_", " ")}</span>
            </li>
          ))}
        </ol>
      </section>
    </div>
  );
}

function first<T>(value: T | T[] | null | undefined): T | undefined {
  if (Array.isArray(value)) return value[0];
  return value ?? undefined;
}

function isPdfPath(path: string) {
  return path.toLowerCase().split("?")[0]?.endsWith(".pdf") ?? false;
}

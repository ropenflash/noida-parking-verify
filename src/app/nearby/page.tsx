import { createClient } from "@/lib/supabase/server";
import { SourceSection } from "@/components/authority/source-section";
import { StatusBadge } from "@/components/status-badge";
import { formatMeters } from "@/lib/format";
import { LegalDisclaimer } from "@/components/legal-disclaimer";

export default async function NearbyPage() {
  const supabase = await createClient();
  const { data: sites } = await supabase
    .from("parking_sites")
    .select("id, name, sector, landmark, official_status, is_demo, latitude, longitude, source_title, source_type, source_url, publication_date, verified_at, verification_status")
    .order("sector");
  const { data: publicReports } = await supabase
    .from("parking_reports")
    .select("id, sector, classification, created_at, location_name")
    .eq("visibility", "ANONYMISED_PUBLIC")
    .eq("status", "SUBMITTED")
    .limit(30);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-semibold">Nearby parking</h1>
        <p className="text-sm text-zinc-600">
          Known sourced sites and anonymised public reports. A nearby official site is not proof that your exact pin is authorised.
        </p>
      </div>
      <LegalDisclaimer compact />
      <NearbyClient />
      <section className="space-y-2">
        <h2 className="text-sm font-semibold">Known parking sites</h2>
        {(sites ?? []).map((site) => (
          <article key={site.id} className="rounded-lg border bg-white p-4 text-sm">
            <p className="font-medium">{site.name}</p>
            <p className="text-zinc-600">
              {site.sector ? `Sector ${site.sector}` : ""} {site.landmark ? `· ${site.landmark}` : ""}
            </p>
            <p className="mt-1 text-xs uppercase">{site.official_status}</p>
            {site.is_demo ? <p className="mt-1 text-xs font-medium">DEMO DATA</p> : null}
            {site.latitude && site.longitude ? (
              <p className="mt-1 text-xs text-zinc-500">
                {site.latitude}, {site.longitude}
              </p>
            ) : null}
            <div className="mt-3">
              <SourceSection
                provenance={{
                  sourceType: site.source_type,
                  sourceTitle: site.source_title,
                  sourceUrl: site.source_url,
                  publicationDate: site.publication_date,
                  verifiedAt: site.verified_at,
                  verificationStatus: site.verification_status,
                }}
              />
            </div>
          </article>
        ))}
      </section>
      <section className="space-y-2">
        <h2 className="text-sm font-semibold">Anonymised public reports</h2>
        {(publicReports ?? []).length === 0 ? (
          <p className="text-sm text-zinc-600">No public reports yet.</p>
        ) : (
          (publicReports ?? []).map((r) => (
            <article key={r.id} className="rounded-lg border bg-white p-4 text-sm">
              <div className="flex justify-between gap-3">
                <p>{r.sector ? `Sector ${r.sector}` : "Approximate location"}</p>
                <StatusBadge classification={r.classification} />
              </div>
            </article>
          ))
        )}
      </section>
    </div>
  );
}

function NearbyClient() {
  return (
    <p className="text-xs text-zinc-500">
      Distance helpers such as “approximately {formatMeters(40)} away” appear on a report after you capture coordinates. This list does not use your live location unless you grant it during Verify Parking.
    </p>
  );
}

import { createClient } from "@/lib/supabase/server";
import { DEFAULT_VERIFICATION_CONFIG } from "@/lib/verification/engine";
import { classifyDistance, isActiveOn, toDateOnly } from "@/lib/authority/temporal";
import type {
  AuthoritativeParkingStatus,
  AuthoritativeSiteResult,
  AuthorityMatchKind,
  AuthorityProvenance,
} from "@/lib/authority/types";

function provenanceFrom(row: {
  source_type?: string | null;
  source_title?: string | null;
  source_url?: string | null;
  source_document_id?: string | null;
  publication_date?: string | null;
  effective_from?: string | null;
  effective_until?: string | null;
  extracted_at?: string | null;
  verified_by?: string | null;
  verified_at?: string | null;
  verification_status?: string | null;
  confidence_score?: number | null;
}): AuthorityProvenance {
  return {
    sourceType: row.source_type ?? "OFFICIAL_DOCUMENT",
    sourceTitle: row.source_title ?? "Sourced authority record",
    sourceUrl: row.source_url ?? null,
    sourceDocumentId: row.source_document_id ?? null,
    publicationDate: row.publication_date ?? null,
    effectiveFrom: row.effective_from ?? null,
    effectiveUntil: row.effective_until ?? null,
    extractedAt: row.extracted_at ?? null,
    verifiedBy: row.verified_by ?? null,
    verifiedAt: row.verified_at ?? null,
    verificationStatus: row.verification_status ?? "UNVERIFIED",
    confidenceScore: row.confidence_score != null ? Number(row.confidence_score) : null,
  };
}

function explainMatch(
  kind: AuthorityMatchKind,
  sites: AuthoritativeSiteResult[],
  date: string,
  exactMeters: number,
  nearbyMeters: number,
): string[] {
  const lines: string[] = [];
  if (kind === "NO_MATCH") {
    lines.push(
      "No sourced authority parking site was found within the configured nearby distance. Absence of a record is not proof that collection is unauthorised.",
    );
    return lines;
  }
  const closest = sites[0];
  if (kind === "NEARBY_MATCH") {
    lines.push(
      `A sourced site (${closest.name}) is approximately ${Math.round(closest.distanceMeters)}m away. A nearby authorised site does not mean this exact location is authorised (exact ≤ ${exactMeters}m, nearby ≤ ${nearbyMeters}m).`,
    );
  } else {
    lines.push(
      `Evidence suggests a close match to sourced site ${closest.name} (approximately ${Math.round(closest.distanceMeters)}m). This is not a determination that the collection is legal or illegal.`,
    );
  }
  const withActive = sites.filter((s) => s.activeContracts.length > 0);
  if (withActive.length === 0) {
    lines.push(
      `No contract was active on ${date} for the matched site(s). A contract that has ended is kept as history and is not treated as current authorisation.`,
    );
  } else {
    const c = withActive[0].activeContracts[0];
    lines.push(
      `An active contract on ${date} is on file (${c.contractNumber ?? "unnumbered"}) with contractor ${c.contractor?.legalName ?? "not named"}.`,
    );
  }
  const demo = sites.find((s) => s.isDemo);
  if (demo) {
    lines.push("At least one matched site is DEMO DATA and must not be treated as a live official extract.");
  }
  lines.push("User-submitted reports, maps listings, and news articles are not used as authority sources.");
  return lines;
}

/**
 * Trusted authority lookup. Nearby authorised parking is never treated as
 * proof that the requested coordinate is authorised.
 */
export async function getAuthoritativeParkingStatus(
  latitude: number,
  longitude: number,
  date: Date | string,
  options?: { exactMeters?: number; nearbyMeters?: number },
): Promise<AuthoritativeParkingStatus> {
  const requestedDate = toDateOnly(date);
  const supabase = await createClient();
  const { data: configRows } = await supabase
    .from("verification_config")
    .select("key, value_numeric");
  const exactMeters =
    options?.exactMeters ??
    Number(
      configRows?.find((r) => r.key === "threshold.exactMatchMeters")?.value_numeric ??
        DEFAULT_VERIFICATION_CONFIG.thresholds.exactMatchMeters,
    );
  const nearbyMeters =
    options?.nearbyMeters ??
    Number(
      configRows?.find((r) => r.key === "threshold.nearbyMatchMeters")?.value_numeric ??
        DEFAULT_VERIFICATION_CONFIG.thresholds.nearbyMatchMeters,
    );

  const { data: nearby, error } = await supabase.rpc("find_nearby_parking_sites", {
    lat: latitude,
    long: longitude,
    radius_m: Math.max(nearbyMeters, 2000),
  });
  if (error) throw error;

  const nearbyRows = (nearby ?? []) as { id: string; dist_meters: number }[];
  const ids = nearbyRows.map((r) => r.id);
  if (ids.length === 0) {
    return {
      requestedDate,
      latitude,
      longitude,
      exactMatchMeters: exactMeters,
      nearbyMatchMeters: nearbyMeters,
      matchKind: "NO_MATCH",
      matchingSites: [],
      confidence: null,
      explanation: explainMatch("NO_MATCH", [], requestedDate, exactMeters, nearbyMeters),
    };
  }

  const [{ data: sites }, { data: links }, { data: rates }] = await Promise.all([
    supabase
      .from("parking_sites")
      .select(
        "id, name, sector, address, landmark, latitude, longitude, parking_type, cluster, work_circle, tender_number, contract_number, official_status, is_demo, source_type, source_title, source_url, source_document_id, publication_date, effective_from, effective_until, extracted_at, verified_by, verified_at, verification_status, confidence_score",
      )
      .in("id", ids),
    supabase
      .from("parking_contract_sites")
      .select(
        "parking_site_id, contract_id, source_type, source_title, source_url, source_document_id, publication_date, effective_from, effective_until, extracted_at, verified_by, verified_at, verification_status, confidence_score, parking_contracts (id, contract_number, tender_number, status, start_date, end_date, approved_rate, effective_from, effective_until, source_type, source_title, source_url, source_document_id, publication_date, extracted_at, verified_by, verified_at, verification_status, confidence_score, parking_contractors (id, legal_name, display_name, verification_status))",
      )
      .in("parking_site_id", ids),
    supabase
      .from("parking_rates")
      .select("contract_id, parking_site_id, rate_amount, unit, vehicle_type, effective_from, effective_to")
      .in("parking_site_id", ids),
  ]);

  const distById = new Map(nearbyRows.map((r) => [r.id, Number(r.dist_meters)]));
  const results: AuthoritativeSiteResult[] = (sites ?? []).map((site) => {
    const distanceMeters = distById.get(site.id) ?? Number.POSITIVE_INFINITY;
    const matchKind = classifyDistance(distanceMeters, exactMeters, nearbyMeters);
    const siteLinks = (links ?? []).filter((l: { parking_site_id: string }) => l.parking_site_id === site.id);
    const activeContracts = siteLinks
      .map((link: Record<string, unknown>) => {
        const contractRel = Array.isArray(link.parking_contracts)
          ? link.parking_contracts[0]
          : link.parking_contracts;
        const contract = contractRel as {
          id: string;
          contract_number: string | null;
          tender_number: string | null;
          status: string;
          start_date: string | null;
          end_date: string | null;
          approved_rate: number | null;
          effective_from: string | null;
          effective_until: string | null;
          source_type: string | null;
          source_title: string | null;
          source_url: string | null;
          source_document_id: string | null;
          publication_date: string | null;
          extracted_at: string | null;
          verified_by: string | null;
          verified_at: string | null;
          verification_status: string | null;
          confidence_score: number | null;
          parking_contractors:
            | {
                id: string;
                legal_name: string;
                display_name: string | null;
                verification_status: string;
              }
            | {
                id: string;
                legal_name: string;
                display_name: string | null;
                verification_status: string;
              }[]
            | null;
        } | null;
        if (!contract) return null;
        const start = contract.effective_from ?? contract.start_date;
        const end = contract.effective_until ?? contract.end_date;
        if (!isActiveOn(start, end, requestedDate)) return null;
        const contractorRel = Array.isArray(contract.parking_contractors)
          ? contract.parking_contractors[0]
          : contract.parking_contractors;
        const siteRates = (rates ?? []).filter(
          (r: { contract_id: string | null; parking_site_id: string | null }) =>
            r.contract_id === contract.id || r.parking_site_id === site.id,
        );
        const activeRates = siteRates.filter((r: { effective_from: string | null; effective_to: string | null }) =>
          isActiveOn(r.effective_from ?? start, r.effective_to ?? end, requestedDate),
        );
        return {
          id: contract.id,
          contractNumber: contract.contract_number,
          tenderNumber: contract.tender_number,
          status: contract.status,
          startDate: start,
          endDate: end,
          approvedRate: contract.approved_rate != null ? Number(contract.approved_rate) : null,
          contractor: contractorRel
            ? {
                id: contractorRel.id,
                legalName: contractorRel.legal_name,
                displayName: contractorRel.display_name,
                verificationStatus: contractorRel.verification_status,
              }
            : null,
          rates: activeRates.map((r: { rate_amount: number; unit: string; vehicle_type: string | null; effective_from: string | null; effective_to: string | null }) => ({
            amount: Number(r.rate_amount),
            unit: r.unit,
            vehicleType: r.vehicle_type,
            effectiveFrom: r.effective_from,
            effectiveTo: r.effective_to,
          })),
          provenance: provenanceFrom({ ...contract, ...link }),
        };
      })
      .filter(Boolean) as AuthoritativeSiteResult["activeContracts"];

    return {
      id: site.id,
      name: site.name,
      sector: site.sector,
      address: site.address,
      landmark: site.landmark,
      latitude: site.latitude,
      longitude: site.longitude,
      parkingType: site.parking_type,
      cluster: site.cluster,
      workCircle: site.work_circle,
      tenderNumber: site.tender_number,
      contractNumber: site.contract_number,
      distanceMeters,
      matchKind,
      isDemo: site.is_demo,
      officialStatus: site.official_status,
      activeContracts,
      provenance: provenanceFrom(site),
    };
  });

  const inRange = results
    .filter((s) => s.matchKind !== "NO_MATCH")
    .sort((a, b) => a.distanceMeters - b.distanceMeters);
  const matchKind: AuthorityMatchKind = inRange[0]?.matchKind ?? "NO_MATCH";
  const confidence =
    inRange[0]?.provenance.confidenceScore ??
    (matchKind === "EXACT_MATCH" ? 80 : matchKind === "NEARBY_MATCH" ? 45 : null);

  return {
    requestedDate,
    latitude,
    longitude,
    exactMatchMeters: exactMeters,
    nearbyMatchMeters: nearbyMeters,
    matchKind,
    matchingSites: inRange,
    confidence,
    explanation: explainMatch(matchKind, inRange, requestedDate, exactMeters, nearbyMeters),
  };
}

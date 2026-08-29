import type { MatchedSite } from "@/lib/types";
import { createClient } from "@/lib/supabase/server";
import { isActiveOn, toDateOnly } from "@/lib/authority/temporal";
import { haversineMeters } from "@/lib/verification/engine";

type NearbyRow = {
  id: string;
  name: string;
  sector: string | null;
  address: string | null;
  landmark: string | null;
  latitude: number | null;
  longitude: number | null;
  parking_type: string | null;
  official_status: string | null;
  is_demo: boolean;
  dist_meters: number;
};

export async function findNearbyParkingSites(
  lat: number,
  lng: number,
  radiusM = 2000,
  asOf: Date | string = new Date(),
): Promise<MatchedSite[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("find_nearby_parking_sites", {
    lat,
    long: lng,
    radius_m: radiusM,
  });
  if (error) throw error;
  const rows = (data ?? []) as NearbyRow[];
  if (rows.length === 0) return [];

  const ids = rows.map((r) => r.id);
  const [{ data: contracts }, { data: rates }] = await Promise.all([
    supabase
      .from("parking_contracts")
      .select(
        "id, contractor_id, parking_site_id, contract_number, status, start_date, end_date, approved_rate, parking_contractors (id, legal_name, display_name, verification_status)",
      )
      .in("parking_site_id", ids),
    supabase
      .from("parking_rates")
      .select("parking_site_id, rate_amount, unit, effective_to")
      .in("parking_site_id", ids),
  ]);

  return rows.map((row) => {
    const siteContracts = (contracts ?? []).filter(
      (c: { parking_site_id: string }) => c.parking_site_id === row.id,
    );
    const onDate = toDateOnly(asOf);
    const dated = siteContracts.find((c: { start_date: string | null; end_date: string | null }) =>
      isActiveOn(c.start_date, c.end_date, onDate),
    );
    const active = dated ?? siteContracts[0];
    const contractorRel = (Array.isArray(active?.parking_contractors)
      ? active?.parking_contractors[0]
      : active?.parking_contractors) as
      | {
          id: string;
          legal_name: string;
          display_name: string | null;
          verification_status: NonNullable<MatchedSite["contractor"]>["verificationStatus"];
        }
      | null
      | undefined;
    const siteRates = (rates ?? []).filter(
      (r: { parking_site_id: string }) => r.parking_site_id === row.id,
    );
    const rate = siteRates[0];
    return {
      id: row.id,
      name: row.name,
      sector: row.sector,
      address: row.address,
      latitude: row.latitude,
      longitude: row.longitude,
      officialStatus: row.official_status,
      isDemo: row.is_demo,
      distanceMeters: Number(row.dist_meters),
      approvedRate: active?.approved_rate != null ? Number(active.approved_rate) : rate ? Number(rate.rate_amount) : null,
      rateUnit: rate?.unit ?? "per visit",
      contract: active
        ? {
            id: active.id,
            contractNumber: active.contract_number,
            status: dated ? "ACTIVE" : "EXPIRED",
            startDate: active.start_date,
            endDate: active.end_date,
            approvedRate:
              active.approved_rate != null ? Number(active.approved_rate) : null,
          }
        : null,
      contractor: contractorRel
        ? {
            id: contractorRel.id,
            legalName: contractorRel.legal_name,
            displayName: contractorRel.display_name,
            verificationStatus: contractorRel.verification_status,
          }
        : null,
    } satisfies MatchedSite;
  });
}

export async function matchParkingSite(lat: number, lng: number) {
  const sites = await findNearbyParkingSites(lat, lng, 2000);
  return sites[0] ?? null;
}

export function fallbackDistance(
  lat: number,
  lng: number,
  siteLat: number,
  siteLng: number,
) {
  return haversineMeters(lat, lng, siteLat, siteLng);
}

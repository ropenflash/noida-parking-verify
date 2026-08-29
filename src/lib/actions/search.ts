"use server";

import { createClient } from "@/lib/supabase/server";
import { searchSchema } from "@/lib/validation/report";

export async function searchParking(rawQuery: string) {
  const parsed = searchSchema.safeParse({ q: rawQuery });
  if (!parsed.success) {
    return { error: "Enter a search term.", results: emptyResults() };
  }
  const q = parsed.data.q.replace(/[%(),]/g, " ").trim();
  if (!q) {
    return { error: "Enter a search term.", results: emptyResults() };
  }
  const like = `%${q}%`;
  const supabase = await createClient();

  const [sites, contractors, sources, reports] = await Promise.all([
    supabase
      .from("parking_sites")
      .select("id, name, sector, address, landmark, official_status, is_demo")
      .or(`name.ilike.${like},sector.ilike.${like},address.ilike.${like},landmark.ilike.${like}`)
      .limit(15),
    supabase
      .from("parking_contractors")
      .select("id, legal_name, display_name, verification_status, is_demo")
      .or(`legal_name.ilike.${like},display_name.ilike.${like}`)
      .limit(10),
    supabase
      .from("authority_sources")
      .select("id, source_title, source_type, authority, source_url, is_demo")
      .or(`source_title.ilike.${like},authority.ilike.${like}`)
      .limit(10),
    supabase
      .from("parking_reports")
      .select("id, location_name, sector, classification, created_at")
      .or(`location_name.ilike.${like},sector.ilike.${like}`)
      .limit(15),
  ]);

  return {
    error: null,
    results: {
      sites: sites.data ?? [],
      contractors: contractors.data ?? [],
      sources: sources.data ?? [],
      reports: reports.data ?? [],
    },
  };
}

export async function searchAuthorityRecords(rawQuery: string) {
  return searchParking(rawQuery);
}

function emptyResults() {
  return { sites: [], contractors: [], sources: [], reports: [] };
}

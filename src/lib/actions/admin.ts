"use server";

import { revalidatePath } from "next/cache";
import { isAdmin, isStaff } from "@/lib/auth/roles";
import { requireUser } from "@/lib/auth/session";
import {
  adminContractSchema,
  adminContractorSchema,
  adminOverrideSchema,
  adminRateSchema,
  adminSiteSchema,
  adminSourceSchema,
} from "@/lib/validation/report";
import { createVerificationEvent } from "@/lib/actions/reports";

async function requireStaff() {
  const session = await requireUser();
  if (session.error || !session.userId) return { ...session, forbidden: "Sign in required." };
  if (!isStaff(session.profile?.role)) {
    return { ...session, forbidden: "Staff access required." };
  }
  return { ...session, forbidden: null };
}

export async function addAuthoritySource(input: unknown) {
  const staff = await requireStaff();
  if (staff.forbidden) return { error: staff.forbidden };
  const parsed = adminSourceSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid source." };
  const { error } = await staff.supabase.from("authority_sources").insert({
    source_type: parsed.data.sourceType,
    authority: parsed.data.authority || null,
    source_title: parsed.data.sourceTitle,
    source_url: parsed.data.sourceUrl || null,
    source_date: parsed.data.sourceDate || null,
    effective_date: parsed.data.effectiveDate || null,
    expiry_date: parsed.data.expiryDate || null,
    notes: parsed.data.notes || null,
    is_demo: false,
    created_by: staff.userId,
  });
  if (error) return { error: error.message };
  revalidatePath("/admin");
  return { error: null };
}

export async function addParkingSite(input: unknown) {
  const staff = await requireStaff();
  if (staff.forbidden) return { error: staff.forbidden };
  const parsed = adminSiteSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid site." };
  const { error } = await staff.supabase.from("parking_sites").insert({
    name: parsed.data.name,
    sector: parsed.data.sector || null,
    address: parsed.data.address || null,
    landmark: parsed.data.landmark || null,
    latitude: parsed.data.latitude ?? null,
    longitude: parsed.data.longitude ?? null,
    parking_type: parsed.data.parkingType ?? null,
    authority: parsed.data.authority || null,
    work_circle: parsed.data.workCircle || null,
    cluster: parsed.data.cluster || null,
    official_status: parsed.data.officialStatus,
    source_id: parsed.data.sourceId || null,
    source_url: parsed.data.sourceUrl || null,
    notes: parsed.data.notes || null,
    is_demo: false,
  });
  if (error) return { error: error.message };
  revalidatePath("/admin");
  return { error: null };
}

export async function addContractor(input: unknown) {
  const staff = await requireStaff();
  if (staff.forbidden) return { error: staff.forbidden };
  const parsed = adminContractorSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid contractor." };
  const { error } = await staff.supabase.from("parking_contractors").insert({
    legal_name: parsed.data.legalName,
    display_name: parsed.data.displayName || null,
    contact_phone: parsed.data.contactPhone || null,
    contact_email: parsed.data.contactEmail || null,
    verification_status: parsed.data.verificationStatus,
    source_id: parsed.data.sourceId || null,
    notes: parsed.data.notes || null,
    is_demo: false,
  });
  if (error) return { error: error.message };
  revalidatePath("/admin");
  return { error: null };
}

export async function addContract(input: unknown) {
  const staff = await requireStaff();
  if (staff.forbidden) return { error: staff.forbidden };
  const parsed = adminContractSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid contract." };
  const { error } = await staff.supabase.from("parking_contracts").insert({
    contractor_id: parsed.data.contractorId,
    parking_site_id: parsed.data.parkingSiteId || null,
    contract_number: parsed.data.contractNumber || null,
    cluster: parsed.data.cluster || null,
    work_circle: parsed.data.workCircle || null,
    start_date: parsed.data.startDate || null,
    end_date: parsed.data.endDate || null,
    approved_rate: parsed.data.approvedRate ?? null,
    status: parsed.data.status,
    source_id: parsed.data.sourceId || null,
    source_url: parsed.data.sourceUrl || null,
    notes: parsed.data.notes || null,
    is_demo: false,
  });
  if (error) return { error: error.message };
  revalidatePath("/admin");
  return { error: null };
}

export async function addParkingRate(input: unknown) {
  const staff = await requireStaff();
  if (staff.forbidden) return { error: staff.forbidden };
  const parsed = adminRateSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid rate." };
  const { error } = await staff.supabase.from("parking_rates").insert({
    parking_site_id: parsed.data.parkingSiteId,
    contract_id: parsed.data.contractId || null,
    rate_amount: parsed.data.rateAmount,
    unit: parsed.data.unit,
    vehicle_type: parsed.data.vehicleType || null,
    effective_from: parsed.data.effectiveFrom || null,
    effective_to: parsed.data.effectiveTo || null,
    source_id: parsed.data.sourceId || null,
    notes: parsed.data.notes || null,
    is_demo: false,
  });
  if (error) return { error: error.message };
  revalidatePath("/admin");
  return { error: null };
}

export async function markSiteExpired(siteId: string) {
  const staff = await requireStaff();
  if (staff.forbidden) return { error: staff.forbidden };
  const { error } = await staff.supabase
    .from("parking_sites")
    .update({ official_status: "EXPIRED" })
    .eq("id", siteId);
  if (error) return { error: error.message };
  revalidatePath("/admin");
  return { error: null };
}

export async function overrideVerification(input: unknown) {
  const staff = await requireStaff();
  if (staff.forbidden) return { error: staff.forbidden };
  const parsed = adminOverrideSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid override." };

  const { error: resultError } = await staff.supabase
    .from("verification_results")
    .update({
      classification: parsed.data.classification,
      admin_override: true,
      admin_reason: parsed.data.reason,
    })
    .eq("report_id", parsed.data.reportId);
  if (resultError) return { error: resultError.message };

  const { error: reportError } = await staff.supabase
    .from("parking_reports")
    .update({
      classification: parsed.data.classification,
      duplicate_of: parsed.data.duplicateOf || null,
    })
    .eq("id", parsed.data.reportId);
  if (reportError) return { error: reportError.message };

  await createVerificationEvent(parsed.data.reportId, "ADMIN_OVERRIDE", {
    classification: parsed.data.classification,
    reason: parsed.data.reason,
    duplicateOf: parsed.data.duplicateOf ?? null,
  });

  revalidatePath(`/admin/reports/${parsed.data.reportId}`);
  revalidatePath(`/reports/${parsed.data.reportId}`);
  return { error: null };
}

export async function listAuditLogs() {
  const staff = await requireStaff();
  if (staff.forbidden) return { error: staff.forbidden, logs: [] };
  const { data, error } = await staff.supabase
    .from("audit_logs")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(200);
  if (error) return { error: error.message, logs: [] };
  return { error: null, logs: data ?? [] };
}

export async function listAdminReports() {
  const staff = await requireStaff();
  if (staff.forbidden) return { error: staff.forbidden, reports: [] };
  const { data, error } = await staff.supabase
    .from("parking_reports")
    .select(
      "id, location_name, sector, classification, status, created_at, user_id, is_demo, duplicate_of",
    )
    .order("created_at", { ascending: false })
    .limit(100);
  if (error) return { error: error.message, reports: [] };
  return { error: null, reports: data ?? [] };
}

export async function promoteUser(userId: string, role: "USER" | "MODERATOR" | "ADMIN") {
  const session = await requireUser();
  if (session.error || !isAdmin(session.profile?.role)) {
    return { error: "Admin access required." };
  }
  const { error } = await session.supabase.from("profiles").update({ role }).eq("id", userId);
  if (error) return { error: error.message };
  return { error: null };
}

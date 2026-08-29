"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth/session";
import { getAuthoritativeParkingStatus } from "@/lib/authority/status";
import { findNearbyParkingSites } from "@/lib/parking/nearby";
import type { ContractorStatus, MatchedSite } from "@/lib/types";
import { reportPayloadSchema, type ReportPayload } from "@/lib/validation/report";
import {
  calculateVerification,
  configFromRows,
  isPersonalUpi,
} from "@/lib/verification/engine";
import type { Classification } from "@/lib/types";

function emptyToNull(value?: string | null) {
  if (value == null || value === "") return null;
  return value;
}

export async function createVerificationEvent(
  reportId: string,
  eventType: string,
  payload: Record<string, unknown> = {},
) {
  const { supabase, userId, error } = await requireUser();
  if (error || !userId) return { error: error ?? "Sign in required." };
  const { error: insertError } = await supabase.from("verification_events").insert({
    report_id: reportId,
    event_type: eventType,
    payload,
    actor_id: userId,
  });
  if (insertError) return { error: insertError.message };
  return { error: null };
}

export async function createParkingReport(input: unknown) {
  const parsed = reportPayloadSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid report.", id: null };
  }
  const payload = parsed.data;
  const { supabase, userId, error } = await requireUser();
  if (error || !userId) return { error: error ?? "Sign in required.", id: null };

  const locationName =
    payload.location.landmark ||
    payload.location.address ||
    (payload.location.sector ? `Sector ${payload.location.sector}` : "Parking point");

  const { data: report, error: reportError } = await supabase
    .from("parking_reports")
    .insert({
      user_id: userId,
      status: "DRAFT",
      visibility: payload.visibility,
      location_name: locationName,
      sector: emptyToNull(payload.location.sector),
    })
    .select("id")
    .single();

  if (reportError || !report) {
    return { error: reportError?.message ?? "Could not create report.", id: null };
  }

  const reportId = report.id as string;

  const [locRes, opRes, payRes, recRes] = await Promise.all([
    supabase.from("report_locations").insert({
      report_id: reportId,
      sector: emptyToNull(payload.location.sector),
      address: emptyToNull(payload.location.address),
      landmark: emptyToNull(payload.location.landmark),
      latitude: payload.location.latitude ?? null,
      longitude: payload.location.longitude ?? null,
      google_maps_url: emptyToNull(payload.location.googleMapsUrl),
      description: emptyToNull(payload.location.description),
      parking_type: payload.location.parkingType ?? null,
    }),
    supabase.from("report_operators").insert({
      report_id: reportId,
      operator_name: emptyToNull(payload.operator.operatorName),
      attendant_name: emptyToNull(payload.operator.attendantName),
      attendant_id: emptyToNull(payload.operator.attendantId),
      phone: emptyToNull(payload.operator.phone),
      uniform_id_visible: payload.operator.uniformIdVisible ?? null,
      contractor_on_sign: payload.operator.contractorOnSign ?? null,
      contract_number: emptyToNull(payload.operator.contractNumber),
      parking_licence_number: emptyToNull(payload.operator.parkingLicenceNumber),
      notes: emptyToNull(payload.operator.notes),
    }),
    supabase.from("report_payments").insert({
      report_id: reportId,
      amount: payload.payment.amount ?? null,
      payment_mode: payload.payment.paymentMode ?? null,
      upi_recipient_name: emptyToNull(payload.payment.upiRecipientName),
      upi_id: emptyToNull(payload.payment.upiId),
      utr: emptyToNull(payload.payment.utr),
      payment_timestamp: emptyToNull(payload.payment.paymentTimestamp),
      receipt_available: payload.payment.receiptAvailable ?? null,
      upi_recipient_kind: isPersonalUpi({
        paymentMode: payload.payment.paymentMode,
        upiRecipientName: payload.payment.upiRecipientName,
        upiId: payload.payment.upiId,
      })
        ? "INDIVIDUAL"
        : "UNKNOWN",
    }),
    supabase.from("report_receipts").insert({
      report_id: reportId,
      receipt_number: emptyToNull(payload.receipt.receiptNumber),
      parking_number: emptyToNull(payload.receipt.parkingNumber),
      spot_number: emptyToNull(payload.receipt.spotNumber),
      device_number: emptyToNull(payload.receipt.deviceNumber),
      entry_time: emptyToNull(payload.receipt.entryTime),
      exit_time: emptyToNull(payload.receipt.exitTime),
      duration_minutes: payload.receipt.durationMinutes ?? null,
      amount: payload.receipt.amount ?? payload.payment.amount ?? null,
      issuer_name: emptyToNull(payload.receipt.issuerName),
      receipt_text: emptyToNull(payload.receipt.receiptText),
    }),
  ]);

  const childError =
    locRes.error?.message ||
    opRes.error?.message ||
    payRes.error?.message ||
    recRes.error?.message;
  if (childError) return { error: childError, id: reportId };

  if (payload.evidence.length > 0) {
    const { error: evError } = await supabase.from("report_evidence").insert(
      payload.evidence.map((item) => ({
        report_id: reportId,
        storage_path: item.storagePath,
        category: item.category,
        captured_at: item.capturedAt ?? new Date().toISOString(),
        uploader_id: userId,
      })),
    );
    if (evError) return { error: evError.message, id: reportId };
    await createVerificationEvent(reportId, "EVIDENCE_UPLOADED", {
      count: payload.evidence.length,
    });
  }

  await createVerificationEvent(reportId, "LOCATION_RECORDED", {
    latitude: payload.location.latitude,
    longitude: payload.location.longitude,
    sector: payload.location.sector,
  });

  const result = await runVerification(reportId, payload);
  if (result.error) return { error: result.error, id: reportId };

  const { error: submitError } = await supabase
    .from("parking_reports")
    .update({
      status: "SUBMITTED",
      submitted_at: new Date().toISOString(),
      classification: result.classification,
      matched_site_id: result.matchedSiteId,
    })
    .eq("id", reportId);

  if (submitError) return { error: submitError.message, id: reportId };

  await createVerificationEvent(reportId, "VERIFICATION_COMPLETED", {
    classification: result.classification,
    evidenceScore: result.evidenceScore,
  });

  revalidatePath("/");
  revalidatePath("/reports");
  revalidatePath(`/reports/${reportId}`);
  return { error: null, id: reportId };
}

async function runVerification(reportId: string, payload: ReportPayload) {
  const { supabase } = await requireUser();
  const { data: configRows } = await supabase
    .from("verification_config")
    .select("key, value_numeric");
  const config = configFromRows(configRows ?? []);

  let nearby = [] as Awaited<ReturnType<typeof findNearbyParkingSites>>;
  if (payload.location.latitude != null && payload.location.longitude != null) {
    const reportDate = new Date();
    const authority = await getAuthoritativeParkingStatus(
      payload.location.latitude,
      payload.location.longitude,
      reportDate,
    );
    nearby = authority.matchingSites.map(
      (site): MatchedSite => ({
        id: site.id,
        name: site.name,
        sector: site.sector,
        address: site.address,
        latitude: site.latitude,
        longitude: site.longitude,
        officialStatus: site.officialStatus,
        isDemo: site.isDemo,
        distanceMeters: site.distanceMeters,
        approvedRate: site.activeContracts[0]?.approvedRate ?? site.activeContracts[0]?.rates[0]?.amount ?? null,
        rateUnit: site.activeContracts[0]?.rates[0]?.unit ?? "per visit",
        contract: site.activeContracts[0]
          ? {
              id: site.activeContracts[0].id,
              contractNumber: site.activeContracts[0].contractNumber,
              status: "ACTIVE",
              startDate: site.activeContracts[0].startDate,
              endDate: site.activeContracts[0].endDate,
              approvedRate: site.activeContracts[0].approvedRate,
            }
          : null,
        contractor: site.activeContracts[0]?.contractor
          ? {
              id: site.activeContracts[0].contractor.id,
              legalName: site.activeContracts[0].contractor.legalName,
              displayName: site.activeContracts[0].contractor.displayName,
              verificationStatus: site.activeContracts[0].contractor
                .verificationStatus as ContractorStatus,
            }
          : null,
      }),
    );
    if (authority.matchKind !== "NO_MATCH" && nearby[0]) {
      await createVerificationEvent(reportId, "AUTHORITY_RECORD_MATCHED", {
        siteId: nearby[0].id,
        name: nearby[0].name,
        distanceMeters: nearby[0].distanceMeters,
        isDemo: nearby[0].isDemo,
        matchKind: authority.matchKind,
        requestedDate: authority.requestedDate,
        explanation: authority.explanation,
      });
    }
  }

  const output = calculateVerification(
    {
      location: payload.location,
      operator: payload.operator,
      payment: payload.payment,
      receipt: {
        ...payload.receipt,
        hasImage: payload.evidence.some(
          (e) => e.category === "RECEIPT" || e.category === "QR_CODE",
        ),
      },
      nearbySites: nearby,
    },
    config,
  );

  if (output.matchedContractorId) {
    await supabase
      .from("report_operators")
      .update({ matched_contractor_id: output.matchedContractorId })
      .eq("report_id", reportId);
  }

  const { error } = await supabase.from("verification_results").upsert(
    {
      report_id: reportId,
      classification: output.classification,
      evidence_score: output.evidenceScore,
      location_score: output.locationScore,
      contract_score: output.contractScore,
      operator_score: output.operatorScore,
      rate_score: output.rateScore,
      receipt_score: output.receiptScore,
      payment_score: output.paymentScore,
      matched_site_id: output.matchedSiteId,
      matched_contract_id: output.matchedContractId,
      matched_contractor_id: output.matchedContractorId,
      distance_meters: output.distanceMeters,
      is_overcharging: output.isOvercharging,
      personal_upi: output.personalUpi,
      section_statuses: output.sectionStatuses,
      explanation: output.explanation,
      calculated_at: new Date().toISOString(),
    },
    { onConflict: "report_id" },
  );

  return {
    error: error?.message ?? null,
    classification: output.classification,
    evidenceScore: output.evidenceScore,
    matchedSiteId: output.matchedSiteId,
  };
}

export async function getReport(id: string) {
  const { supabase, userId, error } = await requireUser();
  if (error || !userId) return { error: error ?? "Sign in required.", report: null };

  const { data, error: fetchError } = await supabase
    .from("parking_reports")
    .select(
      `
      *,
      report_locations (*),
      report_operators (*),
      report_payments (*),
      report_receipts (*),
      report_evidence (*),
      verification_results (*),
      verification_events (*),
      parking_sites (id, name, sector, is_demo, official_status, latitude, longitude, source_type, source_title, source_url, source_document_id, publication_date, effective_from, effective_until, extracted_at, verified_by, verified_at, verification_status, confidence_score)
    `,
    )
    .eq("id", id)
    .maybeSingle();

  if (fetchError) return { error: fetchError.message, report: null };
  if (!data) return { error: "Report not found, or you do not have access.", report: null };
  return { error: null, report: data };
}

export async function listMyReports(filters: {
  classification?: Classification | "ALL";
  q?: string;
}) {
  const { supabase, userId, error } = await requireUser();
  if (error || !userId) return { error: error ?? "Sign in required.", reports: [] };

  let query = supabase
    .from("parking_reports")
    .select(
      `
      id, location_name, sector, classification, status, created_at, submitted_at,
      report_payments (amount, payment_mode, upi_recipient_name),
      report_operators (operator_name, attendant_name)
    `,
    )
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (filters.classification && filters.classification !== "ALL") {
    query = query.eq("classification", filters.classification);
  }
  if (filters.q) {
    query = query.or(
      `sector.ilike.%${filters.q}%,location_name.ilike.%${filters.q}%`,
    );
  }

  const { data, error: fetchError } = await query;
  if (fetchError) return { error: fetchError.message, reports: [] };
  return { error: null, reports: data ?? [] };
}

export async function getHomeStats() {
  const { supabase, userId } = await requireUser();
  if (!userId) {
    return { submitted: 0, verified: 0, needs: 0, unauthorised: 0 };
  }
  const { data } = await supabase
    .from("parking_reports")
    .select("classification, status")
    .eq("user_id", userId)
    .eq("status", "SUBMITTED");
  const rows = data ?? [];
  return {
    submitted: rows.length,
    verified: rows.filter((r) => r.classification === "VERIFIED_LEGAL").length,
    needs: rows.filter((r) => r.classification === "NEEDS_VERIFICATION").length,
    unauthorised: rows.filter((r) => r.classification === "POTENTIALLY_UNAUTHORISED").length,
  };
}

export async function attachEvidence(input: {
  reportId: string;
  storagePath: string;
  category: string;
}) {
  const { supabase, userId, error } = await requireUser();
  if (error || !userId) return { error: error ?? "Sign in required." };
  const { error: insertError } = await supabase.from("report_evidence").insert({
    report_id: input.reportId,
    storage_path: input.storagePath,
    category: input.category,
    uploader_id: userId,
  });
  if (insertError) return { error: insertError.message };
  await createVerificationEvent(input.reportId, "EVIDENCE_UPLOADED", {
    path: input.storagePath,
    category: input.category,
  });
  return { error: null };
}

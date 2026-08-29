"use server";

import { revalidatePath } from "next/cache";
import { isStaff } from "@/lib/auth/roles";
import { requireUser } from "@/lib/auth/session";
import { parsePdfBuffer, parseSpreadsheetBuffer } from "@/lib/authority/extract";
import {
  AUTHORITY_SOURCE_TYPES,
  REJECTED_AUTHORITY_SOURCE_HINTS,
  type AuthorityEntityKind,
  type AuthoritySourceType,
  type ProposedPayload,
} from "@/lib/authority/types";

async function requireStaff() {
  const session = await requireUser();
  if (session.error || !session.userId) {
    return { ...session, forbidden: "Sign in required." as const };
  }
  if (!isStaff(session.profile?.role)) {
    return { ...session, forbidden: "Staff access required." as const };
  }
  return { ...session, forbidden: null };
}

function emptyToNull(value?: FormDataEntryValue | string | null) {
  const t = String(value ?? "").trim();
  return t ? t : null;
}

function isSupportedSource(value: string): value is AuthoritySourceType {
  return (AUTHORITY_SOURCE_TYPES as readonly string[]).includes(value);
}

function looksLikeUntrustedSource(title: string, url: string | null, notes: string | null) {
  const hay = `${title} ${url ?? ""} ${notes ?? ""}`.toLowerCase();
  return REJECTED_AUTHORITY_SOURCE_HINTS.some((hint) => hay.includes(hint));
}

export async function createAuthorityDocument(formData: FormData) {
  const staff = await requireStaff();
  if (staff.forbidden) return { error: staff.forbidden, id: null };

  const sourceType = String(formData.get("sourceType") ?? "");
  const sourceTitle = String(formData.get("sourceTitle") ?? "").trim();
  const sourceUrl = emptyToNull(formData.get("sourceUrl"));
  const notes = emptyToNull(formData.get("notes"));
  if (!isSupportedSource(sourceType)) {
    return { error: "Use a supported official source type. News, maps listings, and user reports are not authority sources.", id: null };
  }
  if (sourceTitle.length < 3) return { error: "Source title is required.", id: null };
  if (looksLikeUntrustedSource(sourceTitle, sourceUrl, notes)) {
    return { error: "Newspaper articles, Google Maps listings, Reddit posts, and user reports are not authority sources.", id: null };
  }

  const file = formData.get("file");
  const hasFile = file instanceof File && file.size > 0;
  if (!hasFile && !sourceUrl) {
    return { error: "Upload a PDF/XLS/XLSX or enter a source URL.", id: null };
  }

  let storagePath: string | null = null;
  let originalFilename: string | null = null;
  let mimeType: string | null = null;
  if (hasFile && file instanceof File) {
    const allowed = [
      "application/pdf",
      "application/vnd.ms-excel",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "text/csv",
    ];
    const name = file.name.toLowerCase();
    const okExt = /\.(pdf|xls|xlsx|csv)$/.test(name);
    if (!okExt && file.type && !allowed.includes(file.type)) {
      return { error: "Upload a PDF, XLS, or XLSX file.", id: null };
    }
    const path = `${staff.userId}/${crypto.randomUUID()}-${file.name}`;
    const { error: uploadError } = await staff.supabase.storage
      .from("authority-documents")
      .upload(path, file, { upsert: false, contentType: file.type || undefined });
    if (uploadError) return { error: uploadError.message, id: null };
    storagePath = path;
    originalFilename = file.name;
    mimeType = file.type || null;
  }

  const { data, error } = await staff.supabase
    .from("authority_documents")
    .insert({
      source_type: sourceType,
      source_title: sourceTitle,
      source_url: sourceUrl,
      source_document_id: null,
      publication_date: emptyToNull(formData.get("publicationDate")),
      effective_from: emptyToNull(formData.get("effectiveFrom")),
      effective_until: emptyToNull(formData.get("effectiveUntil")),
      notes,
      storage_path: storagePath,
      original_filename: originalFilename,
      mime_type: mimeType,
      workflow_status: "DOCUMENT",
      verification_status: "UNVERIFIED",
      created_by: staff.userId,
    })
    .select("id")
    .single();
  if (error || !data) return { error: error?.message ?? "Could not save document.", id: null };

  await staff.supabase
    .from("authority_documents")
    .update({ source_document_id: data.id })
    .eq("id", data.id);

  revalidatePath("/admin/authority");
  return { error: null, id: data.id as string };
}

export async function extractAuthorityDocument(documentId: string) {
  const staff = await requireStaff();
  if (staff.forbidden) return { error: staff.forbidden, count: 0 };

  const { data: doc, error } = await staff.supabase
    .from("authority_documents")
    .select("*")
    .eq("id", documentId)
    .maybeSingle();
  if (error || !doc) return { error: error?.message ?? "Document not found.", count: 0 };

  await staff.supabase
    .from("authority_documents")
    .update({ workflow_status: "EXTRACTION" })
    .eq("id", documentId);

  let proposals: Awaited<ReturnType<typeof parsePdfBuffer>> = [];
  if (doc.storage_path) {
    const { data: file, error: dlError } = await staff.supabase.storage
      .from("authority-documents")
      .download(doc.storage_path);
    if (dlError || !file) return { error: dlError?.message ?? "Could not read file.", count: 0 };
    const buffer = await file.arrayBuffer();
    const name = String(doc.original_filename ?? "").toLowerCase();
    if (name.endsWith(".pdf") || doc.mime_type === "application/pdf") {
      proposals = await parsePdfBuffer(buffer);
    } else {
      proposals = parseSpreadsheetBuffer(Buffer.from(buffer));
    }
  } else {
    proposals = [
      {
        entityKind: "SITE",
        payload: { notes: `Source URL only: ${doc.source_url}. Enter extracted fields from the official page.` },
        confidenceScore: 15,
      },
    ];
  }

  const extractedAt = new Date().toISOString();
  const rows = proposals.map((p) => ({
    document_id: documentId,
    entity_kind: p.entityKind,
    payload: p.payload,
    review_status: "PROPOSED",
    verification_status: "PROPOSED",
    confidence_score: p.confidenceScore,
    source_type: doc.source_type,
    source_title: doc.source_title,
    source_url: doc.source_url,
    source_document_id: documentId,
    publication_date: doc.publication_date,
    effective_from: p.payload.effectiveFrom ?? doc.effective_from,
    effective_until: p.payload.effectiveUntil ?? doc.effective_until,
    extracted_at: extractedAt,
  }));

  if (rows.length) {
    const { error: insertError } = await staff.supabase.from("authority_proposed_records").insert(rows);
    if (insertError) return { error: insertError.message, count: 0 };
  }

  await staff.supabase
    .from("authority_documents")
    .update({
      workflow_status: "PROPOSED",
      extracted_at: extractedAt,
      extracted_by: staff.userId,
      verification_status: "PROPOSED",
    })
    .eq("id", documentId);

  revalidatePath(`/admin/authority/${documentId}`);
  revalidatePath("/admin/authority");
  return { error: null, count: rows.length };
}

export async function updateProposedRecord(recordId: string, payload: ProposedPayload) {
  const staff = await requireStaff();
  if (staff.forbidden) return { error: staff.forbidden };
  const { data: row } = await staff.supabase
    .from("authority_proposed_records")
    .select("id, review_status, document_id")
    .eq("id", recordId)
    .maybeSingle();
  if (!row || row.review_status === "APPROVED") {
    return { error: "Approved records cannot be edited. Add a new historical record instead." };
  }
  const { error } = await staff.supabase
    .from("authority_proposed_records")
    .update({
      payload,
      verification_status: "UNDER_REVIEW",
    })
    .eq("id", recordId);
  if (error) return { error: error.message };
  await staff.supabase
    .from("authority_documents")
    .update({ workflow_status: "REVIEW", verification_status: "UNDER_REVIEW" })
    .eq("id", row.document_id);
  revalidatePath(`/admin/authority/${row.document_id}`);
  return { error: null };
}

async function upsertAuthoritySource(
  staff: Awaited<ReturnType<typeof requireStaff>>,
  doc: {
    id: string;
    source_type: string;
    source_title: string;
    source_url: string | null;
    publication_date: string | null;
    effective_from: string | null;
    effective_until: string | null;
  },
) {
  const { data } = await staff.supabase
    .from("authority_sources")
    .insert({
      source_type: doc.source_type,
      source_title: doc.source_title,
      source_url: doc.source_url,
      source_document_id: doc.id,
      source_date: doc.publication_date,
      publication_date: doc.publication_date,
      effective_from: doc.effective_from,
      effective_until: doc.effective_until,
      effective_date: doc.effective_from,
      expiry_date: doc.effective_until,
      verification_status: "VERIFIED",
      verified_by: staff.userId,
      verified_at: new Date().toISOString(),
      created_by: staff.userId,
      is_demo: false,
    })
    .select("id")
    .maybeSingle();
  return data?.id as string | undefined;
}

export async function approveProposedRecord(recordId: string) {
  const staff = await requireStaff();
  if (staff.forbidden) return { error: staff.forbidden };

  const { data: row, error } = await staff.supabase
    .from("authority_proposed_records")
    .select("*, authority_documents (*)")
    .eq("id", recordId)
    .maybeSingle();
  if (error || !row) return { error: error?.message ?? "Record not found." };
  if (row.review_status === "APPROVED") return { error: "Already approved." };
  if (row.review_status === "REJECTED") return { error: "Rejected records cannot be approved." };

  const doc = (Array.isArray(row.authority_documents)
    ? row.authority_documents[0]
    : row.authority_documents) as {
    id: string;
    source_type: string;
    source_title: string;
    source_url: string | null;
    publication_date: string | null;
    effective_from: string | null;
    effective_until: string | null;
  };
  const payload = (row.payload ?? {}) as ProposedPayload;
  const sourceId = await upsertAuthoritySource(staff, doc);
  const now = new Date().toISOString();
  const provenance = {
    source_type: row.source_type,
    source_title: row.source_title,
    source_url: row.source_url,
    source_document_id: row.source_document_id,
    publication_date: row.publication_date,
    effective_from: payload.effectiveFrom ?? row.effective_from,
    effective_until: payload.effectiveUntil ?? row.effective_until,
    extracted_at: row.extracted_at,
    verified_by: staff.userId,
    verified_at: now,
    verification_status: "VERIFIED" as const,
    confidence_score: row.confidence_score,
  };
  const withSource = { ...provenance, source_id: sourceId ?? null, is_demo: false };

  let table = "";
  let entityId: string | null = null;
  const kind = row.entity_kind as AuthorityEntityKind;

  if (kind === "SITE") {
    table = "parking_sites";
    const { data, error: ins } = await staff.supabase
      .from("parking_sites")
      .insert({
        name: payload.name || row.source_title,
        sector: payload.sector ?? null,
        address: payload.address ?? null,
        landmark: payload.landmark ?? null,
        latitude: payload.latitude ?? null,
        longitude: payload.longitude ?? null,
        parking_type: payload.parkingType || null,
        cluster: payload.cluster ?? null,
        work_circle: payload.workCircle ?? null,
        tender_number: payload.tenderNumber ?? null,
        contract_number: payload.contractNumber ?? null,
        official_status: "AUTHORISED",
        notes: payload.notes ?? null,
        ...withSource,
      })
      .select("id")
      .single();
    if (ins || !data) return { error: ins?.message ?? "Could not approve site." };
    entityId = data.id;
  } else if (kind === "CONTRACTOR") {
    table = "parking_contractors";
    const { data, error: ins } = await staff.supabase
      .from("parking_contractors")
      .insert({
        ...withSource,
        legal_name: payload.contractorName || payload.name || "Unnamed contractor",
        display_name: payload.contractorName ?? null,
        notes: payload.notes ?? null,
        verification_status: "VERIFIED",
        authority_verification_status: "VERIFIED",
      })
      .select("id")
      .single();
    if (ins || !data) return { error: ins?.message ?? "Could not approve contractor." };
    entityId = data.id;
  } else if (kind === "TENDER") {
    table = "parking_tenders";
    const { data, error: ins } = await staff.supabase
      .from("parking_tenders")
      .insert({
        tender_number: payload.tenderNumber || "UNKNOWN",
        title: payload.name ?? null,
        sector: payload.sector ?? null,
        cluster: payload.cluster ?? null,
        work_circle: payload.workCircle ?? null,
        contractor_name: payload.contractorName ?? null,
        notes: payload.notes ?? null,
        is_demo: false,
        ...provenance,
      })
      .select("id")
      .single();
    if (ins || !data) return { error: ins?.message ?? "Could not approve tender." };
    entityId = data.id;
  } else if (kind === "CONTRACT") {
    table = "parking_contracts";
    let contractorId = payload.contractorId;
    if (!contractorId && payload.contractorName) {
      const { data: existing } = await staff.supabase
        .from("parking_contractors")
        .select("id")
        .ilike("legal_name", payload.contractorName)
        .maybeSingle();
      if (existing) contractorId = existing.id;
      else {
        const { data: created } = await staff.supabase
          .from("parking_contractors")
          .insert({
            ...withSource,
            legal_name: payload.contractorName,
            verification_status: "VERIFIED",
            authority_verification_status: "VERIFIED",
          })
          .select("id")
          .single();
        contractorId = created?.id;
      }
    }
    if (!contractorId) return { error: "A contractor name is required to approve a contract." };
    const { data, error: ins } = await staff.supabase
      .from("parking_contracts")
      .insert({
        contractor_id: contractorId,
        parking_site_id: payload.parkingSiteId || null,
        contract_number: payload.contractNumber ?? null,
        tender_number: payload.tenderNumber ?? null,
        cluster: payload.cluster ?? null,
        work_circle: payload.workCircle ?? null,
        start_date: provenance.effective_from,
        end_date: provenance.effective_until,
        approved_rate: payload.approvedRate ?? null,
        status: "ACTIVE",
        notes: payload.notes ?? null,
        ...withSource,
      })
      .select("id")
      .single();
    if (ins || !data) return { error: ins?.message ?? "Could not approve contract." };
    entityId = data.id;
    if (payload.parkingSiteId) {
      await staff.supabase.from("parking_contract_sites").insert({
        contract_id: data.id,
        parking_site_id: payload.parkingSiteId,
        ...provenance,
      });
    }
  } else if (kind === "RATE") {
    table = "parking_rates";
    if (!payload.parkingSiteId) return { error: "A parking site is required to approve a rate." };
    const { data, error: ins } = await staff.supabase
      .from("parking_rates")
      .insert({
        parking_site_id: payload.parkingSiteId,
        rate_amount: payload.approvedRate ?? 0,
        unit: payload.rateUnit || "per visit",
        vehicle_type: payload.vehicleType ?? null,
        effective_from: provenance.effective_from,
        effective_to: provenance.effective_until,
        notes: payload.notes ?? null,
        source_id: sourceId ?? null,
        source_type: provenance.source_type,
        source_title: provenance.source_title,
        source_url: provenance.source_url,
        source_document_id: provenance.source_document_id,
        publication_date: provenance.publication_date,
        extracted_at: provenance.extracted_at,
        verified_by: provenance.verified_by,
        verified_at: provenance.verified_at,
        verification_status: "VERIFIED",
        confidence_score: provenance.confidence_score,
        is_demo: false,
      })
      .select("id")
      .single();
    if (ins || !data) return { error: ins?.message ?? "Could not approve rate." };
    entityId = data.id;
  }

  const { error: reviewError } = await staff.supabase
    .from("authority_proposed_records")
    .update({
      review_status: "APPROVED",
      verification_status: "VERIFIED",
      verified_by: staff.userId,
      verified_at: now,
      approved_entity_table: table,
      approved_entity_id: entityId,
    })
    .eq("id", recordId);
  if (reviewError) return { error: reviewError.message };

  const { data: remaining } = await staff.supabase
    .from("authority_proposed_records")
    .select("id, review_status")
    .eq("document_id", row.document_id)
    .eq("review_status", "PROPOSED");
  await staff.supabase
    .from("authority_documents")
    .update({
      workflow_status: remaining && remaining.length === 0 ? "ACTIVE" : "REVIEW",
      verification_status: "VERIFIED",
      verified_by: staff.userId,
      verified_at: now,
      reviewed_by: staff.userId,
      reviewed_at: now,
    })
    .eq("id", row.document_id);

  revalidatePath(`/admin/authority/${row.document_id}`);
  revalidatePath("/admin");
  revalidatePath("/nearby");
  return { error: null };
}

export async function rejectProposedRecord(recordId: string, notes?: string) {
  const staff = await requireStaff();
  if (staff.forbidden) return { error: staff.forbidden };
  const { data: row } = await staff.supabase
    .from("authority_proposed_records")
    .select("id, document_id, review_status")
    .eq("id", recordId)
    .maybeSingle();
  if (!row) return { error: "Record not found." };
  if (row.review_status === "APPROVED") return { error: "Approved records cannot be rejected." };
  const { error } = await staff.supabase
    .from("authority_proposed_records")
    .update({
      review_status: "REJECTED",
      verification_status: "REJECTED",
      review_notes: notes || null,
      verified_by: staff.userId,
      verified_at: new Date().toISOString(),
    })
    .eq("id", recordId);
  if (error) return { error: error.message };
  revalidatePath(`/admin/authority/${row.document_id}`);
  return { error: null };
}

export async function expireAuthorityRecord(table: "parking_sites" | "parking_contracts" | "parking_tenders" | "parking_rates", id: string) {
  const staff = await requireStaff();
  if (staff.forbidden) return { error: staff.forbidden };
  const patch: Record<string, unknown> = {
    verification_status: "EXPIRED",
  };
  if (table === "parking_sites") patch.official_status = "EXPIRED";
  if (table === "parking_contracts") patch.status = "EXPIRED";
  const { error } = await staff.supabase.from(table).update(patch).eq("id", id);
  if (error) return { error: error.message };
  revalidatePath("/admin/authority");
  revalidatePath("/admin");
  return { error: null };
}

export async function getAuthorityDocumentUrl(path: string) {
  const staff = await requireStaff();
  if (staff.forbidden) return { error: staff.forbidden, url: null };
  const { data, error } = await staff.supabase.storage
    .from("authority-documents")
    .createSignedUrl(path, 3600);
  if (error) return { error: error.message, url: null };
  return { error: null, url: data.signedUrl };
}

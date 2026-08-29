import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { getSessionUser } from "@/lib/auth/session";
import { isStaff } from "@/lib/auth/roles";
import { createClient } from "@/lib/supabase/server";
import { AuthorityDocumentReview } from "@/components/admin/authority-document-review";
import { SourceSection } from "@/components/authority/source-section";

export default async function AuthorityDocumentPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { userId, profile } = await getSessionUser();
  if (!userId) redirect("/login");
  if (!isStaff(profile?.role)) redirect("/admin");
  const { id } = await params;
  const supabase = await createClient();
  const { data: doc } = await supabase.from("authority_documents").select("*").eq("id", id).maybeSingle();
  if (!doc) notFound();

  const [{ data: records }, { data: logs }] = await Promise.all([
    supabase
      .from("authority_proposed_records")
      .select("id, entity_kind, review_status, verification_status, confidence_score, payload, review_notes")
      .eq("document_id", id)
      .order("created_at"),
    supabase
      .from("authority_data_change_log")
      .select("id, table_name, action, created_at, record_id")
      .or(`record_id.eq.${id},table_name.eq.authority_proposed_records`)
      .order("created_at", { ascending: false })
      .limit(40),
  ]);

  let documentUrl: string | null = null;
  if (doc.storage_path) {
    const { data } = await supabase.storage
      .from("authority-documents")
      .createSignedUrl(doc.storage_path, 3600);
    documentUrl = data?.signedUrl ?? null;
  }

  return (
    <div className="space-y-5">
      <p className="text-xs text-zinc-500">
        <Link href="/admin/authority" className="underline">Authority data</Link> / document
      </p>
      <div>
        <h1 className="text-xl font-semibold">{doc.source_title}</h1>
        <p className="text-sm text-zinc-600">
          {doc.workflow_status} · {doc.verification_status}
          {doc.original_filename ? ` · ${doc.original_filename}` : ""}
        </p>
      </div>
      <SourceSection
        provenance={{
          sourceType: doc.source_type,
          sourceTitle: doc.source_title,
          sourceUrl: doc.source_url,
          sourceDocumentId: doc.id,
          publicationDate: doc.publication_date,
          effectiveFrom: doc.effective_from,
          effectiveUntil: doc.effective_until,
          extractedAt: doc.extracted_at,
          verifiedBy: doc.verified_by,
          verifiedAt: doc.verified_at,
          verificationStatus: doc.verification_status,
          confidenceScore: doc.confidence_score,
        }}
        documentUrl={documentUrl}
      />
      <AuthorityDocumentReview
        documentId={doc.id}
        workflowStatus={doc.workflow_status}
        records={records ?? []}
      />
      <section className="space-y-2">
        <h2 className="text-sm font-semibold">Change history</h2>
        <div className="max-h-64 overflow-auto rounded-md border bg-white">
          {(logs ?? []).map((log) => (
            <p key={log.id} className="border-b px-3 py-2 text-xs">
              {log.created_at} · {log.action} · {log.table_name}
            </p>
          ))}
        </div>
      </section>
    </div>
  );
}

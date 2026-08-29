import { redirect } from "next/navigation";
import Link from "next/link";
import { getSessionUser } from "@/lib/auth/session";
import { isStaff } from "@/lib/auth/roles";
import { createClient } from "@/lib/supabase/server";
import { AuthorityIngestForm } from "@/components/admin/authority-ingest-form";
import { expireAuthorityRecord } from "@/lib/actions/authority";
import { Button } from "@/components/ui/button";
import { SOURCE_TYPE_LABELS } from "@/lib/constants";

export default async function AuthorityDataPage() {
  const { userId, profile } = await getSessionUser();
  if (!userId) redirect("/login");
  if (!isStaff(profile?.role)) redirect("/admin");

  const supabase = await createClient();
  const [{ data: documents }, { data: sites }, { data: contracts }, { data: logs }] = await Promise.all([
    supabase
      .from("authority_documents")
      .select("id, source_title, source_type, workflow_status, verification_status, created_at, original_filename")
      .order("created_at", { ascending: false })
      .limit(50),
    supabase
      .from("parking_sites")
      .select("id, name, sector, official_status, verification_status, is_demo, source_title, source_type, verified_at")
      .order("name")
      .limit(80),
    supabase
      .from("parking_contracts")
      .select("id, contract_number, status, start_date, end_date, verification_status, source_title")
      .order("start_date", { ascending: false })
      .limit(80),
    supabase
      .from("authority_data_change_log")
      .select("id, table_name, record_id, action, created_at")
      .order("created_at", { ascending: false })
      .limit(40),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs text-zinc-500">
          <Link href="/admin" className="underline">Admin</Link> / Authority data
        </p>
        <h1 className="mt-1 text-xl font-semibold">Authority data</h1>
        <p className="text-sm text-zinc-600">
          Trusted official dataset, kept separate from user reports. Every record needs provenance.
          Extracted information stays proposed until a staff member approves it.
        </p>
      </div>

      <AuthorityIngestForm />

      <section className="space-y-2">
        <h2 className="text-sm font-semibold">Source documents</h2>
        {(documents ?? []).length === 0 ? (
          <p className="text-sm text-zinc-600">No documents ingested yet.</p>
        ) : (
          (documents ?? []).map((doc) => (
            <Link
              key={doc.id}
              href={`/admin/authority/${doc.id}`}
              className="flex flex-col gap-1 rounded-md border bg-white p-3 text-sm sm:flex-row sm:justify-between"
            >
              <span>
                {doc.source_title}
                <span className="ml-2 text-xs text-zinc-500">
                  {SOURCE_TYPE_LABELS[doc.source_type] ?? doc.source_type}
                </span>
              </span>
              <span className="text-xs uppercase text-zinc-500">
                {doc.workflow_status} · {doc.verification_status}
              </span>
            </Link>
          ))
        )}
      </section>

      <section className="space-y-2">
        <h2 className="text-sm font-semibold">Verified / listed parking sites</h2>
        {(sites ?? []).map((site) => (
          <article key={site.id} className="rounded-md border bg-white p-3 text-sm">
            <p className="font-medium">
              {site.name} {site.is_demo ? <span className="text-xs font-semibold">DEMO DATA</span> : null}
            </p>
            <p className="text-xs text-zinc-600">
              {site.sector ? `Sector ${site.sector}` : ""} · {site.official_status} · {site.verification_status}
            </p>
            <p className="text-xs text-zinc-500">{site.source_title}</p>
            {site.official_status !== "EXPIRED" ? (
              <form
                className="mt-2"
                action={async () => {
                  "use server";
                  await expireAuthorityRecord("parking_sites", site.id);
                }}
              >
                <Button type="submit" variant="outline" size="sm">
                  Expire site
                </Button>
              </form>
            ) : null}
          </article>
        ))}
      </section>

      <section className="space-y-2">
        <h2 className="text-sm font-semibold">Contracts (historical rows are kept)</h2>
        {(contracts ?? []).map((c) => (
          <article key={c.id} className="rounded-md border bg-white p-3 text-sm">
            <p className="font-medium">{c.contract_number || "Unnumbered contract"}</p>
            <p className="text-xs text-zinc-600">
              {c.start_date} → {c.end_date} · {c.status} · {c.verification_status}
            </p>
            <p className="text-xs text-zinc-500">{c.source_title}</p>
            {c.status !== "EXPIRED" ? (
              <form
                className="mt-2"
                action={async () => {
                  "use server";
                  await expireAuthorityRecord("parking_contracts", c.id);
                }}
              >
                <Button type="submit" variant="outline" size="sm">
                  Expire contract
                </Button>
              </form>
            ) : null}
          </article>
        ))}
      </section>

      <section className="space-y-2">
        <h2 className="text-sm font-semibold">Change history</h2>
        <div className="max-h-80 overflow-auto rounded-md border bg-white">
          {(logs ?? []).map((log) => (
            <p key={log.id} className="border-b px-3 py-2 text-xs">
              {log.created_at} · {log.action} · {log.table_name} · {log.record_id}
            </p>
          ))}
          {(logs ?? []).length === 0 ? (
            <p className="p-3 text-sm text-zinc-600">No authority changes recorded yet.</p>
          ) : null}
        </div>
      </section>
    </div>
  );
}

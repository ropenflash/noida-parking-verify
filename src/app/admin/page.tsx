import { redirect } from "next/navigation";
import Link from "next/link";
import { getSessionUser } from "@/lib/auth/session";
import { isStaff } from "@/lib/auth/roles";
import { listAdminReports, listAuditLogs } from "@/lib/actions/admin";
import { createClient } from "@/lib/supabase/server";
import { StatusBadge } from "@/components/status-badge";
import { AdminForms } from "@/components/admin/admin-forms";

export default async function AdminPage() {
  const { userId, profile } = await getSessionUser();
  if (!userId) redirect("/login");
  if (!isStaff(profile?.role)) {
    return (
      <p className="text-sm text-zinc-700">
        Staff access required. An admin can grant a role in the database:{" "}
        <code>update profiles set role = &apos;ADMIN&apos; where id = &apos;…&apos;;</code>
      </p>
    );
  }

  const supabase = await createClient();
  const [{ reports }, { logs }, sites, contractors, sources] = await Promise.all([
    listAdminReports(),
    listAuditLogs(),
    supabase.from("parking_sites").select("id, name, sector, official_status, is_demo").order("name"),
    supabase.from("parking_contractors").select("id, legal_name, verification_status").order("legal_name"),
    supabase.from("authority_sources").select("id, source_title, source_type, is_demo").order("created_at", { ascending: false }),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Admin</h1>
        <p className="text-sm text-zinc-600">
          Role: {profile?.role}. Authority records require a source. Do not invent official data.
        </p>
        <Link href="/admin/authority" className="mt-3 inline-flex h-11 items-center rounded-md border bg-white px-4 text-sm font-medium">
          Authority data
        </Link>
      </div>
      <AdminForms
        sites={sites.data ?? []}
        contractors={contractors.data ?? []}
        sources={sources.data ?? []}
      />
      <section className="space-y-2">
        <h2 className="text-sm font-semibold">Reports</h2>
        {(reports ?? []).map((r) => (
          <Link key={r.id} href={`/admin/reports/${r.id}`} className="flex justify-between rounded-md border bg-white p-3 text-sm">
            <span>{r.location_name ?? r.sector}</span>
            <StatusBadge classification={r.classification} />
          </Link>
        ))}
      </section>
      <section className="space-y-2">
        <h2 className="text-sm font-semibold">Audit history</h2>
        <div className="max-h-80 overflow-auto rounded-md border bg-white">
          {(logs ?? []).map((log) => (
            <p key={log.id} className="border-b px-3 py-2 text-xs">
              {log.action} · {log.entity} · {log.entity_id}
            </p>
          ))}
        </div>
      </section>
    </div>
  );
}

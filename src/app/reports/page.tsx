import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth/session";
import { listMyReports } from "@/lib/actions/reports";
import { StatusBadge } from "@/components/status-badge";
import { formatDate, formatInr } from "@/lib/format";
import type { Classification } from "@/lib/types";

const filters: { id: Classification | "ALL"; label: string }[] = [
  { id: "ALL", label: "All" },
  { id: "VERIFIED_LEGAL", label: "Verified" },
  { id: "LIKELY_LEGAL", label: "Likely authorised" },
  { id: "NEEDS_VERIFICATION", label: "Needs verification" },
  { id: "POTENTIALLY_UNAUTHORISED", label: "Potentially unauthorised" },
  { id: "OVERCHARGING", label: "Overcharging" },
];

export default async function ReportsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; q?: string }>;
}) {
  const { userId } = await getSessionUser();
  if (!userId) redirect("/login");
  const params = await searchParams;
  const classification = (params.status as Classification | "ALL" | undefined) ?? "ALL";
  const { reports, error } = await listMyReports({
    classification,
    q: params.q,
  });

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">My reports</h1>
      <form className="flex flex-col gap-2 sm:flex-row">
        <input
          name="q"
          defaultValue={params.q ?? ""}
          placeholder="Sector, parking name, operator"
          className="h-12 flex-1 rounded-md border border-zinc-200 bg-white px-3 text-sm"
        />
        <button className="h-12 rounded-md bg-zinc-900 px-4 text-sm text-white">Search</button>
      </form>
      <div className="flex gap-2 overflow-x-auto pb-1">
        {filters.map((f) => (
          <Link
            key={f.id}
            href={f.id === "ALL" ? "/reports" : `/reports?status=${f.id}`}
            className={`whitespace-nowrap rounded-full border px-3 py-1 text-xs ${
              classification === f.id ? "bg-zinc-900 text-white" : "bg-white"
            }`}
          >
            {f.label}
          </Link>
        ))}
      </div>
      {error ? <p className="text-sm text-red-700">{error}</p> : null}
      <div className="space-y-3">
        {reports.map((report) => {
          const payment = Array.isArray(report.report_payments)
            ? report.report_payments[0]
            : report.report_payments;
          const operator = Array.isArray(report.report_operators)
            ? report.report_operators[0]
            : report.report_operators;
          return (
            <Link
              key={report.id}
              href={`/reports/${report.id}`}
              className="block rounded-lg border bg-white p-4"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-medium">{report.location_name ?? "Parking point"}</p>
                  <p className="text-sm text-zinc-600">
                    {report.sector ? `Sector ${report.sector}` : "Sector unknown"} · {formatDate(report.created_at)}
                  </p>
                  <p className="mt-1 text-sm">
                    {formatInr(payment?.amount)} · {operator?.operator_name || operator?.attendant_name || "Operator not recorded"}
                  </p>
                </div>
                <StatusBadge classification={report.classification} />
              </div>
            </Link>
          );
        })}
        {reports.length === 0 ? (
          <p className="text-sm text-zinc-600">No reports yet. Tap Verify Parking to start.</p>
        ) : null}
      </div>
    </div>
  );
}

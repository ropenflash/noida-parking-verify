import { notFound, redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth/session";
import { isStaff } from "@/lib/auth/roles";
import { getReport } from "@/lib/actions/reports";
import { overrideVerification } from "@/lib/actions/admin";
import { StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";

export default async function AdminReportPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { userId, profile } = await getSessionUser();
  if (!userId) redirect("/login");
  if (!isStaff(profile?.role)) redirect("/");
  const { id } = await params;
  const { report, error } = await getReport(id);
  if (error || !report) notFound();

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Review report</h1>
      <StatusBadge classification={report.classification} large />
      <p className="text-sm">{report.location_name}</p>
      <form
        className="space-y-2 rounded-lg border bg-white p-4"
        action={async (fd) => {
          "use server";
          await overrideVerification({
            reportId: id,
            classification: fd.get("classification"),
            reason: fd.get("reason"),
            duplicateOf: fd.get("duplicateOf") || undefined,
          });
        }}
      >
        <label className="block text-sm">
          Change verification status
          <select name="classification" className="mt-1 h-11 w-full rounded-md border px-2">
            <option value="VERIFIED_LEGAL">Verified</option>
            <option value="LIKELY_LEGAL">Likely authorised</option>
            <option value="NEEDS_VERIFICATION">Needs verification</option>
            <option value="POTENTIALLY_UNAUTHORISED">Potentially unauthorised</option>
            <option value="OVERCHARGING">Overcharging</option>
            <option value="UNKNOWN">Insufficient evidence</option>
          </select>
        </label>
        <label className="block text-sm">
          Reason (required)
          <textarea name="reason" required minLength={8} className="mt-1 min-h-24 w-full rounded-md border p-2" />
        </label>
        <label className="block text-sm">
          Flag duplicate of report ID
          <input name="duplicateOf" className="mt-1 h-11 w-full rounded-md border px-2" />
        </label>
        <Button className="h-11">Save override</Button>
      </form>
    </div>
  );
}

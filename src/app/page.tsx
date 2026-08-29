import Link from "next/link";
import { redirect } from "next/navigation";
import { ClipboardCheck, MapPin, Search, FolderOpen } from "lucide-react";
import { getHomeStats } from "@/lib/actions/reports";
import { signInAsGuest } from "@/lib/actions/auth";
import { getSessionUser } from "@/lib/auth/session";
import { LegalDisclaimer } from "@/components/legal-disclaimer";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default async function HomePage() {
  const { userId } = await getSessionUser();
  const stats = await getHomeStats();

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">
          Noida, Uttar Pradesh
        </p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight">
          Parking verification
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-zinc-600">
          Document a collection point and compare evidence against sourced
          authority records. This is not a booking app and not a legal ruling.
        </p>
      </div>

      <div className="flex flex-col gap-2 md:flex-row md:items-center">
        <Button asChild className="h-14 w-full text-base md:w-auto md:px-8">
          <Link href={userId ? "/verify" : "/login"}>
            <ClipboardCheck className="mr-2 size-5" />
            Verify Parking
          </Link>
        </Button>
        {!userId ? (
          <form
            action={async () => {
              const result = await signInAsGuest();
              if (result?.error) {
                redirect(`/login?error=${encodeURIComponent(result.error)}`);
              }
            }}
          >
            <Button type="submit" variant="outline" className="h-14 w-full text-base md:w-auto md:px-8">
              Continue as guest
            </Button>
          </form>
        ) : null}
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
        <ActionCard href="/reports" icon={FolderOpen} label="My Reports" />
        <ActionCard href="/nearby" icon={MapPin} label="Nearby Parking" />
        <ActionCard href="/search" icon={Search} label="Search Parking" />
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat label="Reports submitted" value={stats.submitted} />
        <Stat label="Verified legal" value={stats.verified} />
        <Stat label="Needs verification" value={stats.needs} />
        <Stat label="Potentially unauthorised" value={stats.unauthorised} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">How to verify parking</CardTitle>
        </CardHeader>
        <CardContent>
          <ol className="list-decimal space-y-2 pl-5 text-sm text-zinc-700">
            <li>Capture exact location</li>
            <li>Photograph parking sign</li>
            <li>Record operator</li>
            <li>Record payment/receipt</li>
            <li>Compare with authorised records</li>
          </ol>
        </CardContent>
      </Card>

      <LegalDisclaimer />
    </div>
  );
}

function ActionCard({
  href,
  icon: Icon,
  label,
}: {
  href: string;
  icon: typeof MapPin;
  label: string;
}) {
  return (
    <Link
      href={href}
      className="flex min-h-20 flex-col items-start justify-center gap-2 rounded-lg border bg-white p-4 text-sm font-medium shadow-sm"
    >
      <Icon className="size-5" />
      {label}
    </Link>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border bg-white p-3">
      <div className="text-2xl font-semibold tabular-nums">{value}</div>
      <div className="text-xs text-zinc-600">{label}</div>
    </div>
  );
}

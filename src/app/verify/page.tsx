import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth/session";
import { VerifyWizard } from "@/components/verify/verify-wizard";
import { LegalDisclaimer } from "@/components/legal-disclaimer";

export default async function VerifyPage() {
  const { userId, profile } = await getSessionUser();
  if (!userId) redirect("/login");

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold">Verify parking</h1>
        <p className="text-sm text-zinc-600">
          Record what you can see at the collection point. Geolocation is optional.
        </p>
        {profile?.is_anonymous ? (
          <p className="mt-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-950">
            You are reporting as a guest.{" "}
            <Link href="/signup" className="underline">
              Create an account
            </Link>{" "}
            to keep this report if you change devices.
          </p>
        ) : null}
      </div>
      <LegalDisclaimer compact />
      <VerifyWizard userId={userId} />
    </div>
  );
}

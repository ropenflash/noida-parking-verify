import Link from "next/link";
import { ClipboardCheck } from "lucide-react";
import { signOut } from "@/lib/actions/auth";
import { Button } from "@/components/ui/button";
import type { Profile } from "@/lib/types";
import { isStaff } from "@/lib/auth/roles";

const links = [
  { href: "/", label: "Home" },
  { href: "/verify", label: "Verify" },
  { href: "/reports", label: "Reports" },
  { href: "/nearby", label: "Nearby" },
  { href: "/search", label: "Search" },
];

export function AppShell({
  children,
  profile,
}: {
  children: React.ReactNode;
  profile: Profile | null;
}) {
  return (
    <div className="flex min-h-full flex-col bg-zinc-50">
      <header className="sticky top-0 z-30 border-b border-zinc-200 bg-white">
        <div className="mx-auto flex h-14 max-w-5xl items-center justify-between gap-3 px-4">
          <Link href="/" className="flex items-center gap-2 font-semibold">
            <ClipboardCheck className="size-5" />
            <span className="text-sm sm:text-base">Noida Parking Verify</span>
          </Link>
          <nav className="hidden items-center gap-4 text-sm text-zinc-600 md:flex">
            {links.map((l) => (
              <Link key={l.href} href={l.href} className="hover:text-zinc-900">
                {l.label}
              </Link>
            ))}
            {profile && isStaff(profile.role) ? (
              <Link href="/admin" className="hover:text-zinc-900">
                Admin
              </Link>
            ) : null}
          </nav>
          <div className="flex items-center gap-2">
            {profile ? (
              <>
                {profile.is_anonymous ? (
                  <Button asChild variant="ghost" size="sm">
                    <Link href="/signup">Save account</Link>
                  </Button>
                ) : null}
                <span className="hidden max-w-28 truncate text-xs text-zinc-500 sm:inline">
                  {profile.is_anonymous ? "Guest" : profile.display_name}
                </span>
                <form action={signOut}>
                  <Button type="submit" variant="outline" size="sm">
                    Sign out
                  </Button>
                </form>
              </>
            ) : (
              <Button asChild size="sm">
                <Link href="/login">Sign in</Link>
              </Button>
            )}
          </div>
        </div>
      </header>
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-6 pb-24 md:pb-8">
        {children}
      </main>
      <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-zinc-200 bg-white md:hidden">
        <div className="grid grid-cols-5 text-center text-[11px]">
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="flex min-h-12 flex-col items-center justify-center px-1 py-2 text-zinc-700"
            >
              {l.label}
            </Link>
          ))}
        </div>
      </nav>
    </div>
  );
}

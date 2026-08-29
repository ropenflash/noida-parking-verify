"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { signInAsGuest, signInWithPassword } from "@/lib/actions/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AppLogo } from "@/components/app-logo";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}

function LoginForm() {
  const searchParams = useSearchParams();
  const [error, setError] = useState<string | null>(searchParams.get("error"));
  const [guestBusy, setGuestBusy] = useState(false);

  return (
    <Card className="mx-auto max-w-md">
      <CardHeader>
        <div className="mb-3 flex justify-center">
          <AppLogo size={56} priority />
        </div>
        <CardTitle className="text-center">Sign in</CardTitle>
      </CardHeader>
      <CardContent>
        <form
          className="space-y-3"
          action={async () => {
            setError(null);
            setGuestBusy(true);
            const result = await signInAsGuest();
            setGuestBusy(false);
            if (result?.error) setError(result.error);
          }}
        >
          <Button type="submit" className="h-12 w-full" disabled={guestBusy}>
            {guestBusy ? "Starting guest session…" : "Continue as guest"}
          </Button>
          <p className="text-xs text-zinc-600">
            No email required. Reports stay on this device until you create an account.
            Signing out or clearing the browser ends the guest session.
          </p>
        </form>
        <div className="my-5 flex items-center gap-3 text-xs uppercase tracking-wide text-zinc-400">
          <span className="h-px flex-1 bg-zinc-200" />
          or sign in
          <span className="h-px flex-1 bg-zinc-200" />
        </div>
        <form
          className="space-y-3"
          action={async (formData) => {
            const result = await signInWithPassword(formData);
            if (result?.error) setError(result.error);
          }}
        >
          <div className="space-y-1">
            <Label htmlFor="email">Email</Label>
            <Input id="email" name="email" type="email" required className="h-12" />
          </div>
          <div className="space-y-1">
            <Label htmlFor="password">Password</Label>
            <Input id="password" name="password" type="password" required className="h-12" />
          </div>
          {error ? <p className="text-sm text-red-700">{error}</p> : null}
          <Button type="submit" variant="outline" className="h-12 w-full">
            Sign in
          </Button>
        </form>
        <p className="mt-4 text-sm text-zinc-600">
          No account?{" "}
          <Link href="/signup" className="underline">
            Create one
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}

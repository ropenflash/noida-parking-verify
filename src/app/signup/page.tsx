"use client";

import { useState } from "react";
import Link from "next/link";
import { signUpWithPassword } from "@/lib/actions/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function SignupPage() {
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  return (
    <Card className="mx-auto max-w-md">
      <CardHeader>
        <CardTitle>Create account</CardTitle>
      </CardHeader>
      <CardContent>
        <form
          className="space-y-3"
          action={async (formData) => {
            const result = await signUpWithPassword(formData);
            if (result.error) setError(result.error);
            else setMessage(result.message ?? "Account created.");
          }}
        >
          <div className="space-y-1">
            <Label htmlFor="displayName">Display name</Label>
            <Input id="displayName" name="displayName" className="h-12" />
          </div>
          <div className="space-y-1">
            <Label htmlFor="email">Email</Label>
            <Input id="email" name="email" type="email" required className="h-12" />
          </div>
          <div className="space-y-1">
            <Label htmlFor="password">Password</Label>
            <Input id="password" name="password" type="password" required minLength={8} className="h-12" />
          </div>
          {error ? <p className="text-sm text-red-700">{error}</p> : null}
          {message ? <p className="text-sm text-emerald-800">{message}</p> : null}
          <Button type="submit" className="h-12 w-full">
            Sign up
          </Button>
        </form>
        <p className="mt-4 text-sm text-zinc-600">
          Already have an account?{" "}
          <Link href="/login" className="underline">
            Sign in
          </Link>
          {" · "}
          <Link href="/login" className="underline">
            Continue as guest
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}

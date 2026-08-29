"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function signInWithPassword(formData: FormData) {
  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return { error: error.message };
  redirect("/");
}

export async function signInAsGuest() {
  const supabase = await createClient();
  const { error } = await supabase.auth.signInAnonymously({
    options: { data: { display_name: "Guest" } },
  });
  if (error) return { error: error.message };
  redirect("/verify");
}

export async function signUpWithPassword(formData: FormData) {
  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");
  const displayName = String(formData.get("displayName") ?? "");
  const supabase = await createClient();
  const origin =
    process.env.NEXT_PUBLIC_SITE_URL ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : undefined);

  const { data: existing } = await supabase.auth.getUser();
  if (existing.user?.is_anonymous) {
    const { error } = await supabase.auth.updateUser({
      email,
      data: { display_name: displayName || "Guest" },
    });
    if (error) return { error: error.message };
    await supabase
      .from("profiles")
      .update({ display_name: displayName || existing.user.email || "Guest" })
      .eq("id", existing.user.id);
    return {
      error: null,
      message: "Check your email to confirm this guest session. After that you can set a password from the confirmation link.",
    };
  }

  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { display_name: displayName || undefined },
      emailRedirectTo: origin ? `${origin}/auth/callback` : undefined,
    },
  });
  if (error) return { error: error.message };
  return { error: null, message: "Check your email to confirm the account, then sign in." };
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}

import { createClient } from "@/lib/supabase/server";
import type { Profile, UserRole } from "@/lib/types";

export async function getSessionUser() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const sub = data?.claims?.sub;
  const isAnonymous = data?.claims?.is_anonymous === true;
  if (!sub || typeof sub !== "string") return { supabase, userId: null, profile: null };
  const { data: profile } = await supabase
    .from("profiles")
    .select("id, role, display_name")
    .eq("id", sub)
    .maybeSingle();
  const row = profile as { id: string; role: UserRole; display_name: string | null } | null;
  return {
    supabase,
    userId: sub,
    profile: {
      id: row?.id ?? sub,
      role: row?.role ?? ("USER" as UserRole),
      display_name: row?.display_name ?? (isAnonymous ? "Guest" : null),
      is_anonymous: isAnonymous,
    },
  };
}

export async function requireUser() {
  const session = await getSessionUser();
  if (!session.userId) {
    return { ...session, error: "Sign in to continue." as const };
  }
  return { ...session, error: null };
}

export { isStaff, isAdmin } from "@/lib/auth/roles";

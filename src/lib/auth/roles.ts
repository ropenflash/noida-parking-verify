import type { UserRole } from "@/lib/types";

export function isStaff(role: UserRole | null | undefined) {
  return role === "ADMIN" || role === "MODERATOR";
}

export function isAdmin(role: UserRole | null | undefined) {
  return role === "ADMIN";
}

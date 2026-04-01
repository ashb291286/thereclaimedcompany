import type { Session } from "next-auth";

/** Comma-separated emails in ADMIN_EMAILS (case-insensitive). */
export function isCarbonAdmin(session: Session | null): boolean {
  const email = session?.user?.email?.toLowerCase();
  if (!email) return false;
  const raw = process.env.ADMIN_EMAILS ?? "";
  const allowed = new Set(
    raw
      .split(",")
      .map((s) => s.trim().toLowerCase())
      .filter(Boolean)
  );
  return allowed.has(email);
}

/**
 * Returns a safe same-site path for post-auth redirects, or null if untrusted.
 * Only allows paths starting with "/" (no protocol, no "//" open redirects).
 */
export function safeInternalPath(raw: string | null | undefined): string | null {
  if (raw == null || typeof raw !== "string") return null;
  const t = raw.trim();
  if (!t.startsWith("/")) return null;
  if (t.startsWith("//")) return null;
  if (t.includes("://")) return null;
  if (/\s/.test(t)) return null;
  return t;
}

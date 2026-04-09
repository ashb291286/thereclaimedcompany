/**
 * Absolute origin (no trailing slash) for Stripe return URLs, JSON-LD, etc.
 * Handles empty env, NEXTAUTH_URL without scheme, and Vercel's VERCEL_URL (no scheme).
 */
export function getSiteBaseUrl(): string {
  const tryOne = (raw: string | undefined): string | null => {
    const t = raw?.trim();
    if (!t) return null;
    const variants = t.includes("://") ? [t] : [t, `https://${t}`];
    for (const v of variants) {
      try {
        const u = new URL(v);
        if (u.protocol === "http:" || u.protocol === "https:") {
          return `${u.protocol}//${u.host}`;
        }
      } catch {
        /* next variant */
      }
    }
    return null;
  };

  return (
    tryOne(process.env.NEXTAUTH_URL) ??
    tryOne(process.env.AUTH_URL) ??
    tryOne(process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : undefined) ??
    "http://localhost:3000"
  );
}

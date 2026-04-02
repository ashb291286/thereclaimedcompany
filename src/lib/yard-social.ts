import type { Prisma } from "@/generated/prisma/client";

export type YardSocialLinks = {
  instagram?: string;
  facebook?: string;
  x?: string;
  linkedin?: string;
  tiktok?: string;
};

function normalizeOptionalUrl(raw: string | null | undefined): string | null {
  const t = raw?.trim();
  if (!t) return null;
  if (/^https?:\/\//i.test(t)) return t;
  return `https://${t}`;
}

/** Build JSON for DB from dashboard form fields `social_instagram`, etc. */
export function yardSocialFromForm(formData: FormData): Prisma.InputJsonValue | undefined {
  const keys: (keyof YardSocialLinks)[] = ["instagram", "facebook", "x", "linkedin", "tiktok"];
  const out: YardSocialLinks = {};
  for (const k of keys) {
    const v = normalizeOptionalUrl(formData.get(`social_${k}`) as string | null);
    if (v) out[k] = v;
  }
  return Object.keys(out).length > 0 ? (out as unknown as Prisma.InputJsonValue) : undefined;
}

export function parseYardSocialJson(raw: unknown): YardSocialLinks {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {};
  const o = raw as Record<string, unknown>;
  const out: YardSocialLinks = {};
  for (const k of ["instagram", "facebook", "x", "linkedin", "tiktok"] as const) {
    const v = o[k];
    if (typeof v === "string" && v.trim()) out[k] = v.trim();
  }
  return out;
}

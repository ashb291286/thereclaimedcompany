export type YardDeliveryOptionsStored = {
  collection?: boolean;
  delivery?: boolean;
  radiusMiles?: number | null;
  minOrderGbp?: number | null;
  notes?: string | null;
};

export function parseYardDeliveryOptionsJson(raw: unknown): YardDeliveryOptionsStored | null {
  if (raw == null || typeof raw !== "object" || Array.isArray(raw)) return null;
  const o = raw as Record<string, unknown>;
  const out: YardDeliveryOptionsStored = {};
  if (typeof o.collection === "boolean") out.collection = o.collection;
  if (typeof o.delivery === "boolean") out.delivery = o.delivery;
  if (typeof o.radiusMiles === "number" && Number.isFinite(o.radiusMiles)) out.radiusMiles = o.radiusMiles;
  if (typeof o.minOrderGbp === "number" && Number.isFinite(o.minOrderGbp)) out.minOrderGbp = o.minOrderGbp;
  if (typeof o.notes === "string") out.notes = o.notes.trim() || null;
  if (
    out.collection === undefined &&
    out.delivery === undefined &&
    out.radiusMiles === undefined &&
    out.minOrderGbp === undefined &&
    (out.notes === undefined || out.notes === null)
  ) {
    return null;
  }
  return out;
}

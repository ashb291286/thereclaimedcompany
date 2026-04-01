/**
 * Preset UK delivery methods for listing forms.
 * Live “instant quote” APIs (Royal Mail, DPD, Evri, etc.) need merchant accounts,
 * parcel weight/dimensions, and destination postcode — not suitable to call blindly from a listing wizard.
 * Sellers enter indicative prices or leave blank for quote-on-request.
 */

export const DELIVERY_CARRIER_PRESETS = [
  { id: "royal_mail_tracked_24", label: "Royal Mail Tracked 24" },
  { id: "royal_mail_tracked_48", label: "Royal Mail Tracked 48" },
  { id: "evri", label: "Evri" },
  { id: "dpd", label: "DPD" },
  { id: "other", label: "Other (specify)" },
] as const;

export type DeliveryCarrierId = (typeof DELIVERY_CARRIER_PRESETS)[number]["id"];

const ALLOWED = new Set<string>(DELIVERY_CARRIER_PRESETS.map((p) => p.id));

export type DeliveryOptionStored = {
  carrier: DeliveryCarrierId;
  customLabel?: string;
  /** null = quote on request for this method */
  pricePence: number | null;
};

export function carrierLabel(id: string): string {
  const p = DELIVERY_CARRIER_PRESETS.find((x) => x.id === id);
  return p?.label ?? id;
}

export function parseDeliveryOptionsJson(
  rawJson: string,
  opts: { requireAtLeastOne: boolean }
): { ok: true; data: DeliveryOptionStored[] } | { ok: false; message: string } {
  let parsed: unknown;
  try {
    parsed = rawJson.trim() ? JSON.parse(rawJson) : [];
  } catch {
    return { ok: false, message: "Delivery options could not be read. Try again." };
  }
  if (!Array.isArray(parsed)) {
    return { ok: false, message: "Invalid delivery options format." };
  }
  if (opts.requireAtLeastOne && parsed.length === 0) {
    return {
      ok: false,
      message: "Select at least one delivery method, or choose collection only.",
    };
  }

  const out: DeliveryOptionStored[] = [];
  for (const row of parsed) {
    if (!row || typeof row !== "object") continue;
    const carrier = (row as { carrier?: string }).carrier;
    if (!carrier || !ALLOWED.has(carrier)) {
      return { ok: false, message: "Unknown delivery method in form." };
    }
    const customLabel = ((row as { customLabel?: string }).customLabel ?? "").trim();
    if (carrier === "other" && !customLabel) {
      return { ok: false, message: "Add a name for “Other” delivery (e.g. pallet courier)." };
    }
    const priceRaw = (row as { pricePence?: unknown }).pricePence;
    let pricePence: number | null = null;
    if (priceRaw === null || priceRaw === undefined) {
      pricePence = null;
    } else if (typeof priceRaw === "number" && Number.isFinite(priceRaw) && priceRaw >= 0) {
      pricePence = Math.round(priceRaw);
    } else {
      return { ok: false, message: "Each delivery price must be a valid amount or left blank for quote." };
    }
    out.push({
      carrier: carrier as DeliveryCarrierId,
      ...(carrier === "other" ? { customLabel } : {}),
      pricePence,
    });
  }

  if (opts.requireAtLeastOne && out.length === 0) {
    return {
      ok: false,
      message: "Select at least one delivery method, or choose collection only.",
    };
  }

  return { ok: true, data: out };
}

/** Lowest fixed price across options, for summaries / legacy display; null if all quote. */
export function minDeliveryPricePence(options: DeliveryOptionStored[]): number | null {
  const fixed = options.map((o) => o.pricePence).filter((p): p is number => p != null);
  if (fixed.length === 0) return null;
  return Math.min(...fixed);
}

export function formatDeliveryOptionLine(o: DeliveryOptionStored): string {
  const name =
    o.carrier === "other" && o.customLabel ? o.customLabel : carrierLabel(o.carrier);
  if (o.pricePence != null) {
    return `${name} — from £${(o.pricePence / 100).toFixed(2)}`;
  }
  return `${name} — quote on request`;
}

/** Client form row per preset carrier */
export type CarrierFormRow = { enabled: boolean; priceStr: string; customLabel: string };

export function emptyCarrierForm(): Record<DeliveryCarrierId, CarrierFormRow> {
  const base = {} as Record<DeliveryCarrierId, CarrierFormRow>;
  for (const p of DELIVERY_CARRIER_PRESETS) {
    base[p.id] = { enabled: false, priceStr: "", customLabel: "" };
  }
  return base;
}

export function hydrateCarrierForm(raw: unknown): Record<DeliveryCarrierId, CarrierFormRow> {
  const base = emptyCarrierForm();
  if (!raw || !Array.isArray(raw)) return base;
  for (const row of raw) {
    if (!row || typeof row !== "object" || !("carrier" in row)) continue;
    const carrier = (row as DeliveryOptionStored).carrier;
    if (!(carrier in base)) continue;
    const pricePence = (row as DeliveryOptionStored).pricePence;
    base[carrier] = {
      enabled: true,
      priceStr: pricePence != null ? (pricePence / 100).toFixed(2) : "",
      customLabel:
        carrier === "other"
          ? String((row as { customLabel?: string }).customLabel ?? "").trim()
          : "",
    };
  }
  return base;
}

export function serializeCarrierForm(
  r: Record<DeliveryCarrierId, CarrierFormRow>
): DeliveryOptionStored[] {
  const out: DeliveryOptionStored[] = [];
  for (const p of DELIVERY_CARRIER_PRESETS) {
    const row = r[p.id];
    if (!row?.enabled) continue;
    let pricePence: number | null = null;
    const t = row.priceStr.trim();
    if (t !== "") {
      const pounds = parseFloat(t);
      if (!Number.isNaN(pounds) && pounds >= 0) pricePence = Math.round(pounds * 100);
    }
    if (p.id === "other") {
      out.push({
        carrier: "other",
        customLabel: row.customLabel.trim(),
        pricePence,
      });
    } else {
      out.push({ carrier: p.id, pricePence });
    }
  }
  return out;
}

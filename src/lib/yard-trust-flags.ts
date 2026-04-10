export type YardTrustFlagsStored = {
  familyRun?: boolean;
  tradeCounter?: boolean;
  delivery?: boolean;
  onsiteParking?: boolean;
  inspectionWelcome?: boolean;
};

const KEYS = ["familyRun", "tradeCounter", "delivery", "onsiteParking", "inspectionWelcome"] as const;

export function parseYardTrustFlagsJson(raw: unknown): YardTrustFlagsStored {
  if (raw == null || typeof raw !== "object" || Array.isArray(raw)) return {};
  const o = raw as Record<string, unknown>;
  const out: YardTrustFlagsStored = {};
  for (const k of KEYS) {
    if (typeof o[k] === "boolean") out[k] = o[k];
  }
  return out;
}

export const YARD_TRUST_FLAG_LABELS: Record<(typeof KEYS)[number], string> = {
  familyRun: "Family run",
  tradeCounter: "Trade counter",
  delivery: "Delivery available",
  onsiteParking: "On-site parking",
  inspectionWelcome: "Inspections welcome",
};

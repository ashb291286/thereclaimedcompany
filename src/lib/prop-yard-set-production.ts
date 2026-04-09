import type { PropRentalSetProductionType } from "@/generated/prisma/client";

export const PROP_SET_PRODUCTION_OPTIONS = [
  { value: "FEATURE_FILM", label: "Feature film" },
  { value: "TELEVISION_STREAMING", label: "Television / streaming" },
  { value: "COMMERCIAL", label: "Commercial / advertising" },
  { value: "MUSIC_VIDEO", label: "Music video" },
  { value: "THEATRE_STAGE", label: "Theatre / stage" },
  { value: "DOCUMENTARY_FACTUAL", label: "Documentary / factual" },
  { value: "STILLS_EDITORIAL", label: "Stills / editorial" },
  { value: "EVENT_EXHIBITION", label: "Event / exhibition" },
  { value: "OTHER", label: "Other" },
] as const satisfies readonly { value: PropRentalSetProductionType; label: string }[];

const VALUE_SET = new Set<string>(PROP_SET_PRODUCTION_OPTIONS.map((o) => o.value));

export function parsePropSetProductionType(raw: string): PropRentalSetProductionType | null {
  const t = raw.trim();
  return VALUE_SET.has(t) ? (t as PropRentalSetProductionType) : null;
}

export function labelForPropSetProductionType(
  value: PropRentalSetProductionType | string | null | undefined
): string | null {
  if (value == null) return null;
  const row = PROP_SET_PRODUCTION_OPTIONS.find((o) => o.value === value);
  return row?.label ?? null;
}

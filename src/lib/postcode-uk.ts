/**
 * UK postcode geocoding via postcodes.io (free, no API key).
 * @see https://postcodes.io/docs
 */

const POSTCODES_IO = "https://api.postcodes.io";

/** Identify our app in line with postcodes.io fair-use guidance. */
const UA = "ReclaimedMarketplace/1.0 (seller listings; contact via site)";

export type UkPostcodeLookup = {
  postcode: string;
  lat: number;
  lng: number;
  adminDistrict: string | null;
  adminCounty: string | null;
  region: string | null;
  parish: string | null;
};

type PostcodesIoResultRow = {
  postcode: string;
  latitude: number;
  longitude: number;
  admin_district?: string | null;
  admin_county?: string | null;
  region?: string | null;
  parish?: string | null;
};

type PostcodesIoSingle = {
  status: number;
  result?: PostcodesIoResultRow;
};

type PostcodesIoQuery = {
  status: number;
  result?: PostcodesIoResultRow[];
};

function mapResult(r: PostcodesIoResultRow): UkPostcodeLookup {
  return {
    postcode: r.postcode,
    lat: r.latitude,
    lng: r.longitude,
    adminDistrict: r.admin_district ?? null,
    adminCounty: r.admin_county ?? null,
    region: r.region ?? null,
    parish: r.parish ?? null,
  };
}

/** Normalise for comparison / storage (compact uppercase, no spaces). */
export function compactUkPostcode(raw: string): string {
  return raw.trim().toUpperCase().replace(/\s+/g, "");
}

/**
 * Resolve a full UK postcode to coordinates and administrative labels.
 */
export async function lookupUkPostcode(raw: string): Promise<UkPostcodeLookup | null> {
  const compact = compactUkPostcode(raw);
  if (compact.length < 5 || compact.length > 8) return null;

  const res = await fetch(`${POSTCODES_IO}/postcodes/${encodeURIComponent(compact)}`, {
    headers: { Accept: "application/json", "User-Agent": UA },
    next: { revalidate: 86_400 },
  });

  if (!res.ok) return null;
  const body = (await res.json()) as PostcodesIoSingle;
  if (body.status !== 200 || !body.result) return null;
  return mapResult(body.result);
}

export type UkPostcodeSuggestion = {
  postcode: string;
  adminDistrict: string | null;
  region: string | null;
};

/**
 * Autocomplete / partial search (postcodes.io query endpoint).
 */
export async function suggestUkPostcodes(query: string, limit = 8): Promise<UkPostcodeSuggestion[]> {
  const q = query.trim();
  if (q.length < 2) return [];

  const res = await fetch(
    `${POSTCODES_IO}/postcodes?q=${encodeURIComponent(q)}&limit=${limit}`,
    {
      headers: { Accept: "application/json", "User-Agent": UA },
      cache: "no-store",
    }
  );

  if (!res.ok) return [];
  const body = (await res.json()) as PostcodesIoQuery;
  if (body.status !== 200 || !Array.isArray(body.result)) return [];

  return body.result.map((r) => ({
    postcode: r.postcode,
    adminDistrict: r.admin_district ?? null,
    region: r.region ?? null,
  }));
}

/** Human-readable area line for UI, e.g. "Westminster · London". */
export function formatUkAreaLine(lookup: Pick<UkPostcodeLookup, "adminDistrict" | "region">): string {
  const parts = [lookup.adminDistrict, lookup.region].filter(Boolean);
  return parts.join(" · ");
}

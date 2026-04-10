import type { DayKey, WeeklyOpeningHours } from "@/lib/opening-hours";
import { DAY_ORDER } from "@/lib/opening-hours";
import { getSiteBaseUrl } from "@/lib/site-url";

const SCHEMA_DAY: Record<DayKey, string> = {
  mon: "https://schema.org/Monday",
  tue: "https://schema.org/Tuesday",
  wed: "https://schema.org/Wednesday",
  thu: "https://schema.org/Thursday",
  fri: "https://schema.org/Friday",
  sat: "https://schema.org/Saturday",
  sun: "https://schema.org/Sunday",
};

export type YardListingJsonLdSlice = {
  id: string;
  title: string;
  url: string;
  pricePence: number;
};

function openingHoursSpec(weekly: WeeklyOpeningHours | null | undefined): object[] {
  const openingHoursSpecification: object[] = [];
  if (!weekly) return openingHoursSpecification;
  for (const day of DAY_ORDER) {
    const d = weekly[day];
    if (d.closed) continue;
    openingHoursSpecification.push({
      "@type": "OpeningHoursSpecification",
      dayOfWeek: SCHEMA_DAY[day],
      opens: d.open,
      closes: d.close,
    });
  }
  return openingHoursSpecification;
}

/** LocalBusiness JSON-LD with geo, locality, and optional offer catalog (bounded listings). */
export function buildYardLocalBusinessJsonLd(input: {
  name: string;
  description?: string | null;
  url: string;
  postcode?: string | null;
  addressLocality?: string | null;
  geo?: { lat: number; lng: number } | null;
  logoUrl?: string | null;
  imageUrl?: string | null;
  telephone?: string | null;
  email?: string | null;
  sameAs?: string[];
  openingHoursWeekly?: WeeklyOpeningHours | null;
  /** Max ~10 recommended for HTML size. */
  catalogListings?: YardListingJsonLdSlice[];
  /** Optional extra Product nodes (same bounded listings). */
  includeProductNodes?: boolean;
}): Record<string, unknown> {
  const openingHoursSpecification = openingHoursSpec(input.openingHoursWeekly ?? null);

  const address: Record<string, unknown> = {
    "@type": "PostalAddress",
    addressCountry: "GB",
  };
  if (input.postcode?.trim()) address.postalCode = input.postcode.trim();
  if (input.addressLocality?.trim()) address.addressLocality = input.addressLocality.trim();

  const node: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "LocalBusiness",
    name: input.name,
    url: input.url,
    address,
  };
  if (input.description?.trim()) node.description = input.description.trim();
  if (input.geo && Number.isFinite(input.geo.lat) && Number.isFinite(input.geo.lng)) {
    node.geo = {
      "@type": "GeoCoordinates",
      latitude: input.geo.lat,
      longitude: input.geo.lng,
    };
  }
  if (input.logoUrl) node.logo = input.logoUrl;
  if (input.imageUrl) node.image = input.imageUrl;
  if (input.telephone?.trim()) node.telephone = input.telephone.trim();
  if (input.email?.trim()) node.email = input.email.trim();
  if (input.sameAs?.length) node.sameAs = input.sameAs;
  if (openingHoursSpecification.length) node.openingHoursSpecification = openingHoursSpecification;

  const listings = (input.catalogListings ?? []).slice(0, 10);
  if (listings.length > 0) {
    node.hasOfferCatalog = {
      "@type": "OfferCatalog",
      itemListElement: listings.map((l, i) => ({
        "@type": "ListItem",
        position: i + 1,
        item: {
          "@type": "Offer",
          name: l.title,
          url: l.url,
          price: (l.pricePence / 100).toFixed(2),
          priceCurrency: "GBP",
        },
      })),
    };
  }

  if (input.includeProductNodes && listings.length > 0) {
    const products = listings.map((l) => ({
      "@type": "Product",
      name: l.title,
      url: l.url,
      offers: {
        "@type": "Offer",
        url: l.url,
        priceCurrency: "GBP",
        price: (l.pricePence / 100).toFixed(2),
      },
    }));
    return {
      "@context": "https://schema.org",
      "@graph": [node, ...products],
    };
  }

  return node;
}

/** @deprecated Prefer buildYardLocalBusinessJsonLd — kept for imports that expect Store-shaped data. */
export function buildYardStoreJsonLd(input: {
  name: string;
  description?: string | null;
  url: string;
  postcode?: string | null;
  logoUrl?: string | null;
  imageUrl?: string | null;
  telephone?: string | null;
  email?: string | null;
  sameAs?: string[];
  openingHoursWeekly?: WeeklyOpeningHours | null;
}): Record<string, unknown> {
  return buildYardLocalBusinessJsonLd({
    ...input,
    addressLocality: null,
    geo: null,
    catalogListings: undefined,
    includeProductNodes: false,
  });
}

export function getSiteUrl(): string {
  return getSiteBaseUrl();
}

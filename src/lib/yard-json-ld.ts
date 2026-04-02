import type { DayKey, WeeklyOpeningHours } from "@/lib/opening-hours";
import { DAY_ORDER } from "@/lib/opening-hours";

const SCHEMA_DAY: Record<DayKey, string> = {
  mon: "https://schema.org/Monday",
  tue: "https://schema.org/Tuesday",
  wed: "https://schema.org/Wednesday",
  thu: "https://schema.org/Thursday",
  fri: "https://schema.org/Friday",
  sat: "https://schema.org/Saturday",
  sun: "https://schema.org/Sunday",
};

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
  const openingHoursSpecification: object[] = [];
  if (input.openingHoursWeekly) {
    for (const day of DAY_ORDER) {
      const d = input.openingHoursWeekly[day];
      if (d.closed) continue;
      openingHoursSpecification.push({
        "@type": "OpeningHoursSpecification",
        dayOfWeek: SCHEMA_DAY[day],
        opens: d.open,
        closes: d.close,
      });
    }
  }

  const node: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "Store",
    name: input.name,
    url: input.url,
  };
  if (input.description?.trim()) node.description = input.description.trim();
  if (input.postcode?.trim()) {
    node.address = {
      "@type": "PostalAddress",
      postalCode: input.postcode.trim(),
      addressCountry: "GB",
    };
  }
  if (input.logoUrl) node.logo = input.logoUrl;
  if (input.imageUrl) node.image = input.imageUrl;
  if (input.telephone?.trim()) node.telephone = input.telephone.trim();
  if (input.email?.trim()) node.email = input.email.trim();
  if (input.sameAs?.length) node.sameAs = input.sameAs;
  if (openingHoursSpecification.length) node.openingHoursSpecification = openingHoursSpecification;

  return node;
}

export function getSiteUrl(): string {
  return process.env.NEXTAUTH_URL?.replace(/\/$/, "") ?? "http://localhost:3000";
}

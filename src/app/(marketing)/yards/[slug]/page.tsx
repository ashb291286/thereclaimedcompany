import { prisma } from "@/lib/db";
import { notFound } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import type { Metadata } from "next";
import { auth } from "@/auth";
import { OpeningHoursBlock } from "@/components/OpeningHoursBlock";
import { buildYardLocalBusinessJsonLd, getSiteUrl } from "@/lib/yard-json-ld";
import { openingHoursCompactLine, scheduleFromDbField } from "@/lib/opening-hours";
import { parseYardSocialJson } from "@/lib/yard-social";
import { formatUkLocationLine } from "@/lib/postcode-uk";
import { yardPublicHeadings } from "@/lib/yard-seo-headings";
import { parseYardTrustFlagsJson, YARD_TRUST_FLAG_LABELS } from "@/lib/yard-trust-flags";
import { parseYardDeliveryOptionsJson } from "@/lib/yard-delivery-options";
import { findRelatedYardProfiles } from "@/lib/related-yards";
import {
  YardEnquiryFormIsland,
  YardRecentStrip,
  YardStockAlertToggle,
  YardStockIsland,
  YardWhyBuySection,
  type YardListingCard,
} from "@/components/yards/yard-page-client";
import { YardMaterialPillsSection, YardRelatedYardsSection } from "@/components/yards/yard-material-and-related";

export const revalidate = 900;

type Props = { params: Promise<{ slug: string }> };
const DEFAULT_YARD_HEADER_IMAGE_PATH = "/images/yard-header-default.png";

function formatUpdatedAgo(d: Date): string {
  const s = Math.floor((Date.now() - d.getTime()) / 1000);
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.floor(s / 60)} min ago`;
  if (s < 86400) return `${Math.floor(s / 3600)} h ago`;
  return `${Math.floor(s / 86400)} d ago`;
}

function waMeUrl(digits: string): string | null {
  const d = digits.replace(/\D/g, "");
  if (d.length < 10) return null;
  return `https://wa.me/${d}`;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const profile = await prisma.sellerProfile.findUnique({
    where: { yardSlug: slug },
    select: {
      displayName: true,
      businessName: true,
      postcode: true,
      adminDistrict: true,
      region: true,
      postcodeLocality: true,
      yardTagline: true,
      yardAbout: true,
      yardLogoUrl: true,
      yardHeaderImageUrl: true,
      importedByAdmin: true,
      claimCode: true,
    },
  });
  if (!profile) return { title: "Yard not found" };

  const titleName = profile.businessName?.trim() || profile.displayName;
  const place = formatUkLocationLine({
    postcodeLocality: profile.postcodeLocality,
    adminDistrict: profile.adminDistrict,
    region: profile.region,
    postcode: profile.postcode,
  });
  const title = `${titleName} | Reclamation yard${place ? ` · ${place}` : ""} | Reclaimed Marketplace`;
  const descSource =
    profile.yardAbout?.trim() ||
    profile.yardTagline?.trim() ||
    `${titleName} sells reclaimed and salvage materials${place ? ` near ${place}` : ""}. Browse live stock on Reclaimed Marketplace.`;
  const description = descSource.slice(0, 158);
  const base = getSiteUrl();
  const url = `${base}/yards/${slug}`;
  const defaultHeaderAbsoluteUrl = `${base}${DEFAULT_YARD_HEADER_IMAGE_PATH}`;
  const ogImage = profile.yardHeaderImageUrl || profile.yardLogoUrl || defaultHeaderAbsoluteUrl;
  const ogImages = [ogImage];

  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: {
      type: "website",
      url,
      title,
      description,
      siteName: "Reclaimed Marketplace",
      images: ogImages,
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: ogImages,
    },
    robots: { index: true, follow: true },
  };
}

export default async function YardPublicPage({ params }: Props) {
  const { slug } = await params;
  const session = await auth();

  const profile = await prisma.sellerProfile.findUnique({
    where: { yardSlug: slug },
    include: {
      user: {
        include: {
          listings: {
            where: { status: "active", visibleOnMarketplace: true },
            orderBy: { updatedAt: "desc" },
            include: { category: true },
          },
        },
      },
    },
  });

  if (!profile || profile.user.role !== "reclamation_yard") notFound();

  const seller = profile.user;
  const listings = seller.listings;
  const displayTitle = profile.businessName?.trim() || profile.displayName;
  const { h1, h2 } = yardPublicHeadings({
    businessName: profile.businessName,
    displayName: profile.displayName,
    postcodeLocality: profile.postcodeLocality,
    adminDistrict: profile.adminDistrict,
    region: profile.region,
    primaryMaterials: profile.yardPrimaryMaterials ?? [],
  });

  const placeLine = formatUkLocationLine({
    postcodeLocality: profile.postcodeLocality,
    adminDistrict: profile.adminDistrict,
    region: profile.region,
    postcode: profile.postcode,
  });

  const social = parseYardSocialJson(profile.yardSocialJson);
  const sameAs = [
    social.instagram,
    social.facebook,
    social.x,
    social.linkedin,
    social.tiktok,
    profile.yardWebsiteUrl,
  ].filter((u): u is string => Boolean(u?.trim()));

  const base = getSiteUrl();
  const pageUrl = `${base}/yards/${slug}`;
  const fallbackHeaderImageUrl = `${base}${DEFAULT_YARD_HEADER_IMAGE_PATH}`;
  const heroImageUrl = profile.yardHeaderImageUrl || DEFAULT_YARD_HEADER_IMAGE_PATH;
  const schedule = scheduleFromDbField(profile.openingHoursSchedule);

  const trust = parseYardTrustFlagsJson(profile.yardTrustFlagsJson);
  const trustPills: string[] = [];
  for (const key of Object.keys(YARD_TRUST_FLAG_LABELS) as (keyof typeof YARD_TRUST_FLAG_LABELS)[]) {
    if (trust[key]) trustPills.push(YARD_TRUST_FLAG_LABELS[key]);
  }
  if (profile.yardCustomTrustLine?.trim()) trustPills.unshift(profile.yardCustomTrustLine.trim());

  const delivery = parseYardDeliveryOptionsJson(profile.yardDeliveryOptionsJson);
  const addressLocality =
    profile.postcodeLocality?.trim() || profile.adminDistrict?.trim() || null;

  const catalogSlice = listings.slice(0, 10).map((l) => ({
    id: l.id,
    title: l.title,
    url: `${base}/listings/${l.id}`,
    pricePence: l.price,
  }));

  const jsonLd = buildYardLocalBusinessJsonLd({
    name: displayTitle,
    description: profile.yardAbout ?? profile.yardTagline,
    url: pageUrl,
    postcode: profile.postcode,
    addressLocality,
    geo:
      profile.lat != null && profile.lng != null
        ? { lat: profile.lat, lng: profile.lng }
        : null,
    logoUrl: profile.yardLogoUrl,
    imageUrl: profile.yardHeaderImageUrl || profile.yardLogoUrl || fallbackHeaderImageUrl,
    telephone: profile.yardContactPhone,
    email: profile.yardContactEmail,
    sameAs: sameAs.length ? sameAs : undefined,
    openingHoursWeekly: schedule,
    catalogListings: catalogSlice,
    includeProductNodes: true,
  });

  const socialLabel: Record<string, string> = {
    instagram: "Instagram",
    facebook: "Facebook",
    x: "X",
    linkedin: "LinkedIn",
    tiktok: "TikTok",
  };

  const listingCards: YardListingCard[] = listings.map((l) => ({
    id: l.id,
    title: l.title,
    price: l.price,
    listingKind: l.listingKind,
    condition: l.condition,
    categoryId: l.categoryId,
    categoryName: l.category.name,
    image: l.images[0] ?? null,
    createdAt: l.createdAt.toISOString(),
    updatedAt: l.updatedAt.toISOString(),
  }));

  const stockUpdated = listings.reduce<Date | null>(
    (acc, l) => (!acc || l.updatedAt > acc ? l.updatedAt : acc),
    null
  );

  const catMap = new Map<string, { id: string; name: string; slug: string }>();
  for (const l of listings) {
    catMap.set(l.category.id, { id: l.category.id, name: l.category.name, slug: l.category.slug });
  }
  const distinctCategories = Array.from(catMap.values());

  const freq = new Map<string, number>();
  for (const l of listings) freq.set(l.categoryId, (freq.get(l.categoryId) ?? 0) + 1);
  const topCategoryIds = Array.from(freq.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([id]) => id);

  const related = await findRelatedYardProfiles({
    excludeSlug: slug,
    originLat: profile.lat,
    originLng: profile.lng,
    region: profile.region,
    topCategoryIds,
    take: 10,
  });

  const viewerId = session?.user?.id ?? null;
  let hasStockAlert = false;
  if (viewerId && viewerId !== seller.id) {
    const alert = await prisma.yardStockAlert.findFirst({
      where: { userId: viewerId, sellerId: seller.id, categoryId: null },
    });
    hasStockAlert = Boolean(alert);
  }

  const waUrl = profile.yardWhatsApp ? waMeUrl(profile.yardWhatsApp) : null;
  const mapsUrl =
    profile.lat != null && profile.lng != null
      ? `https://www.google.com/maps?q=${profile.lat},${profile.lng}`
      : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(profile.postcode)}`;

  const hoursSummary = openingHoursCompactLine(schedule, profile.openingHours);

  const tradeLabel =
    profile.yardTradePublic === "trade"
      ? "Trade welcome"
      : profile.yardTradePublic === "public"
        ? "Open to the public"
        : profile.yardTradePublic === "both"
          ? "Trade & public welcome"
          : null;

  return (
    <article className="pb-16">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <div className="relative -mx-4 mb-8 h-[min(38vh,420px)] bg-zinc-900 sm:-mx-0 sm:overflow-hidden sm:rounded-2xl">
        <Image
          src={heroImageUrl}
          alt={`${displayTitle} — reclamation yard`}
          fill
          priority
          className="object-cover opacity-95"
          sizes="100vw"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/25 to-transparent" />
        <div className="absolute bottom-0 left-0 right-0 p-6 sm:p-8">
          <div className="mx-auto flex w-full max-w-6xl flex-col gap-4 px-4 sm:flex-row sm:items-end sm:justify-between sm:px-6">
            <div className="flex items-end gap-4">
              {profile.yardLogoUrl ? (
                <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-2xl border border-white/20 bg-white shadow-xl sm:h-24 sm:w-24">
                  <Image
                    src={profile.yardLogoUrl}
                    alt={`${displayTitle} logo`}
                    width={96}
                    height={96}
                    className="h-full w-full object-contain p-1"
                    priority
                  />
                </div>
              ) : null}
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-emerald-200/95">
                  Reclamation yard
                </p>
                {profile.salvoCodeMember ? (
                  <p className="mt-1 inline-flex rounded-full border border-emerald-200/70 bg-emerald-100/90 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-emerald-900">
                    Salvo Code Member
                  </p>
                ) : null}
                <h1 className="mt-1 text-2xl font-semibold tracking-tight text-white sm:text-3xl">{h1}</h1>
                <p className="mt-1 max-w-xl text-sm font-medium text-zinc-100">{h2}</p>
                {profile.yardTagline?.trim() ? (
                  <p className="mt-2 max-w-xl text-sm leading-relaxed text-zinc-200">{profile.yardTagline.trim()}</p>
                ) : null}
              </div>
            </div>
            <div className="flex shrink-0 flex-col gap-2 text-sm">
              <p className="font-medium text-white">{placeLine || "UK"}</p>
              <p className="text-zinc-300">{profile.postcode}</p>
              <div className="flex flex-wrap gap-2 pt-1">
                <a
                  href="#stock"
                  className="rounded-lg bg-white/15 px-3 py-1.5 font-medium text-white backdrop-blur hover:bg-white/25"
                >
                  View stock
                </a>
                <YardStockAlertToggle
                  sellerId={seller.id}
                  sellerPath={`/yards/${slug}`}
                  viewerId={viewerId}
                  hasAlert={hasStockAlert}
                  label="Favourite yard"
                  stopLabel="Unfavourite yard"
                />
                {profile.yardContactPhone ? (
                  <a
                    href={`tel:${profile.yardContactPhone.replace(/\s+/g, "")}`}
                    className="rounded-lg bg-white/15 px-3 py-1.5 font-medium text-white backdrop-blur hover:bg-white/25"
                  >
                    Call
                  </a>
                ) : null}
                <a
                  href="#enquiry"
                  className="rounded-lg bg-brand px-3 py-1.5 font-medium text-white hover:bg-brand-hover"
                >
                  Enquire
                </a>
                {waUrl ? (
                  <a
                    href={waUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="rounded-lg bg-white/15 px-3 py-1.5 font-medium text-white backdrop-blur hover:bg-white/25"
                  >
                    WhatsApp
                  </a>
                ) : null}
              </div>
              {profile.importedByAdmin && profile.claimCode ? (
                <Link
                  href={`/claim-profile?sellerProfileId=${profile.id}`}
                  className="mt-2 inline-block text-xs text-zinc-200 underline decoration-zinc-300/80 underline-offset-2 hover:text-white"
                >
                  Own this yard? Claim this profile
                </Link>
              ) : null}
            </div>
          </div>
        </div>
      </div>

      {trustPills.length > 0 ? (
        <div className="mx-auto mb-8 flex w-full max-w-6xl gap-2 overflow-x-auto px-4 pb-1 sm:px-6">
          {trustPills.map((pill) => (
            <span
              key={pill}
              className="shrink-0 rounded-full border border-zinc-200 bg-white px-3 py-1 text-xs font-medium text-zinc-800 shadow-sm"
            >
              {pill}
            </span>
          ))}
        </div>
      ) : null}

      <div className="mx-auto grid w-full max-w-6xl gap-8 px-4 sm:px-6 lg:grid-cols-[1fr_360px]">
        <div className="min-w-0 space-y-10">
          <section aria-labelledby="about-heading">
            <h2 id="about-heading" className="text-lg font-semibold text-zinc-900">
              About this yard
            </h2>
            {profile.yardAbout?.trim() ? (
              <div className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-zinc-700">
                {profile.yardAbout.trim()}
              </div>
            ) : (
              <p className="mt-3 text-sm leading-relaxed text-zinc-600">
                Browse live listings from this reclamation yard. Materials are listed by the yard on Reclaimed
                Marketplace — ideal for builders, restorers, and salvage hunters across the UK.
              </p>
            )}
          </section>

          <YardStockIsland listings={listingCards} yardPostcode={profile.postcode} />

          <YardWhyBuySection customLine={profile.yardCustomTrustLine} />

          <YardRecentStrip listings={listingCards} />

          <YardMaterialPillsSection categories={distinctCategories} yardPostcode={profile.postcode} />

          <section id="enquiry" className="scroll-mt-24 space-y-4">
            <h2 className="text-lg font-semibold text-zinc-900">Get in touch</h2>
            <YardEnquiryFormIsland
              yardUserId={seller.id}
              yardSlug={slug}
              defaultName={session?.user?.name?.trim() ?? ""}
              defaultEmail={session?.user?.email ?? ""}
              responseTimeNote={profile.yardResponseTimeNote}
            />
          </section>

          <YardRelatedYardsSection yards={related} />
        </div>

        <aside className="space-y-6 lg:sticky lg:top-24 lg:self-start">
          <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
            <h2 className="text-sm font-semibold text-zinc-900">Meet the yard</h2>
            <ul className="mt-3 space-y-2 text-sm text-zinc-700">
              <li>
                <span className="font-medium text-zinc-800">On Reclaimed since:</span>{" "}
                {seller.createdAt.toLocaleDateString("en-GB", { dateStyle: "medium" })}
              </li>
              {profile.yearEstablished ? (
                <li>
                  <span className="font-medium text-zinc-800">Established:</span> {profile.yearEstablished}
                </li>
              ) : null}
              {profile.salvoCodeMember ? (
                <li>
                  <span className="font-medium text-zinc-800">Salvo:</span> Salvo Code Member
                </li>
              ) : null}
              {tradeLabel ? (
                <li>
                  <span className="font-medium text-zinc-800">Visitors:</span> {tradeLabel}
                </li>
              ) : null}
              {hoursSummary ? (
                <li>
                  <span className="font-medium text-zinc-800">Hours:</span> {hoursSummary}
                </li>
              ) : null}
              {delivery ? (
                <li>
                  <span className="font-medium text-zinc-800">Fulfillment:</span>{" "}
                  {[
                    delivery.collection ? "Collection" : null,
                    delivery.delivery ? "Delivery" : null,
                    delivery.radiusMiles != null ? `within ~${delivery.radiusMiles} mi` : null,
                    delivery.minOrderGbp != null ? `from £${delivery.minOrderGbp} min order` : null,
                  ]
                    .filter(Boolean)
                    .join(" · ") || "—"}
                </li>
              ) : null}
              {profile.yardServiceAreas?.trim() ? (
                <li>
                  <span className="font-medium text-zinc-800">Areas served:</span> {profile.yardServiceAreas.trim()}
                </li>
              ) : null}
              {stockUpdated ? (
                <li>
                  <span className="font-medium text-zinc-800">Stock updated:</span> {formatUpdatedAgo(stockUpdated)}
                </li>
              ) : null}
            </ul>
            <div className="mt-4 flex flex-wrap gap-2">
              <a
                href={mapsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex rounded-lg border border-zinc-300 bg-white px-3 py-1.5 text-sm font-medium text-zinc-800 hover:bg-zinc-50"
              >
                Open in Google Maps
              </a>
              {profile.lat != null && profile.lng != null ? (
                <a
                  href={`https://waze.com/ul?ll=${profile.lat},${profile.lng}&navigate=yes`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex rounded-lg border border-zinc-300 bg-white px-3 py-1.5 text-sm font-medium text-zinc-800 hover:bg-zinc-50"
                >
                  Open in Waze
                </a>
              ) : null}
            </div>
          </div>

          <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
            <OpeningHoursBlock
              id="opening-hours"
              scheduleJson={profile.openingHoursSchedule}
              legacyText={profile.openingHours}
              showOpenNowBadge
            />
          </div>

          {(profile.yardContactEmail ||
            profile.yardContactPhone ||
            profile.yardWebsiteUrl ||
            Object.keys(social).length > 0) && (
            <section className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
              <h2 className="text-sm font-semibold text-zinc-900">Contact</h2>
              <ul className="mt-3 space-y-2 text-sm">
                {profile.yardContactEmail ? (
                  <li>
                    <a className="font-medium text-brand hover:underline" href={`mailto:${profile.yardContactEmail}`}>
                      {profile.yardContactEmail}
                    </a>
                  </li>
                ) : null}
                {profile.yardContactPhone ? (
                  <li>
                    <a
                      className="font-medium text-brand hover:underline"
                      href={`tel:${profile.yardContactPhone.replace(/\s+/g, "")}`}
                    >
                      {profile.yardContactPhone}
                    </a>
                  </li>
                ) : null}
                {profile.yardWebsiteUrl ? (
                  <li>
                    <a
                      className="font-medium text-brand hover:underline"
                      href={profile.yardWebsiteUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      Website
                    </a>
                  </li>
                ) : null}
                {(["instagram", "facebook", "x", "linkedin", "tiktok"] as const).map((key) => {
                  const url = social[key];
                  if (!url) return null;
                  return (
                    <li key={key}>
                      <a
                        className="font-medium text-brand hover:underline"
                        href={url}
                        target="_blank"
                        rel="noopener noreferrer me"
                      >
                        {socialLabel[key]}
                      </a>
                    </li>
                  );
                })}
              </ul>
            </section>
          )}

          <p className="text-xs text-zinc-500">
            Listed on{" "}
            <Link href="/" className="text-brand hover:underline">
              Reclaimed Marketplace
            </Link>
            . Availability and pricing are set by the yard.
          </p>
        </aside>
      </div>
    </article>
  );
}

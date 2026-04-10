import { prisma } from "@/lib/db";
import { notFound } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import type { Metadata } from "next";
import { CONDITION_LABELS } from "@/lib/constants";
import { OpeningHoursBlock } from "@/components/OpeningHoursBlock";
import { buildYardStoreJsonLd, getSiteUrl } from "@/lib/yard-json-ld";
import { scheduleFromDbField } from "@/lib/opening-hours";
import { parseYardSocialJson } from "@/lib/yard-social";
import { formatUkLocationLine } from "@/lib/postcode-uk";

type Props = { params: Promise<{ slug: string }> };

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
  const url = `${base}/reclamation-yard/${slug}`;
  const ogImages = profile.yardHeaderImageUrl
    ? [profile.yardHeaderImageUrl]
    : profile.yardLogoUrl
      ? [profile.yardLogoUrl]
      : undefined;

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
      card: ogImages ? "summary_large_image" : "summary",
      title,
      description,
      images: ogImages,
    },
    robots: { index: true, follow: true },
  };
}

export default async function ReclamationYardPublicPage({ params }: Props) {
  const { slug } = await params;
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
  const pageUrl = `${base}/reclamation-yard/${slug}`;
  const schedule = scheduleFromDbField(profile.openingHoursSchedule);

  const jsonLd = buildYardStoreJsonLd({
    name: displayTitle,
    description: profile.yardAbout ?? profile.yardTagline,
    url: pageUrl,
    postcode: profile.postcode,
    logoUrl: profile.yardLogoUrl,
    imageUrl: profile.yardHeaderImageUrl ?? profile.yardLogoUrl,
    telephone: profile.yardContactPhone,
    email: profile.yardContactEmail,
    sameAs: sameAs.length ? sameAs : undefined,
    openingHoursWeekly: schedule,
  });

  const socialLabel: Record<string, string> = {
    instagram: "Instagram",
    facebook: "Facebook",
    x: "X",
    linkedin: "LinkedIn",
    tiktok: "TikTok",
  };

  return (
    <article className="pb-16">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <div className="relative -mx-4 mb-8 h-[min(38vh,420px)] bg-zinc-900 sm:-mx-0 sm:rounded-2xl sm:overflow-hidden">
        {profile.yardHeaderImageUrl ? (
          <Image
            src={profile.yardHeaderImageUrl}
            alt={`${displayTitle} — reclamation yard`}
            fill
            priority
            className="object-cover opacity-95"
            sizes="100vw"
            unoptimized
          />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-emerald-900 via-zinc-800 to-zinc-900" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/25 to-transparent" />
        <div className="absolute bottom-0 left-0 right-0 p-6 sm:p-8">
          <div className="mx-auto flex max-w-4xl flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div className="flex items-end gap-4">
              {profile.yardLogoUrl ? (
                <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-2xl border border-white/20 bg-white shadow-xl sm:h-24 sm:w-24">
                  <Image
                    src={profile.yardLogoUrl}
                    alt={`${displayTitle} logo`}
                    width={96}
                    height={96}
                    className="h-full w-full object-contain p-1"
                    unoptimized
                  />
                </div>
              ) : null}
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-emerald-200/95">
                  Reclamation yard
                </p>
                <h1 className="mt-1 text-2xl font-semibold tracking-tight text-white sm:text-3xl">
                  {displayTitle}
                </h1>
                {profile.yardTagline?.trim() ? (
                  <p className="mt-2 max-w-xl text-sm leading-relaxed text-zinc-200">{profile.yardTagline.trim()}</p>
                ) : null}
              </div>
            </div>
            <div className="shrink-0 text-sm text-zinc-200">
              <p className="font-medium text-white">{placeLine || "UK"}</p>
              <p className="mt-0.5 text-zinc-300">{profile.postcode}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto grid max-w-4xl gap-8 lg:grid-cols-[1fr_320px]">
        <div className="min-w-0 space-y-8">
          {profile.yardAbout?.trim() ? (
            <section aria-labelledby="about-heading">
              <h2 id="about-heading" className="text-lg font-semibold text-zinc-900">
                About this yard
              </h2>
              <div className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-zinc-700">
                {profile.yardAbout.trim()}
              </div>
            </section>
          ) : (
            <section aria-labelledby="about-heading">
              <h2 id="about-heading" className="text-lg font-semibold text-zinc-900">
                Reclaimed &amp; salvage stock
              </h2>
              <p className="mt-3 text-sm leading-relaxed text-zinc-600">
                Browse live listings from this reclamation yard. Materials are listed by the yard on Reclaimed
                Marketplace — ideal for builders, restorers, and salvage hunters across the UK.
              </p>
            </section>
          )}

          <section aria-labelledby="listings-heading">
            <h2 id="listings-heading" className="text-lg font-semibold text-zinc-900">
              Listings
            </h2>
            {listings.length === 0 ? (
              <p className="mt-3 text-sm text-zinc-500">No active listings right now. Check back soon.</p>
            ) : (
              <ul className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
                {listings.map((l) => (
                  <li key={l.id}>
                    <Link
                      href={`/listings/${l.id}`}
                      className="group block overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm transition hover:border-brand/40 hover:shadow-md"
                    >
                      <div className="relative aspect-[4/3] bg-zinc-100">
                        {l.images[0] ? (
                          <Image
                            src={l.images[0]}
                            alt={l.title}
                            fill
                            className="object-cover transition group-hover:scale-[1.02]"
                            sizes="(max-width: 640px) 100vw, 50vw"
                            unoptimized
                          />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center text-zinc-400">No image</div>
                        )}
                      </div>
                      <div className="p-3">
                        <p className="font-medium text-zinc-900 group-hover:text-brand">{l.title}</p>
                        <p className="mt-1 text-sm text-zinc-500">
                          £{(l.price / 100).toFixed(2)} · {l.category.name}
                          {l.condition ? ` · ${CONDITION_LABELS[l.condition]}` : ""}
                        </p>
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>

        <aside className="space-y-6 lg:sticky lg:top-24 lg:self-start">
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
                    <a className="font-medium text-brand hover:underline" href={`tel:${profile.yardContactPhone.replace(/\s+/g, "")}`}>
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

          <OpeningHoursBlock
            id="opening-hours"
            scheduleJson={profile.openingHoursSchedule}
            legacyText={profile.openingHours}
          />

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

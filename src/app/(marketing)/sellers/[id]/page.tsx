import { prisma } from "@/lib/db";
import { notFound, permanentRedirect } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { CONDITION_LABELS } from "@/lib/constants";
import { OpeningHoursBlock } from "@/components/OpeningHoursBlock";
import { auth } from "@/auth";
import { proxiedListingImageSrc } from "@/lib/listing-image-url";
import { formatUkLocationLine } from "@/lib/postcode-uk";
import { parseYardSocialJson } from "@/lib/yard-social";
import { YardStockAlertToggle } from "@/components/yards/yard-page-client";
import { formatMiles, haversineMiles } from "@/lib/geo";

const DEFAULT_DEALER_FALLBACK_IMAGE_PATH = "/images/dealer-fallback.png";

export default async function SellerPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await auth();
  const seller = await prisma.user.findUnique({
    where: { id },
    include: {
      sellerProfile: true,
      listings: {
        where: { status: "active", visibleOnMarketplace: true },
        orderBy: { updatedAt: "desc" },
        include: { category: true },
      },
    },
  });
  if (!seller?.sellerProfile) notFound();

  const profile = seller.sellerProfile;
  const isYard = seller.role === "reclamation_yard";
  const isDealer = seller.role === "dealer";
  const isIndividual = seller.role === "individual";

  if (isYard && profile.yardSlug) {
    permanentRedirect(`/yards/${profile.yardSlug}`);
  }
  const placeLine = formatUkLocationLine({
    postcodeLocality: profile.postcodeLocality,
    adminDistrict: profile.adminDistrict,
    region: profile.region,
    postcode: profile.postcode,
  });
  const social = parseYardSocialJson(profile.yardSocialJson);
  const displayTitle = profile.businessName?.trim() || profile.displayName;
  const fallback = DEFAULT_DEALER_FALLBACK_IMAGE_PATH;
  const profilePhoto =
    profile.yardLogoUrl ||
    (isIndividual && seller.image ? seller.image : null) ||
    profile.yardHeaderImageUrl ||
    fallback;
  const headerImage =
    profile.yardHeaderImageUrl || profile.yardLogoUrl || (isIndividual ? seller.image : null) || fallback;
  const meetLabel = isIndividual ? "Meet the seller" : "Meet the dealer";
  const activeListings = seller.listings;
  const forSaleListings = activeListings.filter((l) => l.listingKind === "sell");
  const auctionListings = activeListings.filter((l) => l.listingKind === "auction");
  const mapsUrl =
    profile.lat != null && profile.lng != null
      ? `https://www.google.com/maps?q=${profile.lat},${profile.lng}`
      : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(profile.postcode)}`;
  const wazeUrl =
    profile.lat != null && profile.lng != null
      ? `https://waze.com/ul?ll=${profile.lat},${profile.lng}&navigate=yes`
      : null;
  const viewerId = session?.user?.id ?? null;
  const hasStockAlert = viewerId
    ? Boolean(
        await prisma.yardStockAlert.findFirst({
          where: { userId: viewerId, sellerId: seller.id, categoryId: null },
          select: { id: true },
        })
      )
    : false;
  const relatedRaw = await prisma.sellerProfile.findMany({
    where: {
      user: { role: "dealer" },
      userId: { not: seller.id },
      ...(profile.region ? { region: profile.region } : {}),
    },
    select: {
      userId: true,
      displayName: true,
      businessName: true,
      yardLogoUrl: true,
      postcode: true,
      postcodeLocality: true,
      adminDistrict: true,
      region: true,
      lat: true,
      lng: true,
    },
    take: 18,
  });
  const relatedDealers = relatedRaw
    .map((d) => {
      const distanceMiles =
        profile.lat != null && profile.lng != null && d.lat != null && d.lng != null
          ? haversineMiles(profile.lat, profile.lng, d.lat, d.lng)
          : null;
      return { ...d, distanceMiles };
    })
    .sort((a, b) => (a.distanceMiles ?? 9999) - (b.distanceMiles ?? 9999))
    .slice(0, 8);
  const socialLabel: Record<string, string> = {
    instagram: "Instagram",
    facebook: "Facebook",
    x: "X",
    linkedin: "LinkedIn",
    tiktok: "TikTok",
  };

  const isOwner = viewerId === seller.id;

  return (
    <article className="pb-12">
      <div className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6">
        {isOwner && isIndividual ? (
          <div className="mb-4 rounded-xl border border-brand/25 bg-brand-soft/80 px-4 py-3 text-sm text-zinc-800">
            <span className="font-medium text-zinc-900">This is your public profile.</span>{" "}
            <Link href="/dashboard/individual-profile" className="font-medium text-brand hover:underline">
              Edit profile photo &amp; header
            </Link>
          </div>
        ) : null}
        <section className="overflow-hidden rounded-2xl border border-zinc-200 bg-white">
        <div className="relative h-44 w-full bg-zinc-100 sm:h-56">
          <Image
            src={headerImage}
            alt={`${displayTitle} header`}
            fill
            className="object-cover"
            sizes="(max-width: 768px) 100vw, 1200px"
            unoptimized
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-black/20 to-transparent" />
        </div>
        <div className="p-6">
          <div className="flex items-start gap-4">
            <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-xl border border-zinc-200 bg-zinc-100">
              <Image
                src={profilePhoto}
                alt={`${displayTitle} profile`}
                fill
                className="object-cover"
                sizes="64px"
                unoptimized
              />
            </div>
            <div className="min-w-0">
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-zinc-500">{meetLabel}</p>
              <h1 className="mt-1 text-3xl font-semibold text-zinc-900">{displayTitle}</h1>
              <p className="mt-2 text-zinc-600">{placeLine}</p>
              <p className="mt-1 text-sm text-zinc-500">
                On Reclaimed since {seller.createdAt.toLocaleDateString("en-GB", { dateStyle: "medium" })}
              </p>
            </div>
          </div>
          {profile.yardTagline ? <p className="mt-3 text-sm text-zinc-700">{profile.yardTagline}</p> : null}
          {profile.importedByAdmin && profile.claimCode ? (
            <Link
              href={`/claim-profile?sellerProfileId=${profile.id}`}
              className="mt-3 inline-block text-xs font-medium text-brand underline"
            >
              Own this dealer profile? Claim it
            </Link>
          ) : null}
        </div>
        </section>

        <section className="mt-6 grid gap-6 lg:grid-cols-[1fr_320px]">
        <div className="rounded-xl border border-zinc-200 bg-white p-5">
          <h2 className="text-lg font-semibold text-zinc-900">
            {isIndividual ? "About this seller" : "About this dealer"}
          </h2>
          {profile.yardAbout?.trim() ? (
            <div className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-zinc-700">
              {profile.yardAbout.trim()}
            </div>
          ) : (
            <p className="mt-3 text-sm leading-relaxed text-zinc-600">
              {isIndividual
                ? "This seller lists reclaimed, vintage, and antique pieces on The Reclaimed Company Marketplace. Follow their profile to see new items as they go live."
                : "Browse curated dealer pieces on Reclaimed Marketplace, including distinctive reclaimed stock and regular collection updates."}
            </p>
          )}
          <div className="mt-4">
            <YardStockAlertToggle
              sellerId={seller.id}
              sellerPath={`/sellers/${seller.id}`}
              viewerId={viewerId}
              hasAlert={hasStockAlert}
              label={isIndividual ? "Favourite seller & get alerts" : "Favourite dealer & get alerts"}
              stopLabel={isIndividual ? "Unfavourite seller" : "Unfavourite dealer"}
            />
          </div>
        </div>

        <aside className="rounded-xl border border-zinc-200 bg-white p-5">
          <h2 className="text-sm font-semibold text-zinc-900">Contact & socials</h2>
          <ul className="mt-3 space-y-2 text-sm">
            {profile.yardWebsiteUrl ? (
              <li>
                <a href={profile.yardWebsiteUrl} target="_blank" rel="noopener noreferrer" className="text-brand underline">
                  Website
                </a>
              </li>
            ) : null}
            {profile.yardContactPhone ? (
              <li>
                <a href={`tel:${profile.yardContactPhone.replace(/\s+/g, "")}`} className="text-brand underline">
                  {profile.yardContactPhone}
                </a>
              </li>
            ) : null}
            {(["instagram", "facebook", "x", "linkedin", "tiktok"] as const).map((key) => {
              const url = social[key];
              if (!url) return null;
              return (
                <li key={key}>
                  <a href={url} target="_blank" rel="noopener noreferrer" className="text-brand underline">
                    {socialLabel[key]}
                  </a>
                </li>
              );
            })}
          </ul>
          <div className="mt-4 flex flex-wrap gap-2">
            <a
              href={mapsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-lg border border-zinc-300 bg-white px-3 py-1.5 text-sm font-medium text-zinc-800 hover:bg-zinc-50"
            >
              Open in Google Maps
            </a>
            {wazeUrl ? (
              <a
                href={wazeUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-lg border border-zinc-300 bg-white px-3 py-1.5 text-sm font-medium text-zinc-800 hover:bg-zinc-50"
              >
                Open in Waze
              </a>
            ) : null}
          </div>
          {profile.salvoCodeMember ? (
            <p className="mt-3 rounded bg-emerald-50 px-2 py-1 text-xs font-semibold text-emerald-900">Salvo Code Member</p>
          ) : null}
          {profile.isRegisteredCharity ? (
            <p className="mt-2 rounded bg-violet-50 px-2 py-1 text-xs font-semibold text-violet-900">Charity Support</p>
          ) : null}
          {profile.openingHoursSchedule || profile.openingHours ? (
            <div className="mt-4">
              <OpeningHoursBlock
                id="opening-hours"
                scheduleJson={profile.openingHoursSchedule}
                legacyText={profile.openingHours}
              />
            </div>
          ) : null}
        </aside>
        </section>

        {isDealer ? (
        <section className="mt-8 rounded-xl border border-zinc-200 bg-white p-5">
          <h2 className="text-lg font-semibold text-zinc-900">Why source from this dealer</h2>
          <p className="mt-3 text-sm leading-relaxed text-zinc-600">
            Dealers typically curate exceptional pieces, provide clearer condition context, and can help match
            provenance across eras and styles. Following a dealer profile makes it easier to track new arrivals that
            fit premium projects.
          </p>
        </section>
        ) : isIndividual ? (
        <section className="mt-8 rounded-xl border border-zinc-200 bg-white p-5">
          <h2 className="text-lg font-semibold text-zinc-900">Why buy from an independent seller</h2>
          <p className="mt-3 text-sm leading-relaxed text-zinc-600">
            Independent sellers often list one-off pieces from clear-outs, renovation projects, or long-held collections
            — with honest descriptions and direct communication. Favouriting this profile helps you catch new listings
            early.
          </p>
        </section>
        ) : null}

        <section className="mt-8">
        <h2 className="text-lg font-semibold text-zinc-900">Available pieces</h2>
        {forSaleListings.length === 0 ? (
          <p className="mt-3 text-sm text-zinc-500">No available pieces right now.</p>
        ) : (
          <ul className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {forSaleListings.map((l) => (
              <li key={l.id}>
                <ListingCard listing={l} />
              </li>
            ))}
          </ul>
        )}
        </section>

        <section className="mt-8">
        <h2 className="text-lg font-semibold text-zinc-900">Auctions</h2>
        {auctionListings.length === 0 ? (
          <p className="mt-3 text-sm text-zinc-500">No active auctions.</p>
        ) : (
          <ul className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {auctionListings.map((l) => (
              <li key={l.id}>
                <ListingCard listing={l} />
              </li>
            ))}
          </ul>
        )}
        </section>

      {relatedDealers.length > 0 ? (
        <section className="mt-10 border-t border-zinc-200 pt-8">
          <h2 className="text-lg font-semibold text-zinc-900">Other dealers you may like</h2>
          <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
            {relatedDealers.map((d) => (
              <Link key={d.userId} href={`/sellers/${d.userId}`} className="flex items-center gap-3 rounded-xl border border-zinc-200 bg-white p-3 hover:border-brand/40">
                <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-lg bg-zinc-100">
                  <Image
                    src={d.yardLogoUrl || DEFAULT_DEALER_FALLBACK_IMAGE_PATH}
                    alt=""
                    fill
                    className="object-cover"
                    sizes="48px"
                    unoptimized
                  />
                </div>
                <div className="min-w-0">
                  <p className="truncate font-medium text-zinc-900">{d.businessName || d.displayName}</p>
                  <p className="truncate text-xs text-zinc-500">
                    {formatUkLocationLine({
                      postcodeLocality: d.postcodeLocality,
                      adminDistrict: d.adminDistrict,
                      region: d.region,
                      postcode: d.postcode,
                    })}
                  </p>
                  {d.distanceMiles != null ? <p className="text-xs text-brand">{formatMiles(d.distanceMiles)} away</p> : null}
                </div>
              </Link>
            ))}
          </div>
        </section>
      ) : null}
      </div>
    </article>
  );
}

function ListingCard({
  listing: l,
}: {
  listing: {
    id: string;
    title: string;
    price: number;
    category: { name: string };
    condition: keyof typeof CONDITION_LABELS;
    images: string[];
  };
}) {
  return (
    <Link
      href={`/listings/${l.id}`}
      className="block overflow-hidden rounded-xl border border-zinc-200 bg-white transition-colors hover:border-brand/40"
    >
      <div className="relative aspect-square bg-zinc-200">
        {l.images[0] ? (
          <Image
            src={proxiedListingImageSrc(l.images[0])}
            alt={l.title}
            fill
            className="object-cover"
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
            unoptimized
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-zinc-400">No image</div>
        )}
      </div>
      <div className="p-3">
        <p className="truncate font-medium text-zinc-900">{l.title}</p>
        <p className="text-sm text-zinc-500">
          £{(l.price / 100).toFixed(2)} · {l.category.name} piece
          {l.condition ? ` · ${CONDITION_LABELS[l.condition]}` : ""}
        </p>
      </div>
    </Link>
  );
}

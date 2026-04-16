import { prisma } from "@/lib/db";
import { notFound, permanentRedirect } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { CONDITION_LABELS } from "@/lib/constants";
import { OpeningHoursBlock } from "@/components/OpeningHoursBlock";
import { auth } from "@/auth";
import { formatUkLocationLine } from "@/lib/postcode-uk";
import { parseYardSocialJson } from "@/lib/yard-social";
import { YardStockAlertToggle } from "@/components/yards/yard-page-client";
import { formatMiles, haversineMiles } from "@/lib/geo";

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

  return (
    <article className="pb-12">
      <section className="rounded-2xl border border-zinc-200 bg-white p-6">
        <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-zinc-500">Meet the dealer</p>
        <h1 className="mt-1 text-3xl font-semibold text-zinc-900">{displayTitle}</h1>
        <p className="mt-2 text-zinc-600">{placeLine}</p>
        <p className="mt-1 text-sm text-zinc-500">
          On Reclaimed since {seller.createdAt.toLocaleDateString("en-GB", { dateStyle: "medium" })}
        </p>
        {profile.yardTagline ? <p className="mt-3 text-sm text-zinc-700">{profile.yardTagline}</p> : null}
        {profile.importedByAdmin && profile.claimCode ? (
          <Link
            href={`/claim-profile?sellerProfileId=${profile.id}`}
            className="mt-3 inline-block text-xs font-medium text-brand underline"
          >
            Own this dealer profile? Claim it
          </Link>
        ) : null}
      </section>

      <section className="mt-6 grid gap-6 lg:grid-cols-[1fr_320px]">
        <div className="rounded-xl border border-zinc-200 bg-white p-5">
          <h2 className="text-lg font-semibold text-zinc-900">About this dealer</h2>
          {profile.yardAbout?.trim() ? (
            <div className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-zinc-700">
              {profile.yardAbout.trim()}
            </div>
          ) : (
            <p className="mt-3 text-sm leading-relaxed text-zinc-600">
              Browse live listings from this dealer on Reclaimed Marketplace, including unique reclaimed stock and
              regular inventory updates.
            </p>
          )}
          <div className="mt-4">
            <YardStockAlertToggle
              sellerId={seller.id}
              sellerPath={`/sellers/${seller.id}`}
              viewerId={viewerId}
              hasAlert={hasStockAlert}
              label="Favourite dealer & get alerts"
              stopLabel="Unfavourite dealer"
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

      <section className="mt-8">
        <h2 className="text-lg font-semibold text-zinc-900">For sale</h2>
        {forSaleListings.length === 0 ? (
          <p className="mt-3 text-sm text-zinc-500">No active sale listings.</p>
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
          <h2 className="text-lg font-semibold text-zinc-900">Other nearby dealers</h2>
          <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
            {relatedDealers.map((d) => (
              <Link key={d.userId} href={`/sellers/${d.userId}`} className="flex items-center gap-3 rounded-xl border border-zinc-200 bg-white p-3 hover:border-brand/40">
                <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-lg bg-zinc-100">
                  {d.yardLogoUrl ? (
                    <Image src={d.yardLogoUrl} alt="" fill className="object-contain p-0.5" sizes="48px" />
                  ) : null}
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
            src={l.images[0]}
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
          £{(l.price / 100).toFixed(2)} · {l.category.name}
          {l.condition ? ` · ${CONDITION_LABELS[l.condition]}` : ""}
        </p>
        <p className="mt-1 truncate font-mono text-[10px] text-zinc-400">ID: {l.id}</p>
      </div>
    </Link>
  );
}

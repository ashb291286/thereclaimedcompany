import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import Link from "next/link";
import Image from "next/image";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { stripe } from "@/lib/stripe";
import { StripeConnectButton } from "./StripeConnectButton";
import { parseStoredCarbonImpact } from "@/lib/carbon/listing";
import { CarbonBadge } from "@/components/CarbonBadge";
import { publicSellerPath } from "@/lib/yard-public-path";

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ stripe?: string; boosted?: string; boostError?: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) return null;
  const { stripe: stripeParam, boosted, boostError } = await searchParams;

  async function deleteListingAction(formData: FormData) {
    "use server";
    const current = await auth();
    if (!current?.user?.id) redirect("/auth/signin");
    const id = String(formData.get("listingId") ?? "");
    if (!id) return;
    await prisma.listing.deleteMany({
      where: { id, sellerId: current.user.id },
    });
    revalidatePath("/dashboard");
  }

  async function boostListingAction(formData: FormData) {
    "use server";
    const current = await auth();
    if (!current?.user?.id) redirect("/auth/signin");
    const id = String(formData.get("listingId") ?? "");
    if (!id) return;
    const listing = await prisma.listing.findFirst({
      where: { id, sellerId: current.user.id, status: "active" },
      select: { id: true, title: true },
    });
    if (!listing) redirect("/dashboard?boostError=not-active");

    const fullUser = await prisma.user.findUnique({
      where: { id: current.user.id },
      select: { email: true, stripeCustomerId: true },
    });
    if (!fullUser) redirect("/dashboard?boostError=user");

    let customerId = fullUser.stripeCustomerId;
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: fullUser.email ?? undefined,
        metadata: { userId: current.user.id },
      });
      customerId = customer.id;
      await prisma.user.update({
        where: { id: current.user.id },
        data: { stripeCustomerId: customerId },
      });
    }

    const baseUrl = process.env.NEXTAUTH_URL ?? "http://localhost:3000";
    const checkoutSession = await stripe.checkout.sessions.create({
      mode: "payment",
      customer: customerId,
      line_items: [
        {
          price_data: {
            currency: "gbp",
            unit_amount: 500,
            product_data: {
              name: "Listing boost (7 days)",
              description: `${listing.title} — featured promotion to local reclamation yards`,
            },
          },
          quantity: 1,
        },
      ],
      success_url: `${baseUrl}/dashboard?boosted=1`,
      cancel_url: `${baseUrl}/dashboard`,
      metadata: {
        kind: "listing_boost",
        listingId: listing.id,
        sellerId: current.user.id,
      },
    });

    if (!checkoutSession.url) redirect("/dashboard?boostError=checkout");
    redirect(checkoutSession.url);
  }

  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  const [sellerProfile, listings, listingCarbon, viewsTotal, views7d] = await Promise.all([
    prisma.sellerProfile.findUnique({ where: { userId: session.user.id } }),
    prisma.listing.findMany({
      where: { sellerId: session.user.id },
      orderBy: { updatedAt: "desc" },
      take: 20,
      include: { category: true },
    }),
    prisma.listing.aggregate({
      where: { sellerId: session.user.id },
      _sum: { carbonSavedKg: true, carbonWasteDivertedKg: true },
    }),
    prisma.listingViewEvent.groupBy({
      by: ["listingId"],
      where: { listing: { sellerId: session.user.id } },
      _count: { _all: true },
    }),
    prisma.listingViewEvent.groupBy({
      by: ["listingId"],
      where: {
        listing: { sellerId: session.user.id },
        createdAt: { gte: sevenDaysAgo },
      },
      _count: { _all: true },
    }),
  ]);

  const totalViewsByListing = new Map(viewsTotal.map((v) => [v.listingId, v._count._all]));
  const views7dByListing = new Map(views7d.map((v) => [v.listingId, v._count._all]));

  if (!sellerProfile) {
    return (
      <div className="rounded-xl border border-brand/20 bg-brand-soft p-6 text-center">
        <h2 className="text-lg font-semibold text-zinc-900">Start selling</h2>
        <p className="mt-2 text-sm text-zinc-600">
          Set up your seller profile to list items.
        </p>
        <Link
          href="/dashboard/onboarding"
          className="mt-4 inline-block rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand-hover"
        >
          Set up seller profile
        </Link>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-2xl font-semibold text-zinc-900">Dashboard</h1>
      <p className="mt-1 text-zinc-600">
        {sellerProfile.displayName}
        {sellerProfile.businessName && ` · ${sellerProfile.businessName}`}
      </p>
      {session.user.role === "reclamation_yard" ? (
        <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
          <Link href="/dashboard/seller-profile" className="font-medium text-brand hover:underline">
            Yard profile &amp; SEO
          </Link>
          {sellerProfile.yardSlug ? (
            <Link
              href={publicSellerPath({
                sellerId: session.user.id,
                role: session.user.role,
                yardSlug: sellerProfile.yardSlug,
              })}
              className="font-medium text-emerald-800 hover:underline"
              target="_blank"
              rel="noopener noreferrer"
            >
              View public yard
            </Link>
          ) : (
            <span className="text-zinc-500">Set a URL slug under Yard profile to publish.</span>
          )}
        </div>
      ) : null}
      {stripeParam === "success" && sellerProfile.stripeAccountId && (
        <p className="mt-4 text-sm text-green-700">Stripe account connected. You can receive payouts when you make a sale.</p>
      )}
      {boosted === "1" ? (
        <p className="mt-4 text-sm text-emerald-700">
          Listing boosted for 7 days.
        </p>
      ) : null}
      {boostError ? (
        <p className="mt-2 text-sm text-rose-700">
          Couldn&apos;t start boost checkout. Ensure listing is active and try again.
        </p>
      ) : null}
      {(listingCarbon._sum.carbonSavedKg ?? 0) > 0 || (listingCarbon._sum.carbonWasteDivertedKg ?? 0) > 0 ? (
        <div className="mt-6 rounded-2xl border border-emerald-200/80 bg-gradient-to-br from-emerald-50/90 via-white to-teal-50/80 p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-emerald-800/90">
            Environmental impact of your listings
          </p>
          <p className="mt-2 text-sm text-zinc-800">
            Across current and past listings with material data:{" "}
            <strong>
              {(listingCarbon._sum.carbonSavedKg ?? 0).toLocaleString(undefined, { maximumFractionDigits: 1 })} kg
            </strong>{" "}
            CO₂e estimated avoided vs new
            {(listingCarbon._sum.carbonWasteDivertedKg ?? 0) > 0 ? (
              <>
                {" "}
                ·{" "}
                <strong>
                  {(listingCarbon._sum.carbonWasteDivertedKg ?? 0).toLocaleString(undefined, {
                    maximumFractionDigits: 1,
                  })}{" "}
                  kg
                </strong>{" "}
                mass in use
              </>
            ) : null}
            . Indicative; based on ICE-style factors.
          </p>
        </div>
      ) : null}
      {!sellerProfile.stripeAccountId && (
        <div className="mt-6 rounded-xl border border-brand/20 bg-brand-soft p-4">
          <h2 className="font-medium text-zinc-900">Complete setup to get paid</h2>
          <p className="mt-1 text-sm text-zinc-600">
            {stripeParam === "refresh"
              ? "The link expired. Click below to get a new one."
              : "Connect your Stripe account to receive payments when you make a sale."}
          </p>
          <StripeConnectButton />
        </div>
      )}
      <div className="mt-8">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-medium text-zinc-900">Your listings</h2>
          <Link
            href="/dashboard/sell"
            className="rounded-lg bg-brand px-3 py-1.5 text-sm font-medium text-white hover:bg-brand-hover"
          >
            New listing
          </Link>
        </div>
        {listings.length === 0 ? (
          <p className="mt-4 text-sm text-zinc-500">No listings yet.</p>
        ) : (
          <ul className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {listings.map((l) => (
              <li key={l.id} className="overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm">
                <div className="relative aspect-[4/3] bg-zinc-100">
                  {l.images[0] ? (
                    <Image
                      src={l.images[0]}
                      alt={l.title}
                      fill
                      className="object-cover"
                      sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                      unoptimized
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-zinc-500">No image</div>
                  )}
                </div>
                <div className="p-3">
                  <div className="mb-2 flex flex-wrap gap-1">
                    {l.listingKind === "auction" ? (
                      <span className="rounded bg-brand-soft px-1.5 py-0.5 text-[10px] font-bold uppercase text-brand">
                        Auction
                      </span>
                    ) : null}
                    {l.listingKind === "sell" && l.freeToCollector ? (
                      <span className="rounded bg-emerald-100 px-1.5 py-0.5 text-[10px] font-bold uppercase text-emerald-900">
                        Free
                      </span>
                    ) : null}
                    <span className="rounded bg-zinc-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-zinc-700">
                      {l.status}
                    </span>
                  </div>

                  <Link href={`/listings/${l.id}`} className="line-clamp-2 font-medium text-zinc-900 hover:underline">
                    {l.title}
                  </Link>
                  <p className="mt-1 text-sm text-zinc-500">
                    {l.listingKind === "sell" && l.freeToCollector
                      ? `Free to collect · ${l.category.name}`
                      : l.listingKind === "auction"
                        ? `From £${(l.price / 100).toFixed(2)} · ${l.category.name}`
                        : `£${(l.price / 100).toFixed(2)} · ${l.category.name}`}
                  </p>
                  {parseStoredCarbonImpact(l) ? (
                    <div className="mt-2">
                      <CarbonBadge impact={parseStoredCarbonImpact(l)!} variant="compact" />
                    </div>
                  ) : null}
                  <p className="mt-2 text-xs text-zinc-500">
                    Visits: <strong>{totalViewsByListing.get(l.id) ?? 0}</strong> total ·{" "}
                    <strong>{views7dByListing.get(l.id) ?? 0}</strong> in last 7 days
                  </p>

                  <div className="mt-3 grid grid-cols-4 gap-2">
                    <Link
                      href={`/dashboard/listings/${l.id}/edit`}
                      className="rounded-lg border border-zinc-300 px-2 py-1.5 text-center text-xs font-medium text-zinc-700 hover:bg-zinc-50"
                    >
                      Edit
                    </Link>
                    <form action={deleteListingAction} className="contents">
                      <input type="hidden" name="listingId" value={l.id} />
                      <button
                        type="submit"
                        className="rounded-lg border border-rose-200 px-2 py-1.5 text-xs font-medium text-rose-700 hover:bg-rose-50"
                      >
                        Delete
                      </button>
                    </form>
                    <form action={boostListingAction} className="contents">
                      <input type="hidden" name="listingId" value={l.id} />
                      <button
                        type="submit"
                        disabled={l.status !== "active"}
                        className="rounded-lg border border-amber-200 px-2 py-1.5 text-xs font-medium text-amber-800 hover:bg-amber-50 disabled:cursor-not-allowed disabled:opacity-50"
                        title={l.status === "active" ? "Boost for 7 days (£5)" : "Only active listings can be boosted"}
                      >
                        {l.boostedUntil && l.boostedUntil > new Date() ? "Boosted" : "Boost £5"}
                      </button>
                    </form>
                    <Link
                      href={`/listings/${l.id}`}
                      className="rounded-lg border border-zinc-300 px-2 py-1.5 text-center text-xs font-medium text-zinc-700 hover:bg-zinc-50"
                    >
                      Stats
                    </Link>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

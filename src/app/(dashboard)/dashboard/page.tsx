import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import Link from "next/link";
import { StripeConnectButton } from "./StripeConnectButton";

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ stripe?: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) return null;
  const { stripe: stripeParam } = await searchParams;

  const [sellerProfile, listings, listingCarbon] = await Promise.all([
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
  ]);

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
      {stripeParam === "success" && sellerProfile.stripeAccountId && (
        <p className="mt-4 text-sm text-green-700">Stripe account connected. You can receive payouts when you make a sale.</p>
      )}
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
          <ul className="mt-4 space-y-3">
            {listings.map((l) => (
              <li
                key={l.id}
                className="flex items-center justify-between rounded-lg border border-zinc-200 bg-white p-4"
              >
                <div>
                  <Link href={`/listings/${l.id}`} className="font-medium text-zinc-900 hover:underline">
                    {l.title}
                  </Link>
                  <p className="text-sm text-zinc-500">
                    {l.listingKind === "auction" && (
                      <span className="mr-1 font-semibold text-brand">Auction · </span>
                    )}
                    {l.listingKind === "sell" && l.freeToCollector && (
                      <span className="mr-1 font-semibold text-emerald-800">Free · </span>
                    )}
                    {l.category.name} ·{" "}
                    {l.listingKind === "sell" && l.freeToCollector
                      ? "£0 collect"
                      : `£${(l.price / 100).toFixed(2)}`}{" "}
                    · {l.status}
                  </p>
                </div>
                <Link
                  href={`/dashboard/listings/${l.id}/edit`}
                  className="text-sm text-brand hover:underline"
                >
                  Edit
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

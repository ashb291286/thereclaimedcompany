import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { togglePropRentalOfferActiveAction } from "@/lib/actions/prop-yard";
import { PROP_YARD_RECOMMENDED_WEEKLY_RATE_OF_LIST_PRICE } from "@/lib/prop-yard";

export default async function DashboardPropYardPage({
  searchParams,
}: {
  searchParams: Promise<{ wizard?: string; saved?: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect("/auth/signin");

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { role: true, sellerProfile: { select: { id: true } } },
  });
  const allowed = user?.role === "reclamation_yard" || !!user?.sellerProfile;
  if (!user || !allowed) {
    redirect(
      "/dashboard?error=" + encodeURIComponent("Seller profile required to manage Prop Yard hire listings.")
    );
  }

  const { wizard, saved } = await searchParams;

  const offers = await prisma.propRentalOffer.findMany({
    where: { listing: { sellerId: session.user.id } },
    orderBy: { updatedAt: "desc" },
    include: {
      listing: { select: { id: true, title: true, status: true, price: true, visibleOnMarketplace: true } },
    },
  });

  const pct = Math.round(PROP_YARD_RECOMMENDED_WEEKLY_RATE_OF_LIST_PRICE * 100);

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-900">The Prop Yard</h1>
          <p className="mt-2 max-w-2xl text-sm text-zinc-600">
            Offer items from your <strong>marketplace listings</strong> for weekly film/TV hire, or add{" "}
            <strong>hire-only</strong> stock that never appears in marketplace search. We suggest{" "}
            <strong>{pct}% of reference list price per week</strong> as a starting rate — you set the final figure.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            href="/dashboard/prop-yard/wizard"
            className="rounded-lg bg-amber-900 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-950"
          >
            Create prop listing
          </Link>
          <Link
            href="/dashboard/prop-yard/props/new"
            className="rounded-lg border border-amber-900 bg-white px-4 py-2 text-sm font-semibold text-amber-900 hover:bg-amber-50"
          >
            Hire-only short form
          </Link>
          <Link
            href="/dashboard/prop-yard/offerings/new"
            className="rounded-lg border border-amber-900 bg-white px-4 py-2 text-sm font-semibold text-amber-900 hover:bg-amber-50"
          >
            Update several listings
          </Link>
        </div>
      </div>

      {wizard && saved ? (
        <div className="mt-6 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
          <p>
            Prop listing saved. Open an offer below for <strong>Availability &amp; bookings</strong> — mark a hire as{" "}
            <strong>Out on hire</strong> to pause marketplace visibility until it&apos;s returned.
          </p>
          <Link href="/dashboard/prop-yard/wizard?similar=1" className="mt-2 inline-block font-medium underline">
            List similar item
          </Link>
        </div>
      ) : null}

      <section className="mt-8 rounded-xl border border-zinc-200 bg-white p-6">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500">Your prop offers</h2>
        {offers.length === 0 ? (
          <p className="mt-4 text-sm text-zinc-600">
            No listings on hire yet. Add an active fixed-price listing to appear in The Prop Yard search (separate from
            selling it).
          </p>
        ) : (
          <ul className="mt-4 divide-y divide-zinc-100">
            {offers.map((o) => (
              <li key={o.id} className="flex flex-wrap items-center justify-between gap-4 py-4 first:pt-0">
                <div className="min-w-0">
                  <p className="font-medium text-zinc-900">{o.listing.title}</p>
                  <p className="text-sm text-zinc-600">
                    £{(o.weeklyHirePence / 100).toFixed(2)}/week · Listing{" "}
                    <span className={o.listing.status === "active" ? "text-emerald-700" : "text-amber-800"}>
                      {o.listing.status}
                    </span>
                    {!o.listing.visibleOnMarketplace ? (
                      <span className="ml-2 rounded bg-zinc-200 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-zinc-700">
                        Hire-only
                      </span>
                    ) : null}
                  </p>
                  <p className="text-xs text-zinc-500">
                    Minimum {o.minimumHireWeeks} week{o.minimumHireWeeks === 1 ? "" : "s"}
                  </p>
                  <Link
                    href={`/dashboard/prop-yard/offerings/${o.id}/calendar`}
                    className="mt-1 inline-block text-sm text-brand hover:underline"
                  >
                    Availability &amp; bookings
                  </Link>
                </div>
                <div className="flex items-center gap-3">
                  <Link href={`/prop-yard/offers/${o.id}`} className="text-sm text-zinc-600 hover:text-zinc-900">
                    Preview →
                  </Link>
                  <form action={togglePropRentalOfferActiveAction}>
                    <input type="hidden" name="offerId" value={o.id} />
                    <input type="hidden" name="isActive" value={o.isActive ? "false" : "true"} />
                    <button
                      type="submit"
                      className="rounded-lg border border-zinc-300 px-3 py-1.5 text-xs font-medium text-zinc-800 hover:bg-zinc-50"
                    >
                      {o.isActive ? "Pause hire" : "Resume hire"}
                    </button>
                  </form>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <p className="mt-6 text-xs text-zinc-500">
        Hire requests appear in each offer&apos;s calendar. Payment and contracts are between you and the production;
        this layer tracks the request and dates.
      </p>
    </div>
  );
}

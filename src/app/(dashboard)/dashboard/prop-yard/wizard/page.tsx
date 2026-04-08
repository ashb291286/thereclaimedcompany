import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { PROP_YARD_RECOMMENDED_WEEKLY_RATE_OF_LIST_PRICE } from "@/lib/prop-yard";
import { PropListingWizard } from "./PropListingWizard";

type Props = { searchParams: Promise<{ error?: string; listingId?: string }> };

export default async function PropListingWizardPage({ searchParams }: Props) {
  const session = await auth();
  if (!session?.user?.id) redirect("/auth/signin?callbackUrl=/dashboard/prop-yard/wizard");

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { role: true },
  });
  if (user?.role !== "reclamation_yard") {
    redirect("/dashboard?error=" + encodeURIComponent("The Prop Yard wizard is for reclamation yard accounts."));
  }

  const { error, listingId: listingIdParam } = await searchParams;

  const [categories, listings] = await Promise.all([
    prisma.category.findMany({
      where: { parentId: null },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
    prisma.listing.findMany({
      where: {
        sellerId: session.user.id,
        status: "active",
        listingKind: "sell",
        freeToCollector: false,
      },
      orderBy: { updatedAt: "desc" },
      select: {
        id: true,
        title: true,
        price: true,
        visibleOnMarketplace: true,
        images: true,
        propRentalOffer: { select: { id: true } },
      },
    }),
  ]);

  const wizardListings = listings.map((l) => ({
    id: l.id,
    title: l.title,
    price: l.price,
    visibleOnMarketplace: l.visibleOnMarketplace,
    images: l.images,
    hasPropOffer: !!l.propRentalOffer,
  }));

  const pct = Math.round(PROP_YARD_RECOMMENDED_WEEKLY_RATE_OF_LIST_PRICE * 100);

  return (
    <div>
      <Link href="/dashboard/prop-yard" className="text-sm text-brand hover:underline">
        ← Prop Yard dashboard
      </Link>
      <h1 className="mt-4 text-2xl font-semibold text-zinc-900">Create prop listing</h1>
      <p className="mt-2 max-w-2xl text-sm text-zinc-600">
        Step through linking an existing marketplace item or adding hire-only stock, then set hire rates, delivery hints,
        and confirm terms. Manage blackout dates and bookings from each offer&apos;s calendar afterward.
      </p>

      {error ? (
        <p className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{decodeURIComponent(error)}</p>
      ) : null}

      <div className="mt-10">
        <PropListingWizard
          listings={wizardListings}
          categories={categories}
          pctLabel={pct}
          initialListingId={listingIdParam}
        />
      </div>
    </div>
  );
}

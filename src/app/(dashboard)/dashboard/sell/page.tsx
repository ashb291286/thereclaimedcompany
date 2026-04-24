import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { getMaterialOptionsForForm } from "@/lib/carbon/factors";
import { redirect } from "next/navigation";
import Link from "next/link";
import { ListingForm } from "./ListingForm";

export default async function SellPage({
  searchParams,
}: {
  searchParams: Promise<{ firstListing?: string; error?: string; published?: string; listingId?: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect("/auth/signin");

  const { firstListing, error, published, listingId } = await searchParams;

  const sellerProfile = await prisma.sellerProfile.findUnique({
    where: { userId: session.user.id },
    select: {
      postcode: true,
      displayName: true,
      vatRegistered: true,
    },
  });
  if (!sellerProfile) redirect("/dashboard/onboarding");

  const dbUser = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { role: true },
  });

  const [categories, materialOpts] = await Promise.all([
    prisma.category.findMany({
      where: { parentId: null },
      orderBy: { name: "asc" },
    }),
    getMaterialOptionsForForm(),
  ]);
  const materialOptions = materialOpts.map(({ materialType, label }) => ({ materialType, label }));

  return (
    <div>
      {firstListing === "1" && (
        <div className="mb-6 rounded-xl border border-emerald-200 bg-emerald-50/90 px-4 py-3 text-sm text-emerald-950">
          <p className="font-semibold">You&apos;re ready to sell</p>
          <p className="mt-1 text-emerald-900/90">
            Add photos (you&apos;ll crop each one), set your price, then publish. Connect Stripe from the dashboard
            if you haven&apos;t already — you&apos;ll need it before your first paid order.
          </p>
          <Link
            href="/dashboard"
            className="mt-2 inline-block text-sm font-medium text-emerald-800 underline hover:text-emerald-950"
          >
            Go to dashboard instead
          </Link>
        </div>
      )}
      {error ? (
        <p className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
      ) : null}
      <h1 className="text-2xl font-semibold text-zinc-900">List an item</h1>
      <p className="mt-1 text-zinc-600">
        Choose how you&apos;re selling, add cropped photos, then set details and price.
      </p>
      <ListingForm
        categories={categories}
        defaultPostcode={sellerProfile.postcode}
        sellerDisplayName={sellerProfile.displayName}
        materialOptions={materialOptions}
        isDealer={dbUser?.role === "dealer"}
        isReclamationYard={dbUser?.role === "reclamation_yard"}
        yardPricesExcludeVat={
          dbUser?.role === "reclamation_yard" && Boolean(sellerProfile.vatRegistered)
        }
        initialPublishedListingId={published === "1" ? (listingId ?? null) : null}
      />
    </div>
  );
}

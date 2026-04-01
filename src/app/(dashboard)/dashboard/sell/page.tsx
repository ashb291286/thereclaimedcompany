import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { redirect } from "next/navigation";
import Link from "next/link";
import { ListingForm } from "./ListingForm";

export default async function SellPage({
  searchParams,
}: {
  searchParams: Promise<{ firstListing?: string; error?: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect("/auth/signin");

  const { firstListing, error } = await searchParams;

  const sellerProfile = await prisma.sellerProfile.findUnique({
    where: { userId: session.user.id },
  });
  if (!sellerProfile) redirect("/dashboard/onboarding");

  const categories = await prisma.category.findMany({
    where: { parentId: null },
    orderBy: { name: "asc" },
  });

  return (
    <div>
      {firstListing === "1" && (
        <div className="mb-6 rounded-xl border border-emerald-200 bg-emerald-50/90 px-4 py-3 text-sm text-emerald-950">
          <p className="font-semibold">You&apos;re ready to sell</p>
          <p className="mt-1 text-emerald-900/90">
            Profile saved. Add photos (you&apos;ll crop each one), then publish your first listing.
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
      />
    </div>
  );
}

import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { getMaterialOptionsForForm } from "@/lib/carbon/factors";
import { redirect, notFound } from "next/navigation";
import { ListingForm } from "@/app/(dashboard)/dashboard/sell/ListingForm";

export default async function EditListingPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect("/auth/signin");
  const { id } = await params;
  const { error } = await searchParams;

  const listing = await prisma.listing.findFirst({
    where: { id, sellerId: session.user.id },
    include: { category: true },
  });
  if (!listing) notFound();

  const sellerProfile = await prisma.sellerProfile.findUnique({
    where: { userId: session.user.id },
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
      {error ? (
        <p className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
      ) : null}
      <h1 className="text-2xl font-semibold text-zinc-900">Edit listing</h1>
      <p className="mt-1 text-zinc-600">{listing.title}</p>
      <ListingForm
        categories={categories}
        defaultPostcode={listing.postcode ?? ""}
        listing={listing}
        sellerDisplayName={sellerProfile?.displayName}
        materialOptions={materialOptions}
      />
    </div>
  );
}

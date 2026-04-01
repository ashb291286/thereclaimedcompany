import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { redirect, notFound } from "next/navigation";
import { ListingForm } from "@/app/(dashboard)/dashboard/sell/ListingForm";

export default async function EditListingPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect("/auth/signin");
  const { id } = await params;

  const listing = await prisma.listing.findFirst({
    where: { id, sellerId: session.user.id },
    include: { category: true },
  });
  if (!listing) notFound();

  const categories = await prisma.category.findMany({
    where: { parentId: null },
    orderBy: { name: "asc" },
  });

  return (
    <div>
      <h1 className="text-2xl font-semibold text-zinc-900">Edit listing</h1>
      <p className="mt-1 text-zinc-600">{listing.title}</p>
      <ListingForm
        categories={categories}
        defaultPostcode={listing.postcode ?? ""}
        listing={listing}
      />
    </div>
  );
}

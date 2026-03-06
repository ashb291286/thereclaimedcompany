import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { redirect } from "next/navigation";
import Link from "next/link";
import { ListingForm } from "./ListingForm";

export default async function SellPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/auth/signin");

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
      <h1 className="text-2xl font-semibold text-zinc-900">List an item</h1>
      <p className="mt-1 text-zinc-600">
        Add photos, details and set your price.
      </p>
      <ListingForm
        categories={categories}
        defaultPostcode={sellerProfile.postcode}
        userId={session.user.id}
      />
    </div>
  );
}

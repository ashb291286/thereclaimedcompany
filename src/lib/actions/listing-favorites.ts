"use server";

import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";

export async function toggleListingFavorite(listingId: string) {
  const session = await auth();
  if (!session?.user?.id) {
    return { ok: false as const, error: "signin" as const };
  }

  const listing = await prisma.listing.findFirst({
    where: {
      id: listingId,
      status: { in: ["active", "payment_pending"] },
      visibleOnMarketplace: true,
    },
    select: { id: true },
  });
  if (!listing) {
    return { ok: false as const, error: "not_found" as const };
  }

  const existing = await prisma.listingFavorite.findUnique({
    where: {
      userId_listingId: { userId: session.user.id, listingId },
    },
  });

  if (existing) {
    await prisma.listingFavorite.delete({ where: { id: existing.id } });
    revalidatePath(`/listings/${listingId}`);
    return { ok: true as const, favorited: false as const };
  }

  await prisma.listingFavorite.create({
    data: { userId: session.user.id, listingId },
  });
  revalidatePath(`/listings/${listingId}`);
  return { ok: true as const, favorited: true as const };
}

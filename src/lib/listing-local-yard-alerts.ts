import { prisma } from "@/lib/db";
import { createNotification } from "@/lib/notifications";
import { haversineMiles } from "@/lib/geo";
import { revalidatePath } from "next/cache";

const RADIUS_MILES = 50;

export async function syncListingLocalYardAlerts(listingId: string): Promise<void> {
  const listing = await prisma.listing.findUnique({
    where: { id: listingId },
    select: {
      id: true,
      sellerId: true,
      status: true,
      listingKind: true,
      freeToCollector: true,
      notifyLocalYards: true,
      lat: true,
      lng: true,
      title: true,
    },
  });
  if (!listing) return;

  const eligible =
    listing.status === "active" &&
    listing.notifyLocalYards &&
    listing.listingKind === "sell" &&
    !listing.freeToCollector &&
    listing.lat != null &&
    listing.lng != null;

  if (!eligible) {
    await prisma.listingLocalYardAlert.deleteMany({ where: { listingId } });
    revalidatePath(`/listings/${listingId}`);
    revalidatePath("/dashboard/nearby-stock");
    return;
  }

  const yards = await prisma.user.findMany({
    where: { role: "reclamation_yard", id: { not: listing.sellerId } },
    select: {
      id: true,
      sellerProfile: { select: { lat: true, lng: true } },
    },
  });

  const target: { userId: string; miles: number }[] = [];
  for (const u of yards) {
    const lat = u.sellerProfile?.lat;
    const lng = u.sellerProfile?.lng;
    if (lat == null || lng == null) continue;
    const miles = haversineMiles(listing.lat!, listing.lng!, lat, lng);
    if (miles <= RADIUS_MILES) target.push({ userId: u.id, miles });
  }

  const targetIds = new Set(target.map((t) => t.userId));
  const milesByUser = new Map(target.map((t) => [t.userId, t.miles]));

  const newYardIds: string[] = [];

  await prisma.$transaction(async (tx) => {
    if (targetIds.size === 0) {
      await tx.listingLocalYardAlert.deleteMany({ where: { listingId } });
    } else {
      await tx.listingLocalYardAlert.deleteMany({
        where: { listingId, yardUserId: { notIn: [...targetIds] } },
      });
    }

    const existing = await tx.listingLocalYardAlert.findMany({
      where: { listingId },
      select: { yardUserId: true },
    });
    const existingSet = new Set(existing.map((e) => e.yardUserId));

    for (const uid of targetIds) {
      if (existingSet.has(uid)) continue;
      const d = milesByUser.get(uid)!;
      await tx.listingLocalYardAlert.create({
        data: {
          listingId,
          yardUserId: uid,
          distanceMiles: d,
          status: "PENDING",
        },
      });
      newYardIds.push(uid);
    }
  });

  for (const uid of newYardIds) {
    const d = milesByUser.get(uid)!;
    await createNotification({
      userId: uid,
      type: "local_stock_alert",
      title: "New stock near you",
      body: `A seller listed “${listing.title}” within about ${Math.round(d)} mi of your yard.`,
      linkUrl: "/dashboard/nearby-stock",
    });
  }

  revalidatePath(`/listings/${listingId}`);
  revalidatePath("/dashboard/nearby-stock");
}

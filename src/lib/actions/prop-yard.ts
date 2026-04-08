"use server";

import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { redirect } from "next/navigation";
import {
  billableWeeksFromRange,
  inclusiveHireDays,
  rangesOverlapUtc,
  startOfUtcDay,
} from "@/lib/prop-yard";
import type { PropRentalBookingStatus, PropRentalFulfillment } from "@/generated/prisma/client";

const BLOCKING: PropRentalBookingStatus[] = ["REQUESTED", "CONFIRMED", "OUT_ON_HIRE"];
const FULFILLMENTS: PropRentalFulfillment[] = [
  "COLLECT_AND_RETURN",
  "YARD_DELIVERS_AND_COLLECTS",
  "ARRANGE_SEPARATELY",
];

async function assertYard() {
  const session = await auth();
  if (!session?.user?.id) redirect("/auth/signin");
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { role: true },
  });
  if (user?.role !== "reclamation_yard") {
    redirect("/dashboard?error=" + encodeURIComponent("The Prop Yard is for reclamation yard accounts only."));
  }
  return session.user.id;
}

export async function createPropRentalOfferAction(formData: FormData): Promise<void> {
  const userId = await assertYard();
  const listingId = String(formData.get("listingId") ?? "").trim();
  const weeklyGbp = parseFloat(String(formData.get("weeklyHireGbp") ?? "").trim());
  const weeklyPence = Math.round(weeklyGbp * 100);
  const minimumHireWeeks = parseInt(String(formData.get("minimumHireWeeks") ?? "1"), 10);
  const yardHireNotes = String(formData.get("yardHireNotes") ?? "").trim() || null;

  if (
    !listingId ||
    !Number.isFinite(weeklyGbp) ||
    !Number.isFinite(weeklyPence) ||
    weeklyPence < 100 ||
    !Number.isFinite(minimumHireWeeks) ||
    minimumHireWeeks < 1 ||
    minimumHireWeeks > 52
  ) {
    redirect("/dashboard/prop-yard/offerings/new?error=" + encodeURIComponent("Choose a listing and a weekly hire of at least £1."));
  }

  const listing = await prisma.listing.findFirst({
    where: {
      id: listingId,
      sellerId: userId,
      status: "active",
      listingKind: "sell",
      freeToCollector: false,
    },
  });
  if (!listing) {
    redirect("/dashboard/prop-yard/offerings/new?error=" + encodeURIComponent("Only your active fixed-price listings can be offered for hire."));
  }

  await prisma.propRentalOffer.upsert({
    where: { listingId },
    create: {
      listingId,
      weeklyHirePence: weeklyPence,
      minimumHireWeeks,
      yardHireNotes,
      isActive: true,
    },
    update: {
      weeklyHirePence: weeklyPence,
      minimumHireWeeks,
      yardHireNotes,
      isActive: true,
    },
  });

  redirect("/dashboard/prop-yard");
}

export async function togglePropRentalOfferActiveAction(formData: FormData): Promise<void> {
  const userId = await assertYard();
  const offerId = String(formData.get("offerId") ?? "").trim();
  const next = String(formData.get("isActive") ?? "") === "true";
  if (!offerId) redirect("/dashboard/prop-yard");

  const offer = await prisma.propRentalOffer.findFirst({
    where: { id: offerId, listing: { sellerId: userId } },
  });
  if (!offer) redirect("/dashboard/prop-yard");

  await prisma.propRentalOffer.update({
    where: { id: offerId },
    data: { isActive: next },
  });
  redirect("/dashboard/prop-yard");
}

export async function addPropUnavailabilityAction(formData: FormData): Promise<void> {
  const userId = await assertYard();
  const offerId = String(formData.get("offerId") ?? "").trim();
  const startRaw = String(formData.get("startDate") ?? "").trim();
  const endRaw = String(formData.get("endDate") ?? "").trim();
  const note = String(formData.get("note") ?? "").trim() || null;

  const offer = await prisma.propRentalOffer.findFirst({
    where: { id: offerId, listing: { sellerId: userId } },
  });
  if (!offer) redirect("/dashboard/prop-yard");

  const hireStart = new Date(startRaw);
  const hireEnd = new Date(endRaw);
  if (Number.isNaN(hireStart.getTime()) || Number.isNaN(hireEnd.getTime()) || hireEnd < hireStart) {
    redirect(`/dashboard/prop-yard/offerings/${offerId}/calendar?error=` + encodeURIComponent("Invalid dates."));
  }

  await prisma.propRentalUnavailability.create({
    data: {
      offerId,
      startDate: startOfUtcDay(hireStart),
      endDate: startOfUtcDay(hireEnd),
      note,
    },
  });
  redirect(`/dashboard/prop-yard/offerings/${offerId}/calendar`);
}

async function validateAvailability(offerId: string, hireStart: Date, hireEnd: Date): Promise<void> {
  const blockingBookings = await prisma.propRentalBooking.findMany({
    where: { offerId, status: { in: BLOCKING } },
    select: { hireStart: true, hireEnd: true },
  });
  for (const b of blockingBookings) {
    if (rangesOverlapUtc(hireStart, hireEnd, b.hireStart, b.hireEnd)) {
      throw new Error("overlap-booking");
    }
  }

  const blocks = await prisma.propRentalUnavailability.findMany({
    where: { offerId },
    select: { startDate: true, endDate: true },
  });
  for (const u of blocks) {
    if (rangesOverlapUtc(hireStart, hireEnd, u.startDate, u.endDate)) {
      throw new Error("overlap-blackout");
    }
  }
}

export async function upsertPropBasketItemAction(formData: FormData): Promise<void> {
  const session = await auth();
  if (!session?.user?.id) redirect("/auth/signin?callbackUrl=/prop-yard");

  const offerId = String(formData.get("offerId") ?? "").trim();
  const startRaw = String(formData.get("hireStart") ?? "").trim();
  const endRaw = String(formData.get("hireEnd") ?? "").trim();
  const fulfillment = String(formData.get("fulfillment") ?? "").trim() as PropRentalFulfillment;
  const hirerOrgName = String(formData.get("hirerOrgName") ?? "").trim() || null;
  const productionNotes = String(formData.get("productionNotes") ?? "").trim() || null;
  const deliveryArrangementNotes = String(formData.get("deliveryArrangementNotes") ?? "").trim() || null;
  const returnTo = String(formData.get("returnTo") ?? "/prop-yard/basket");

  if (!offerId || !FULFILLMENTS.includes(fulfillment)) {
    redirect(`/prop-yard/offers/${offerId}?error=` + encodeURIComponent("Complete all required fields."));
  }

  const hireStart = startOfUtcDay(new Date(startRaw));
  const hireEnd = startOfUtcDay(new Date(endRaw));
  if (Number.isNaN(hireStart.getTime()) || Number.isNaN(hireEnd.getTime()) || hireEnd < hireStart) {
    redirect(`/prop-yard/offers/${offerId}?error=` + encodeURIComponent("Choose valid hire dates."));
  }
  const days = inclusiveHireDays(hireStart, hireEnd);
  if (days > 365) {
    redirect(`/prop-yard/offers/${offerId}?error=` + encodeURIComponent("Maximum hire window is 365 days."));
  }

  const offer = await prisma.propRentalOffer.findFirst({
    where: {
      id: offerId,
      isActive: true,
      listing: { status: "active", listingKind: "sell", freeToCollector: false },
    },
    include: { listing: true },
  });
  if (!offer) {
    redirect("/prop-yard/search?error=" + encodeURIComponent("This prop is no longer available for hire."));
  }
  if (offer.listing.sellerId === session.user.id) {
    redirect(`/prop-yard/offers/${offerId}?error=` + encodeURIComponent("You cannot hire your own stock."));
  }
  const weeks = billableWeeksFromRange(hireStart, hireEnd);
  if (weeks < offer.minimumHireWeeks) {
    redirect(
      `/prop-yard/offers/${offerId}?error=` +
        encodeURIComponent(`Minimum hire is ${offer.minimumHireWeeks} week(s) for this prop.`)
    );
  }

  await prisma.propRentalBasketItem.upsert({
    where: { userId_offerId: { userId: session.user.id, offerId } },
    create: {
      userId: session.user.id,
      offerId,
      hireStart,
      hireEnd,
      fulfillment,
      hirerOrgName,
      productionNotes,
      deliveryArrangementNotes,
    },
    update: {
      hireStart,
      hireEnd,
      fulfillment,
      hirerOrgName,
      productionNotes,
      deliveryArrangementNotes,
    },
  });

  redirect(returnTo);
}

export async function removePropBasketItemAction(formData: FormData): Promise<void> {
  const session = await auth();
  if (!session?.user?.id) redirect("/auth/signin?callbackUrl=/prop-yard/basket");
  const basketItemId = String(formData.get("basketItemId") ?? "").trim();
  if (!basketItemId) redirect("/prop-yard/basket");
  await prisma.propRentalBasketItem.deleteMany({
    where: { id: basketItemId, userId: session.user.id },
  });
  redirect("/prop-yard/basket");
}

export async function submitPropBasketRequestsAction(formData: FormData): Promise<void> {
  const session = await auth();
  if (!session?.user?.id) redirect("/auth/signin?callbackUrl=/prop-yard/basket");
  const contractOk = formData.get("contractAccepted") === "on";
  if (!contractOk) {
    redirect("/prop-yard/basket?error=" + encodeURIComponent("You must accept the Prop Yard hire terms."));
  }

  const items = await prisma.propRentalBasketItem.findMany({
    where: { userId: session.user.id },
    include: {
      offer: { include: { listing: true } },
    },
    orderBy: { createdAt: "asc" },
  });
  if (items.length === 0) redirect("/prop-yard/basket?error=" + encodeURIComponent("Your basket is empty."));

  let created = 0;
  const affectedYards = new Set<string>();

  await prisma.$transaction(async (tx) => {
    for (const item of items) {
      const offer = item.offer;
      if (
        !offer.isActive ||
        offer.listing.status !== "active" ||
        offer.listing.listingKind !== "sell" ||
        offer.listing.freeToCollector
      ) {
        continue;
      }
      if (offer.listing.sellerId === session.user.id) continue;

      const weeks = billableWeeksFromRange(item.hireStart, item.hireEnd);
      if (weeks < offer.minimumHireWeeks) continue;

      try {
        await validateAvailability(offer.id, item.hireStart, item.hireEnd);
      } catch {
        continue;
      }

      await tx.propRentalBooking.create({
        data: {
          offerId: offer.id,
          hirerId: session.user.id,
          hireStart: item.hireStart,
          hireEnd: item.hireEnd,
          billableWeeks: weeks,
          totalHirePence: weeks * offer.weeklyHirePence,
          status: "REQUESTED",
          fulfillment: item.fulfillment,
          contractAcceptedAt: new Date(),
          hirerOrgName: item.hirerOrgName,
          productionNotes: item.productionNotes,
          deliveryArrangementNotes: item.deliveryArrangementNotes,
        },
      });
      affectedYards.add(offer.listing.sellerId);
      created += 1;
    }

    await tx.propRentalBasketItem.deleteMany({
      where: { userId: session.user.id },
    });
  });

  if (created === 0) {
    redirect("/prop-yard/basket?error=" + encodeURIComponent("No requests were sent. Check dates/minimum periods."));
  }
  redirect(
    `/prop-yard/hires/success?sent=${created}&yards=${affectedYards.size}`
  );
}

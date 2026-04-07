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
  const yardHireNotes = String(formData.get("yardHireNotes") ?? "").trim() || null;

  if (!listingId || !Number.isFinite(weeklyGbp) || !Number.isFinite(weeklyPence) || weeklyPence < 100) {
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
      yardHireNotes,
      isActive: true,
    },
    update: {
      weeklyHirePence: weeklyPence,
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

export async function requestPropRentalBookingAction(formData: FormData): Promise<void> {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/auth/signin?callbackUrl=/prop-yard");
  }

  const offerId = String(formData.get("offerId") ?? "").trim();
  const startRaw = String(formData.get("hireStart") ?? "").trim();
  const endRaw = String(formData.get("hireEnd") ?? "").trim();
  const fulfillment = String(formData.get("fulfillment") ?? "").trim() as PropRentalFulfillment;
  const hirerOrgName = String(formData.get("hirerOrgName") ?? "").trim();
  const productionNotes = String(formData.get("productionNotes") ?? "").trim() || null;
  const deliveryArrangementNotes = String(formData.get("deliveryArrangementNotes") ?? "").trim() || null;
  const contractOk = formData.get("contractAccepted") === "on";

  const validFulfillment: PropRentalFulfillment[] = [
    "COLLECT_AND_RETURN",
    "YARD_DELIVERS_AND_COLLECTS",
    "ARRANGE_SEPARATELY",
  ];
  if (!offerId || !contractOk || !validFulfillment.includes(fulfillment)) {
    redirect(`/prop-yard/offers/${offerId}?error=` + encodeURIComponent("Complete all fields and accept the hire terms."));
  }
  if (!hirerOrgName) {
    redirect(`/prop-yard/offers/${offerId}?error=` + encodeURIComponent("Enter your production company or department name."));
  }

  const hireStart = startOfUtcDay(new Date(startRaw));
  const hireEnd = startOfUtcDay(new Date(endRaw));
  if (Number.isNaN(hireStart.getTime()) || Number.isNaN(hireEnd.getTime()) || hireEnd < hireStart) {
    redirect(`/prop-yard/offers/${offerId}?error=` + encodeURIComponent("Choose valid hire dates."));
  }

  const days = inclusiveHireDays(hireStart, hireEnd);
  if (days > 365) {
    redirect(`/prop-yard/offers/${offerId}?error=` + encodeURIComponent("Maximum hire window is 365 days; contact the yard for longer."));
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
  const totalHirePence = weeks * offer.weeklyHirePence;

  const blockingBookings = await prisma.propRentalBooking.findMany({
    where: { offerId, status: { in: BLOCKING } },
    select: { hireStart: true, hireEnd: true },
  });
  for (const b of blockingBookings) {
    if (rangesOverlapUtc(hireStart, hireEnd, b.hireStart, b.hireEnd)) {
      redirect(`/prop-yard/offers/${offerId}?error=` + encodeURIComponent("Those dates overlap an existing hire request or booking."));
    }
  }

  const blocks = await prisma.propRentalUnavailability.findMany({
    where: { offerId },
    select: { startDate: true, endDate: true },
  });
  for (const u of blocks) {
    if (rangesOverlapUtc(hireStart, hireEnd, u.startDate, u.endDate)) {
      redirect(`/prop-yard/offers/${offerId}?error=` + encodeURIComponent("The yard has blocked part of that window; choose different dates."));
    }
  }

  await prisma.propRentalBooking.create({
    data: {
      offerId,
      hirerId: session.user.id,
      hireStart,
      hireEnd,
      billableWeeks: weeks,
      totalHirePence,
      status: "REQUESTED",
      fulfillment,
      contractAcceptedAt: new Date(),
      hirerOrgName,
      productionNotes,
      deliveryArrangementNotes,
    },
  });

  redirect(`/prop-yard/hires/success?offerId=${encodeURIComponent(offerId)}`);
}

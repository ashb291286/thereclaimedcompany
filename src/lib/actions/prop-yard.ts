"use server";

import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { slugifyCategoryName } from "@/lib/category-suggest";
import { lookupUkPostcode } from "@/lib/postcode-uk";
import { STRIPE_MIN_AMOUNT_PENCE } from "@/lib/constants";
import { syncListingLocalYardAlerts } from "@/lib/listing-local-yard-alerts";
import { ListingPricingMode, ListingStatus, type Condition } from "@/generated/prisma/client";
import {
  billableWeeksFromRange,
  computePropHireTotalPence,
  inclusiveHireDays,
  rangesOverlapUtc,
  startOfUtcDay,
  utcCalendarDateToIso,
} from "@/lib/prop-yard";
import type { PropRentalBookingStatus, PropRentalFulfillment } from "@/generated/prisma/client";
import { randomUUID } from "crypto";

const BLOCKING: PropRentalBookingStatus[] = ["REQUESTED", "CONFIRMED", "OUT_ON_HIRE"];
const FULFILLMENTS: PropRentalFulfillment[] = [
  "COLLECT_AND_RETURN",
  "YARD_DELIVERS_AND_COLLECTS",
  "ARRANGE_SEPARATELY",
];

const PROP_ONLY_CONDITIONS: Condition[] = [
  "like_new",
  "used",
  "worn",
  "parts_not_working",
  "refurbished",
  "upcycled",
  "collectable",
];

const YARD_BOOKING_STATUS_VALUES: PropRentalBookingStatus[] = [
  "REQUESTED",
  "CONFIRMED",
  "OUT_ON_HIRE",
  "RETURNED",
  "CANCELLED",
  "DECLINED",
];

function safePropYardRedirect(raw: unknown, fallback: string): string {
  const s = typeof raw === "string" ? raw.trim() : "";
  if (!s.startsWith("/dashboard/prop-yard") || s.startsWith("//")) return fallback;
  return s;
}

/** Hide marketplace listing while at least one booking is OUT_ON_HIRE; restore when none remain. */
async function syncListingMarketplaceVisibilityForOffer(offerId: string) {
  const offer = await prisma.propRentalOffer.findUnique({
    where: { id: offerId },
    select: { id: true, listingId: true },
  });
  if (!offer) return;

  const listing = await prisma.listing.findUnique({ where: { id: offer.listingId } });
  if (!listing) return;

  const outOnHireCount = await prisma.propRentalBooking.count({
    where: { offerId: offer.id, status: "OUT_ON_HIRE" },
  });

  if (outOnHireCount > 0) {
    if (listing.visibleOnMarketplace) {
      await prisma.listing.update({
        where: { id: listing.id },
        data: { visibleOnMarketplace: false, marketplaceVisibleBeforePropHirePause: true },
      });
    }
  } else if (listing.marketplaceVisibleBeforePropHirePause === true) {
    await prisma.listing.update({
      where: { id: listing.id },
      data: { visibleOnMarketplace: true, marketplaceVisibleBeforePropHirePause: null },
    });
  }

  revalidatePath(`/listings/${listing.id}`);
  revalidatePath("/prop-yard/search");
  revalidatePath("/dashboard/prop-yard");
  revalidatePath("/prop-yard/dashboard");
}

/** Reclamation yards or any user with a seller profile may create and manage prop hire offers for their listings. */
async function assertPropOfferSeller() {
  const session = await auth();
  if (!session?.user?.id) redirect("/auth/signin");
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { role: true, sellerProfile: { select: { id: true } } },
  });
  const allowed = user?.role === "reclamation_yard" || !!user?.sellerProfile;
  if (!user || !allowed) {
    redirect(
      "/dashboard?error=" +
        encodeURIComponent("Complete seller onboarding to offer props for hire from your listings.")
    );
  }
  return session.user.id;
}

export async function createPropRentalOfferAction(formData: FormData): Promise<void> {
  const userId = await assertPropOfferSeller();
  const errBase = safePropYardRedirect(formData.get("_errorReturn"), "/dashboard/prop-yard/offerings/new");
  const okBase = safePropYardRedirect(formData.get("_successReturn"), "/dashboard/prop-yard");

  const listingId = String(formData.get("listingId") ?? "").trim();
  const weeklyGbp = parseFloat(String(formData.get("weeklyHireGbp") ?? "").trim());
  const weeklyPence = Math.round(weeklyGbp * 100);
  const minimumHireWeeks = parseInt(String(formData.get("minimumHireWeeks") ?? "1"), 10);
  const yardHireNotes = String(formData.get("yardHireNotes") ?? "").trim() || null;
  const offersDelivery =
    formData.get("offersDelivery") === "on" || formData.get("offersDelivery") === "true";
  const deliveryNotes = String(formData.get("deliveryNotes") ?? "").trim() || null;

  if (
    !listingId ||
    !Number.isFinite(weeklyGbp) ||
    !Number.isFinite(weeklyPence) ||
    weeklyPence < 100 ||
    !Number.isFinite(minimumHireWeeks) ||
    minimumHireWeeks < 1 ||
    minimumHireWeeks > 52
  ) {
    redirect(errBase + "?error=" + encodeURIComponent("Choose a listing and a weekly hire of at least £1."));
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
    redirect(errBase + "?error=" + encodeURIComponent("Only your active fixed-price listings can be offered for hire."));
  }

  await prisma.$transaction([
    prisma.propRentalOffer.upsert({
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
    }),
    prisma.listing.update({
      where: { id: listingId },
      data: { offersDelivery, deliveryNotes },
    }),
  ]);

  revalidatePath(`/listings/${listingId}`);

  redirect(okBase.includes("?") ? `${okBase}&saved=1` : `${okBase}?saved=1`);
}

export async function createPropOnlyListingAndOfferAction(formData: FormData): Promise<void> {
  const userId = await assertPropOfferSeller();
  const errBase = safePropYardRedirect(formData.get("_errorReturn"), "/dashboard/prop-yard/props/new");
  const okBase = safePropYardRedirect(formData.get("_successReturn"), "/dashboard/prop-yard");
  const bail = (msg: string) => redirect(errBase + "?error=" + encodeURIComponent(msg));

  const title = String(formData.get("title") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const condition = String(formData.get("condition") ?? "").trim() as Condition;
  if (!title || !description) bail("Title and description are required.");
  if (!PROP_ONLY_CONDITIONS.includes(condition)) bail("Choose a valid condition.");

  const newCategoryName = String(formData.get("newCategoryName") ?? "").trim();
  let categoryId = String(formData.get("categoryId") ?? "").trim();
  if (newCategoryName.length > 0) {
    const slug = slugifyCategoryName(newCategoryName);
    if (!slug) bail("Suggested category name is not valid.");
    const cat = await prisma.category.upsert({
      where: { slug },
      create: { name: newCategoryName.slice(0, 120), slug },
      update: { name: newCategoryName.slice(0, 120) },
    });
    categoryId = cat.id;
  } else if (!categoryId) {
    bail("Category is required.");
  } else {
    const exists = await prisma.category.findUnique({ where: { id: categoryId } });
    if (!exists) bail("Invalid category.");
  }

  const postcodeRaw = String(formData.get("postcode") ?? "").trim();
  if (!postcodeRaw) bail("Postcode is required.");
  const resolvedPostcode = await lookupUkPostcode(postcodeRaw);
  if (!resolvedPostcode) bail("Use a full valid UK postcode.");

  const imagesStr = String(formData.get("images") ?? "").trim();
  const images = imagesStr ? imagesStr.split(",").map((s) => s.trim()).filter(Boolean) : [];
  if (images.length === 0) bail("Add at least one image URL (upload on List an item, then paste URLs).");

  const listPriceGbp = parseFloat(String(formData.get("listPriceGbp") ?? "").trim());
  const listPricePence = Math.round(listPriceGbp * 100);
  if (!Number.isFinite(listPriceGbp) || listPricePence < STRIPE_MIN_AMOUNT_PENCE) {
    bail(
      `Reference list price must be at least £${(STRIPE_MIN_AMOUNT_PENCE / 100).toFixed(2)} (used for hire suggestions, not a live checkout price).`
    );
  }

  const weeklyGbp = parseFloat(String(formData.get("weeklyHireGbp") ?? "").trim());
  const weeklyPence = Math.round(weeklyGbp * 100);
  const minimumHireWeeks = parseInt(String(formData.get("minimumHireWeeks") ?? "1"), 10);
  const yardHireNotes = String(formData.get("yardHireNotes") ?? "").trim() || null;
  const offersDelivery =
    formData.get("offersDelivery") === "on" || formData.get("offersDelivery") === "true";
  const deliveryNotes = String(formData.get("deliveryNotes") ?? "").trim() || null;

  if (
    !Number.isFinite(weeklyGbp) ||
    weeklyPence < 100 ||
    !Number.isFinite(minimumHireWeeks) ||
    minimumHireWeeks < 1 ||
    minimumHireWeeks > 52
  ) {
    bail("Weekly hire must be at least £1 and minimum weeks between 1 and 52.");
  }

  const listing = await prisma.$transaction(async (tx) => {
    const p = resolvedPostcode!;
    const l = await tx.listing.create({
      data: {
        sellerId: userId,
        title,
        description,
        price: listPricePence,
        condition,
        categoryId,
        postcode: p.postcode,
        lat: p.lat,
        lng: p.lng,
        adminDistrict: p.adminDistrict,
        region: p.region,
        images,
        status: ListingStatus.active,
        listingKind: "sell",
        freeToCollector: false,
        visibleOnMarketplace: false,
        notifyLocalYards: false,
        offersDelivery,
        deliveryNotes,
        pricingMode: ListingPricingMode.LOT,
      },
    });
    await tx.propRentalOffer.create({
      data: {
        listingId: l.id,
        weeklyHirePence: weeklyPence,
        minimumHireWeeks,
        yardHireNotes,
        isActive: true,
      },
    });
    return l;
  });

  await syncListingLocalYardAlerts(listing.id);
  redirect(okBase.includes("?") ? `${okBase}&saved=1` : `${okBase}?saved=1`);
}

export async function updatePropRentalBookingStatusAction(formData: FormData): Promise<void> {
  const userId = await assertPropOfferSeller();
  const bookingId = String(formData.get("bookingId") ?? "").trim();
  const next = String(formData.get("status") ?? "").trim() as PropRentalBookingStatus;
  if (!bookingId || !YARD_BOOKING_STATUS_VALUES.includes(next)) {
    redirect("/dashboard/prop-yard?error=" + encodeURIComponent("Invalid status change."));
  }

  const booking = await prisma.propRentalBooking.findFirst({
    where: { id: bookingId },
    include: { offer: { include: { listing: true } } },
  });
  if (!booking || booking.offer.listing.sellerId !== userId) {
    redirect("/dashboard/prop-yard?error=" + encodeURIComponent("Booking not found."));
  }

  await prisma.propRentalBooking.update({
    where: { id: bookingId },
    data: { status: next },
  });
  await syncListingMarketplaceVisibilityForOffer(booking.offerId);

  redirect(`/dashboard/prop-yard/offerings/${booking.offerId}/calendar`);
}

export async function togglePropRentalOfferActiveAction(formData: FormData): Promise<void> {
  const userId = await assertPropOfferSeller();
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
  const userId = await assertPropOfferSeller();
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

function parseSetDefaultHireWindow(formData: FormData): {
  defaultHireStart: Date | null;
  defaultHireEnd: Date | null;
} | { error: string } {
  const ds = String(formData.get("defaultHireStart") ?? "").trim();
  const de = String(formData.get("defaultHireEnd") ?? "").trim();
  if (!ds && !de) return { defaultHireStart: null, defaultHireEnd: null };
  if (!ds || !de) return { error: "Enter both a default hire start and end date, or leave both blank." };
  const hireStart = startOfUtcDay(new Date(ds));
  const hireEnd = startOfUtcDay(new Date(de));
  if (Number.isNaN(hireStart.getTime()) || Number.isNaN(hireEnd.getTime()) || hireEnd < hireStart) {
    return { error: "Default hire dates are invalid (end must be on or after start)." };
  }
  if (inclusiveHireDays(hireStart, hireEnd) > 365) {
    return { error: "Default hire window cannot exceed 365 days." };
  }
  return { defaultHireStart: hireStart, defaultHireEnd: hireEnd };
}

export async function createPropRentalSetAction(formData: FormData): Promise<void> {
  const session = await auth();
  if (!session?.user?.id) redirect("/auth/signin?callbackUrl=/prop-yard/sets");
  const rawName = String(formData.get("name") ?? "").trim();
  const name = rawName.slice(0, 120) || "Untitled set";
  const window = parseSetDefaultHireWindow(formData);
  if ("error" in window) {
    redirect("/prop-yard/sets?error=" + encodeURIComponent(window.error));
  }
  const set = await prisma.propRentalSet.create({
    data: {
      userId: session.user.id,
      name,
      defaultHireStart: window.defaultHireStart,
      defaultHireEnd: window.defaultHireEnd,
    },
  });
  redirect(`/prop-yard/set/${set.id}`);
}

export async function updatePropRentalSetNameAction(formData: FormData): Promise<void> {
  const session = await auth();
  if (!session?.user?.id) redirect("/auth/signin");
  const setId = String(formData.get("setId") ?? "").trim();
  const rawName = String(formData.get("name") ?? "").trim();
  if (!setId || !rawName) redirect("/prop-yard/sets");
  await prisma.propRentalSet.updateMany({
    where: { id: setId, userId: session.user.id },
    data: { name: rawName.slice(0, 120) },
  });
  redirect(`/prop-yard/set/${setId}`);
}

export async function updatePropRentalSetHireWindowAction(formData: FormData): Promise<void> {
  const session = await auth();
  if (!session?.user?.id) redirect("/auth/signin");
  const setId = String(formData.get("setId") ?? "").trim();
  if (!setId) redirect("/prop-yard/sets");
  const window = parseSetDefaultHireWindow(formData);
  if ("error" in window) {
    redirect(`/prop-yard/set/${setId}?error=` + encodeURIComponent(window.error));
  }
  const n = await prisma.propRentalSet.updateMany({
    where: { id: setId, userId: session.user.id },
    data: {
      defaultHireStart: window.defaultHireStart,
      defaultHireEnd: window.defaultHireEnd,
    },
  });
  if (n.count === 0) redirect("/prop-yard/sets?error=" + encodeURIComponent("Set not found."));
  redirect(`/prop-yard/set/${setId}`);
}

export async function deletePropRentalSetAction(formData: FormData): Promise<void> {
  const session = await auth();
  if (!session?.user?.id) redirect("/auth/signin");
  const setId = String(formData.get("setId") ?? "").trim();
  if (!setId) redirect("/prop-yard/sets");
  await prisma.propRentalSet.deleteMany({
    where: { id: setId, userId: session.user.id },
  });
  redirect("/prop-yard/sets");
}

export async function upsertPropSetItemAction(formData: FormData): Promise<void> {
  const session = await auth();
  if (!session?.user?.id) redirect("/auth/signin?callbackUrl=/prop-yard/sets");

  const setId = String(formData.get("setId") ?? "").trim();
  const offerId = String(formData.get("offerId") ?? "").trim();
  const startRaw = String(formData.get("hireStart") ?? "").trim();
  const endRaw = String(formData.get("hireEnd") ?? "").trim();
  const fulfillment = String(formData.get("fulfillment") ?? "").trim() as PropRentalFulfillment;
  const hirerOrgName = String(formData.get("hirerOrgName") ?? "").trim() || null;
  const productionNotes = String(formData.get("productionNotes") ?? "").trim() || null;
  const deliveryArrangementNotes = String(formData.get("deliveryArrangementNotes") ?? "").trim() || null;
  const returnTo = String(formData.get("returnTo") ?? `/prop-yard/set/${setId}`);

  if (!setId || !offerId || !FULFILLMENTS.includes(fulfillment)) {
    redirect(
      `/prop-yard/offers/${offerId}?setId=${encodeURIComponent(setId)}&error=` +
        encodeURIComponent("Complete all required fields.")
    );
  }

  const set = await prisma.propRentalSet.findFirst({
    where: { id: setId, userId: session.user.id },
    select: { id: true, defaultHireStart: true, defaultHireEnd: true },
  });
  if (!set) {
    redirect("/prop-yard/sets?error=" + encodeURIComponent("That set was not found or you do not have access."));
  }

  const useStartRaw =
    startRaw ||
    (set.defaultHireStart != null && set.defaultHireEnd != null
      ? utcCalendarDateToIso(set.defaultHireStart)
      : "");
  const useEndRaw =
    endRaw ||
    (set.defaultHireStart != null && set.defaultHireEnd != null ? utcCalendarDateToIso(set.defaultHireEnd) : "");

  const hireStart = startOfUtcDay(new Date(useStartRaw));
  const hireEnd = startOfUtcDay(new Date(useEndRaw));
  if (
    !useStartRaw ||
    !useEndRaw ||
    Number.isNaN(hireStart.getTime()) ||
    Number.isNaN(hireEnd.getTime()) ||
    hireEnd < hireStart
  ) {
    redirect(`/prop-yard/offers/${offerId}?setId=${encodeURIComponent(setId)}&error=` + encodeURIComponent("Choose valid hire dates."));
  }
  const days = inclusiveHireDays(hireStart, hireEnd);
  if (days > 365) {
    redirect(`/prop-yard/offers/${offerId}?setId=${encodeURIComponent(setId)}&error=` + encodeURIComponent("Maximum hire window is 365 days."));
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
    redirect(`/prop-yard/offers/${offerId}?setId=${encodeURIComponent(setId)}&error=` + encodeURIComponent("You cannot hire your own stock."));
  }
  const weeks = billableWeeksFromRange(hireStart, hireEnd);
  if (weeks < offer.minimumHireWeeks) {
    redirect(
      `/prop-yard/offers/${offerId}?setId=${encodeURIComponent(setId)}&error=` +
        encodeURIComponent(`Minimum hire is ${offer.minimumHireWeeks} week(s) for this prop.`)
    );
  }

  await prisma.propRentalSetItem.upsert({
    where: { setId_offerId: { setId, offerId } },
    create: {
      setId,
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

export async function removePropSetItemAction(formData: FormData): Promise<void> {
  const session = await auth();
  if (!session?.user?.id) redirect("/auth/signin?callbackUrl=/prop-yard/sets");
  const setItemId = String(formData.get("setItemId") ?? "").trim();
  const setId = String(formData.get("setId") ?? "").trim();
  if (!setItemId || !setId) redirect("/prop-yard/sets");
  await prisma.propRentalSetItem.deleteMany({
    where: {
      id: setItemId,
      set: { id: setId, userId: session.user.id },
    },
  });
  redirect(`/prop-yard/set/${setId}`);
}

export async function submitPropSetRequestsAction(formData: FormData): Promise<void> {
  const session = await auth();
  if (!session?.user?.id) redirect("/auth/signin?callbackUrl=/prop-yard/sets");
  const setId = String(formData.get("setId") ?? "").trim();
  const contractOk = formData.get("contractAccepted") === "on";
  if (!setId) redirect("/prop-yard/sets?error=" + encodeURIComponent("Missing set."));
  if (!contractOk) {
    redirect(`/prop-yard/set/${setId}?error=` + encodeURIComponent("You must accept the Prop Yard hire terms."));
  }

  const set = await prisma.propRentalSet.findFirst({
    where: { id: setId, userId: session.user.id },
    select: { id: true },
  });
  if (!set) redirect("/prop-yard/sets?error=" + encodeURIComponent("Set not found."));

  const items = await prisma.propRentalSetItem.findMany({
    where: { setId },
    include: {
      offer: { include: { listing: true } },
    },
    orderBy: { createdAt: "asc" },
  });
  if (items.length === 0) {
    redirect(`/prop-yard/set/${setId}?error=` + encodeURIComponent("This set has no props yet."));
  }

  let created = 0;
  const affectedYards = new Set<string>();
  const batchId = randomUUID();

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

      const totalHirePence = computePropHireTotalPence(
        item.hireStart,
        item.hireEnd,
        offer.minimumHireWeeks,
        offer.weeklyHirePence
      );

      await tx.propRentalBooking.create({
        data: {
          offerId: offer.id,
          hirerId: session.user.id,
          hireStart: item.hireStart,
          hireEnd: item.hireEnd,
          billableWeeks: weeks,
          totalHirePence,
          status: "REQUESTED",
          fulfillment: item.fulfillment,
          contractAcceptedAt: new Date(),
          hirerOrgName: item.hirerOrgName,
          productionNotes: item.productionNotes,
          deliveryArrangementNotes: item.deliveryArrangementNotes,
          hireRequestBatchId: batchId,
          propRentalSetId: setId,
        },
      });
      affectedYards.add(offer.listing.sellerId);
      created += 1;
    }
  });

  if (created === 0) {
    redirect(
      `/prop-yard/set/${setId}?error=` + encodeURIComponent("No requests were sent. Check dates/minimum periods.")
    );
  }
  redirect(
    `/prop-yard/hires/success?batchId=${encodeURIComponent(batchId)}&setId=${encodeURIComponent(setId)}&sent=${created}&yards=${affectedYards.size}`
  );
}

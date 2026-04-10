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
import { createNotification } from "@/lib/notifications";
import { isCarbonAdmin } from "@/lib/admin";
import { parsePropSetProductionType } from "@/lib/prop-yard-set-production";

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
        postcodeLocality: p.postcodeLocality,
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

export async function savePropListingDraftAction(formData: FormData): Promise<void> {
  const userId = await assertPropOfferSeller();
  const payloadRaw = String(formData.get("payloadJson") ?? "").trim();
  if (!payloadRaw) return;
  let payload: unknown;
  try {
    payload = JSON.parse(payloadRaw);
  } catch {
    return;
  }
  const listingIdRaw = String(formData.get("listingId") ?? "").trim();
  const listingId = listingIdRaw || null;
  const existing = await prisma.propListingDraft.findFirst({ where: { yardId: userId, listingId } });
  if (existing) {
    await prisma.propListingDraft.update({ where: { id: existing.id }, data: { payload: payload as object } });
  } else {
    await prisma.propListingDraft.create({ data: { yardId: userId, listingId, payload: payload as object } });
  }
}

export async function loadLatestPropListingDraftAction(): Promise<unknown | null> {
  const userId = await assertPropOfferSeller();
  const draft = await prisma.propListingDraft.findFirst({
    where: { yardId: userId },
    orderBy: { updatedAt: "desc" },
    select: { payload: true },
  });
  return draft?.payload ?? null;
}

export async function deletePropListingDraftAction(): Promise<void> {
  const userId = await assertPropOfferSeller();
  await prisma.propListingDraft.deleteMany({ where: { yardId: userId } });
}

export async function createPropComprehensiveListingAction(formData: FormData): Promise<void> {
  const userId = await assertPropOfferSeller();
  const okBase = safePropYardRedirect(formData.get("_successReturn"), "/dashboard/prop-yard");
  const errBase = safePropYardRedirect(formData.get("_errorReturn"), "/dashboard/prop-yard/wizard");
  const payloadRaw = String(formData.get("payloadJson") ?? "").trim();
  const publishIntent = String(formData.get("publishIntent") ?? "publish").trim();
  const shouldPublish = publishIntent !== "draft";
  if (!payloadRaw) redirect(`${errBase}?error=${encodeURIComponent("Missing listing payload.")}`);

  let payload: Record<string, unknown>;
  try {
    payload = JSON.parse(payloadRaw) as Record<string, unknown>;
  } catch {
    redirect(`${errBase}?error=${encodeURIComponent("Invalid listing payload.")}`);
  }

  const name = String(payload.name ?? "").trim();
  const descriptionBody = String(
    payload.description ?? payload.descriptionShort ?? payload.descriptionFull ?? ""
  ).trim();
  const descriptionShort = descriptionBody.slice(0, 300);
  const descriptionFull = descriptionBody;
  const categoryName = String(payload.category ?? "").trim();
  const subcategory = String(payload.subcategory ?? "").trim();
  const quantityAvailable = Number(payload.quantityAvailable ?? 1);
  const images = Array.isArray(payload.images) ? payload.images.map((x) => String(x).trim()).filter(Boolean) : [];
  const conditionRaw = String(payload.condition ?? "").trim() as Condition;
  const conditionNotes = String(payload.conditionNotes ?? "").trim();
  const genres = Array.isArray(payload.genres) ? payload.genres.map((x) => String(x)) : [];
  const eras = Array.isArray(payload.eras) ? payload.eras.map((x) => String(x)) : [];

  if (shouldPublish && (!name || !descriptionBody || !categoryName || !PROP_ONLY_CONDITIONS.includes(conditionRaw))) {
    redirect(`${errBase}?error=${encodeURIComponent("Complete all required fields before publishing.")}`);
  }
  if (shouldPublish && images.length < 1) {
    redirect(`${errBase}?error=${encodeURIComponent("Add at least one photo before publishing.")}`);
  }
  if (shouldPublish && (genres.length < 1 || eras.length < 1)) {
    redirect(`${errBase}?error=${encodeURIComponent("Add at least one era and one genre tag.")}`);
  }

  const postcodeRaw = String(payload.collectionAddress ?? "").trim();
  const resolvedPostcode = postcodeRaw ? await lookupUkPostcode(postcodeRaw) : null;
  const categorySlug = slugifyCategoryName(categoryName);
  if (!categorySlug) redirect(`${errBase}?error=${encodeURIComponent("Invalid category.")}`);
  const category = await prisma.category.upsert({
    where: { slug: categorySlug },
    create: { slug: categorySlug, name: categoryName.slice(0, 120) },
    update: { name: categoryName.slice(0, 120) },
  });

  const hireEnabled = Boolean(payload.hireEnabled);
  const saleEnabled = Boolean(payload.saleEnabled);
  const hirePriceWeekPence = Math.round(Number(payload.hirePriceWeekGbp ?? 0) * 100);
  const salePricePence = Math.round(Number(payload.salePriceGbp ?? 0) * 100);
  if (shouldPublish && !hireEnabled && !saleEnabled) redirect(`${errBase}?error=${encodeURIComponent("Enable hire and/or sale.")}`);
  if (shouldPublish && hireEnabled && hirePriceWeekPence < 100) redirect(`${errBase}?error=${encodeURIComponent("Hire price must be at least £1.")}`);
  if (shouldPublish && saleEnabled && salePricePence < 100) redirect(`${errBase}?error=${encodeURIComponent("Sale price must be at least £1.")}`);

  const listing = await prisma.listing.create({
    data: {
      sellerId: userId,
      title: name,
      description: descriptionBody,
      descriptionShort,
      descriptionFull,
      price: saleEnabled ? salePricePence : Math.max(hirePriceWeekPence, 100),
      condition: conditionRaw,
      conditionGrade: null,
      categoryId: category.id,
      propSubcategory: subcategory || null,
      quantityAvailable: Number.isFinite(quantityAvailable) ? quantityAvailable : 1,
      dimensionsH: Number(payload.dimensionsH ?? 0) || null,
      dimensionsW: Number(payload.dimensionsW ?? 0) || null,
      dimensionsD: Number(payload.dimensionsD ?? 0) || null,
      weightKg: Number(payload.weightKg ?? 0) || null,
      propMaterials: [],
      propColours: [],
      colourHex: null,
      colourName: null,
      eraTags: eras,
      dateSpecific: String(payload.dateSpecific ?? "").trim() || null,
      styleTags: (Array.isArray(payload.styles) ? payload.styles : []).map((x) => String(x)),
      geographicOrigin: String(payload.geographicOrigin ?? "").trim() || null,
      genreTags: genres,
      settingInteriorTags: (Array.isArray(payload.settingInterior) ? payload.settingInterior : []).map((x) => String(x)),
      settingExteriorTags: (Array.isArray(payload.settingExterior) ? payload.settingExterior : []).map((x) => String(x)),
      flagSuitableCloseup: Boolean(payload.flagSuitableCloseup),
      flagCameraReady: Boolean(payload.flagCameraReady),
      flagPreviouslyUsedOnProduction: Boolean(payload.flagPreviouslyUsedOnProduction),
      flagFragile: Boolean(payload.flagFragile),
      flagOutdoorSuitable: Boolean(payload.flagOutdoorSuitable),
      flagMultiplesAvailable: Boolean(payload.flagMultiplesAvailable),
      flagCanSourceMatching: Boolean(payload.flagCanSourceMatching),
      flagStudioDelivery: Boolean(payload.flagStudioDelivery),
      productionName: String(payload.productionName ?? "").trim() || null,
      studioTags: (Array.isArray(payload.studios) ? payload.studios : []).map((x) => String(x)),
      studioOtherText: String(payload.studioOtherText ?? "").trim() || null,
      provenanceBuilding: null,
      provenanceDateText: null,
      provenanceRegion: null,
      authenticityVerifiedBy: "UNVERIFIED" as never,
      restorationNotes: null,
      conditionNotes,
      hireEnabled,
      saleEnabled,
      hirePriceWeekPence: hireEnabled ? hirePriceWeekPence : null,
      hireMinPeriod: hireEnabled ? (String(payload.hireMinPeriod ?? "ONE_WEEK") as never) : null,
      hireDepositPct: hireEnabled ? Number(payload.hireDepositPct ?? 100) : null,
      damageWaiverTerms: String(payload.damageWaiverTerms ?? "").trim() || null,
      salePricePence: saleEnabled ? salePricePence : null,
      saleOffers: Boolean(payload.saleOffers),
      collectionAddress: postcodeRaw || null,
      collectionAvailable: Boolean(payload.collectionAvailable),
      collectionOpeningHours: String(payload.collectionOpeningHours ?? "").trim() || null,
      deliveryAvailable: Boolean(payload.deliveryAvailable),
      deliveryRadiusMiles: Number(payload.deliveryRadiusMiles ?? 0) || null,
      deliveryNationwide: Boolean(payload.deliveryNationwide),
      deliveryPriceType: String(payload.deliveryPriceType ?? "POA") as never,
      deliveryPricePence: Number(payload.deliveryPriceGbp ?? 0) ? Math.round(Number(payload.deliveryPriceGbp) * 100) : null,
      specialistHandling: Boolean(payload.specialistHandling),
      regularStudioRun: Boolean(payload.regularStudioRun),
      specialistTransportRequired: Boolean(payload.specialistTransportRequired),
      deliveryLeadTime: String(payload.deliveryLeadTime ?? "").trim() || null,
      heroImageUrl: images[0],
      images,
      detailShots: payload.detailShots ? (payload.detailShots as object) : undefined,
      videoUrl: null,
      view360Url: null,
      seenOnScreenProductions: [],
      propListingStatus: shouldPublish ? "ACTIVE" : "DRAFT",
      publishedAt: shouldPublish ? new Date() : null,
      status: shouldPublish ? "active" : "draft",
      listingKind: "sell",
      freeToCollector: false,
      visibleOnMarketplace: saleEnabled,
      offersDelivery: Boolean(payload.deliveryAvailable),
      deliveryNotes: String(payload.damageWaiverTerms ?? "").trim() || null,
      postcode: resolvedPostcode?.postcode ?? null,
      lat: resolvedPostcode?.lat ?? null,
      lng: resolvedPostcode?.lng ?? null,
      adminDistrict: resolvedPostcode?.adminDistrict ?? null,
      region: resolvedPostcode?.region ?? null,
      postcodeLocality: resolvedPostcode?.postcodeLocality ?? null,
    },
  });

  if (hireEnabled && shouldPublish) {
    await prisma.propRentalOffer.create({
      data: {
        listingId: listing.id,
        weeklyHirePence: hirePriceWeekPence,
        minimumHireWeeks: 1,
        isActive: true,
        yardHireNotes: String(payload.damageWaiverTerms ?? "").trim() || null,
      },
    });
  }

  const productionName = String(payload.productionName ?? "").trim();
  if (shouldPublish && Boolean(payload.flagPreviouslyUsedOnProduction) && productionName) {
    await prisma.seenOnScreenVerificationRequest.create({
      data: {
        listingId: listing.id,
        requestedById: userId,
        productionName,
      },
    });
  }

  if (hireEnabled && shouldPublish) {
    const wantedAds = await prisma.wantedAd.findMany({
      where: {
        status: "active",
        OR: [{ categoryId: category.id }, { categoryId: null }],
      },
      select: { userId: true, id: true, title: true },
      take: 40,
    });
    for (const ad of wantedAds) {
      const dedupeLink = `/dashboard/wanted?match=${ad.id}&listing=${listing.id}`;
      const existing = await prisma.notification.findFirst({
        where: { userId: ad.userId, type: "prop_listing_brief_match", linkUrl: dedupeLink },
        select: { id: true },
      });
      if (!existing) {
        await createNotification({
          userId: ad.userId,
          type: "prop_listing_brief_match",
          title: "Item matches an active production brief",
          body: `Your listing "${name}" may match brief: ${ad.title}`,
          linkUrl: dedupeLink,
        });
      }
    }
  }

  if (shouldPublish) {
    await prisma.propListingDraft.deleteMany({ where: { yardId: userId } });
  }
  revalidatePath("/dashboard/prop-yard");
  revalidatePath("/prop-yard/search");
  const marker = shouldPublish ? "saved=1" : "draft=1";
  redirect(okBase.includes("?") ? `${okBase}&${marker}` : `${okBase}?${marker}`);
}

export async function reviewSeenOnScreenVerificationAction(formData: FormData): Promise<void> {
  const session = await auth();
  if (!session?.user?.id || !isCarbonAdmin(session)) {
    redirect("/dashboard?error=" + encodeURIComponent("Admin access required."));
  }
  const requestId = String(formData.get("requestId") ?? "").trim();
  const decision = String(formData.get("decision") ?? "").trim();
  if (!requestId || !["approve", "reject"].includes(decision)) {
    redirect("/dashboard/admin/seen-on-screen?error=" + encodeURIComponent("Invalid review action."));
  }

  const reqRow = await prisma.seenOnScreenVerificationRequest.findUnique({
    where: { id: requestId },
    select: { id: true, listingId: true, productionName: true, status: true },
  });
  if (!reqRow) redirect("/dashboard/admin/seen-on-screen?error=" + encodeURIComponent("Request not found."));
  if (reqRow.status !== "PENDING") redirect("/dashboard/admin/seen-on-screen");

  await prisma.seenOnScreenVerificationRequest.update({
    where: { id: requestId },
    data: {
      status: decision === "approve" ? "APPROVED" : "REJECTED",
      reviewedById: session.user.id,
      reviewedAt: new Date(),
    },
  });

  if (decision === "approve") {
    const listing = await prisma.listing.findUnique({
      where: { id: reqRow.listingId },
      select: { seenOnScreenProductions: true },
    });
    const next = [...new Set([...(listing?.seenOnScreenProductions ?? []), reqRow.productionName])];
    await prisma.listing.update({
      where: { id: reqRow.listingId },
      data: { seenOnScreenProductions: next },
    });
  }

  revalidatePath("/dashboard/admin/seen-on-screen");
  redirect("/dashboard/admin/seen-on-screen?ok=1");
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

type AvailabilityDb = {
  propRentalBooking: Pick<typeof prisma.propRentalBooking, "findMany">;
  propRentalUnavailability: Pick<typeof prisma.propRentalUnavailability, "findMany">;
};

async function validateAvailability(
  offerId: string,
  hireStart: Date,
  hireEnd: Date,
  db: AvailabilityDb = prisma
): Promise<void> {
  const blockingBookings = await db.propRentalBooking.findMany({
    where: { offerId, status: { in: BLOCKING } },
    select: { hireStart: true, hireEnd: true },
  });
  for (const b of blockingBookings) {
    if (rangesOverlapUtc(hireStart, hireEnd, b.hireStart, b.hireEnd)) {
      throw new Error("overlap-booking");
    }
  }

  const blocks = await db.propRentalUnavailability.findMany({
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
  const productionType = parsePropSetProductionType(String(formData.get("productionType") ?? ""));
  if (!productionType) {
    redirect("/prop-yard/sets?error=" + encodeURIComponent("Choose a production type."));
  }
  const window = parseSetDefaultHireWindow(formData);
  if ("error" in window) {
    redirect("/prop-yard/sets?error=" + encodeURIComponent(window.error));
  }
  const set = await prisma.propRentalSet.create({
    data: {
      userId: session.user.id,
      name,
      productionType,
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
  const productionTypeRaw = String(formData.get("productionType") ?? "").trim();
  const productionType =
    productionTypeRaw === "" ? null : parsePropSetProductionType(productionTypeRaw);
  if (productionTypeRaw !== "" && !productionType) {
    redirect(`/prop-yard/set/${setId}?error=` + encodeURIComponent("Choose a valid production type."));
  }
  await prisma.propRentalSet.updateMany({
    where: { id: setId, userId: session.user.id },
    data: {
      name: rawName.slice(0, 120),
      productionType,
    },
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
  let firstBlocker: string | null = null;
  const noteBlocker = (message: string) => {
    if (!firstBlocker) firstBlocker = message;
  };

  await prisma.$transaction(async (tx) => {
    for (const item of items) {
      const offer = item.offer;
      const listingTitle = item.offer.listing.title.trim().slice(0, 120) || "This prop";
      if (
        !offer.isActive ||
        offer.listing.status !== "active" ||
        offer.listing.listingKind !== "sell" ||
        offer.listing.freeToCollector
      ) {
        noteBlocker(`"${listingTitle}" is no longer available for hire (inactive or unpublished).`);
        continue;
      }
      if (offer.listing.sellerId === session.user.id) {
        noteBlocker(`"${listingTitle}" is your own listing; remove it from the set to send hire requests.`);
        continue;
      }

      const weeks = billableWeeksFromRange(item.hireStart, item.hireEnd);
      const calendarDays = inclusiveHireDays(item.hireStart, item.hireEnd);
      if (weeks < offer.minimumHireWeeks) {
        noteBlocker(
          `"${listingTitle}" needs at least ${offer.minimumHireWeeks} billable week(s); your dates are ${calendarDays} calendar day(s) (${weeks} billable week(s), weeks round up from days). Extend the hire end date or pick a longer window.`
        );
        continue;
      }

      try {
        await validateAvailability(offer.id, item.hireStart, item.hireEnd, tx);
      } catch {
        noteBlocker(
          `"${listingTitle}" is not available for those dates: they overlap an existing hire request or confirmed booking, or the yard has blocked those days.`
        );
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
      `/prop-yard/set/${setId}?error=` +
        encodeURIComponent(
          firstBlocker ??
            "No hire requests could be sent. Check each line in the set, then try again."
        )
    );
  }
  redirect(
    `/prop-yard/hires/success?batchId=${encodeURIComponent(batchId)}&setId=${encodeURIComponent(setId)}&sent=${created}&yards=${affectedYards.size}`
  );
}

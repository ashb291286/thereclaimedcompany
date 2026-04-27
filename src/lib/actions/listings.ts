"use server";

import { auth } from "@/auth";
import { isCarbonAdmin } from "@/lib/admin";
import { prisma } from "@/lib/db";
import { redirect } from "next/navigation";
import {
  ListingPricingMode,
  ListingStatus,
  Prisma,
  type Condition,
  type ListingKind,
} from "@/generated/prisma/client";
import { slugifyCategoryName } from "@/lib/category-suggest";
import { parseDealerProvenanceDocumentsFromFormJson } from "@/lib/dealer-provenance";
import { STRIPE_MIN_AMOUNT_PENCE } from "@/lib/constants";
import { lookupUkPostcode } from "@/lib/postcode-uk";
import {
  minDeliveryPricePence,
  parseDeliveryOptionsJson,
  type DeliveryOptionStored,
} from "@/lib/delivery-carriers";
import { computeListingCarbonSnapshot } from "@/lib/carbon/listing";
import { syncListingLocalYardAlerts } from "@/lib/listing-local-yard-alerts";
import { syncListingToWooCommerce } from "@/lib/listing-woocommerce-sync";
import { afterMarketplaceListingPersisted } from "@/lib/yard-listing-hooks";

type ParsedListing = {
  listingKind: ListingKind;
  freeToCollector: boolean;
  price: number;
  auctionEndsAt: Date | null;
  auctionReservePence: number | null;
};

type DealerTimelineEntry = { date: string; event: string };

function parseListingCommerce(
  formData: FormData,
  publish: boolean
): { ok: true; data: ParsedListing } | { ok: false; message: string } {
  const listingKind: ListingKind =
    (formData.get("listingKind") as string) === "auction" ? "auction" : "sell";
  const freeToCollector =
    listingKind === "sell" && formData.get("freeToCollector") === "on";

  const priceStr = formData.get("price") as string;
  let price = Math.round(parseFloat(priceStr) * 100);
  if (freeToCollector) {
    price = 0;
  } else if (Number.isNaN(price) || price < 0) {
    return { ok: false, message: "Invalid price" };
  }

  let auctionEndsAt: Date | null = null;
  if (listingKind === "auction") {
    const duration = (formData.get("auctionDuration") as string)?.trim();
    if (duration === "3" || duration === "5" || duration === "7") {
      const days = parseInt(duration, 10);
      auctionEndsAt = new Date(Date.now() + days * 24 * 60 * 60 * 1000);
    } else if (duration === "custom") {
      const endsRaw = (formData.get("auctionEndsAt") as string)?.trim();
      if (!endsRaw) return { ok: false, message: "Choose when the auction ends" };
      auctionEndsAt = new Date(endsRaw);
      if (Number.isNaN(auctionEndsAt.getTime())) {
        return { ok: false, message: "Invalid auction end time" };
      }
    } else {
      return { ok: false, message: "Choose how long the auction runs (3, 5, 7 days or custom)" };
    }
    if (Number.isNaN(auctionEndsAt.getTime())) {
      return { ok: false, message: "Invalid auction end time" };
    }
    if (auctionEndsAt <= new Date()) {
      return { ok: false, message: "Auction must end in the future" };
    }
    if (publish && price < STRIPE_MIN_AMOUNT_PENCE) {
      return {
        ok: false,
        message: `Starting bid must be at least £${(STRIPE_MIN_AMOUNT_PENCE / 100).toFixed(2)}`,
      };
    }
  }

  let auctionReservePence: number | null = null;
  if (listingKind === "auction") {
    const reserveRaw = (formData.get("auctionReserve") as string)?.trim();
    if (reserveRaw) {
      const rp = Math.round(parseFloat(reserveRaw) * 100);
      if (Number.isNaN(rp)) {
        return { ok: false, message: "Invalid reserve price" };
      }
      if (rp < price) {
        return {
          ok: false,
          message: "Reserve must be at least the starting bid",
        };
      }
      auctionReservePence = rp;
    }
  }

  if (
    listingKind === "sell" &&
    !freeToCollector &&
    publish &&
    price > 0 &&
    price < STRIPE_MIN_AMOUNT_PENCE
  ) {
    return {
      ok: false,
      message: `Price must be at least £${(STRIPE_MIN_AMOUNT_PENCE / 100).toFixed(2)} for card checkout, or tick free to collector.`,
    };
  }

  return {
    ok: true,
    data: {
      listingKind,
      freeToCollector,
      price,
      auctionEndsAt: listingKind === "auction" ? auctionEndsAt : null,
      auctionReservePence: listingKind === "auction" ? auctionReservePence : null,
    },
  };
}

function parseListingPricing(
  formData: FormData,
  opts: {
    listingKind: ListingKind;
    freeToCollector: boolean;
    publish: boolean;
    existingUnitsAvailable?: number | null;
  }
):
  | { ok: true; pricingMode: ListingPricingMode; unitsAvailable: number | null }
  | { ok: false; message: string } {
  let pricingMode: ListingPricingMode =
    (formData.get("pricingMode") as string)?.trim() === "PER_UNIT"
      ? ListingPricingMode.PER_UNIT
      : ListingPricingMode.LOT;

  if (opts.listingKind === "auction" || opts.freeToCollector) {
    pricingMode = ListingPricingMode.LOT;
  }

  let unitsAvailable: number | null = null;
  if (pricingMode === ListingPricingMode.PER_UNIT) {
    const raw = String(formData.get("unitsAvailable") ?? "").trim();
    const n = parseInt(raw, 10);
    if (opts.publish) {
      if (!Number.isFinite(n) || n < 1) {
        return {
          ok: false,
          message: "For per-unit pricing, enter how many units you have for sale (at least 1).",
        };
      }
      unitsAvailable = n;
    } else if (Number.isFinite(n) && n >= 1) {
      unitsAvailable = n;
    } else if (opts.existingUnitsAvailable != null && opts.existingUnitsAvailable >= 1) {
      unitsAvailable = opts.existingUnitsAvailable;
    } else {
      unitsAvailable = null;
    }
  }

  return { ok: true, pricingMode, unitsAvailable };
}

async function resolveListingCategoryId(formData: FormData): Promise<
  | { ok: true; categoryId: string }
  | { ok: false; message: string }
> {
  const newCategoryName = String(formData.get("newCategoryName") ?? "").trim();
  if (newCategoryName.length > 0) {
    const slug = slugifyCategoryName(newCategoryName);
    if (!slug) {
      return { ok: false, message: "Suggested category name is not valid — use letters or numbers." };
    }
    const cat = await prisma.category.upsert({
      where: { slug },
      create: { name: newCategoryName.slice(0, 120), slug },
      update: { name: newCategoryName.slice(0, 120) },
    });
    return { ok: true, categoryId: cat.id };
  }

  const categoryId = String(formData.get("categoryId") ?? "").trim();
  if (!categoryId) {
    return { ok: false, message: "Category is required" };
  }
  const exists = await prisma.category.findUnique({ where: { id: categoryId } });
  if (!exists) {
    return { ok: false, message: "Invalid category" };
  }
  return { ok: true, categoryId };
}

type DeliveryParsed = {
  offersDelivery: boolean;
  deliveryNotes: string | null;
  deliveryCostPence: number | null;
  deliveryOptions: Prisma.InputJsonValue | null;
};

function parseDeliveryFields(
  formData: FormData,
  opts: { freeToCollector: boolean }
): { ok: true; data: DeliveryParsed } | { ok: false; message: string } {
  if (opts.freeToCollector) {
    return {
      ok: true,
      data: {
        offersDelivery: false,
        deliveryNotes: null,
        deliveryCostPence: null,
        deliveryOptions: null,
      },
    };
  }
  const mode = formData.get("fulfillmentMode") as string;
  if (mode !== "collect_or_deliver") {
    return {
      ok: true,
      data: {
        offersDelivery: false,
        deliveryNotes: null,
        deliveryCostPence: null,
        deliveryOptions: null,
      },
    };
  }

  const rawJson = (formData.get("deliveryOptionsJson") as string) ?? "";
  const parsedOpts = parseDeliveryOptionsJson(rawJson, { requireAtLeastOne: true });
  if (!parsedOpts.ok) return parsedOpts;

  const notes = ((formData.get("deliveryNotes") as string) ?? "").trim() || null;
  const options: DeliveryOptionStored[] = parsedOpts.data;
  const deliveryCostPence = minDeliveryPricePence(options);

  return {
    ok: true,
    data: {
      offersDelivery: true,
      deliveryNotes: notes,
      deliveryCostPence,
      deliveryOptions: options as unknown as Prisma.InputJsonValue,
    },
  };
}

function parseSellerReference(formData: FormData): string | null {
  const raw = ((formData.get("sellerReference") as string) ?? "").trim();
  if (!raw) return null;
  return raw.length > 120 ? raw.slice(0, 120) : raw;
}

function parseOptionalPositiveFloat(raw: string | null): number | null {
  if (!raw) return null;
  const value = parseFloat(raw.trim());
  if (!Number.isFinite(value) || value <= 0) return null;
  return value;
}

function parseDealerListingFields(
  formData: FormData,
  opts: { isDealer: boolean }
): Pick<
  Prisma.ListingUncheckedCreateInput,
  | "dimensionsW"
  | "dimensionsH"
  | "dimensionsD"
  | "propMaterials"
  | "styleTags"
  | "dateSpecific"
  | "dealerDesigner"
  | "geographicOrigin"
  | "dealerAcquisitionStory"
  | "dealerProvenanceTimeline"
  | "dealerProvenanceDocuments"
> {
  if (!opts.isDealer) {
    return {
      dimensionsW: null,
      dimensionsH: null,
      dimensionsD: null,
      propMaterials: [],
      styleTags: [],
      dateSpecific: null,
      dealerDesigner: null,
      geographicOrigin: null,
      dealerAcquisitionStory: null,
      dealerProvenanceTimeline: Prisma.DbNull,
      dealerProvenanceDocuments: Prisma.DbNull,
    };
  }

  const materialText = String(formData.get("dealerMaterialText") ?? "").trim();
  const styleText = String(formData.get("dealerStyleText") ?? "").trim();
  const manufacturingDate = String(formData.get("dealerManufacturingDate") ?? "").trim();
  const designer = String(formData.get("dealerDesigner") ?? "").trim();
  const countryOfOrigin = String(formData.get("dealerCountryOfOrigin") ?? "").trim();
  const acquisitionStory = String(formData.get("dealerAcquisitionStory") ?? "").trim();
  const documentsJsonRaw = String(formData.get("dealerProvenanceDocumentsJson") ?? "").trim();
  const documents = parseDealerProvenanceDocumentsFromFormJson(documentsJsonRaw);
  const timelineJsonRaw = String(formData.get("dealerTimelineJson") ?? "").trim();
  let timeline: DealerTimelineEntry[] = [];
  if (timelineJsonRaw) {
    try {
      const parsed = JSON.parse(timelineJsonRaw) as unknown;
      if (Array.isArray(parsed)) {
        timeline = parsed
          .map((item) => {
            if (!item || typeof item !== "object") return null;
            const maybe = item as { date?: unknown; event?: unknown };
            const date = typeof maybe.date === "string" ? maybe.date.trim().slice(0, 120) : "";
            const event = typeof maybe.event === "string" ? maybe.event.trim().slice(0, 300) : "";
            if (!date || !event) return null;
            return { date, event };
          })
          .filter((item): item is DealerTimelineEntry => Boolean(item))
          .slice(0, 12);
      }
    } catch {
      timeline = [];
    }
  }

  return {
    dimensionsW: parseOptionalPositiveFloat(String(formData.get("dealerWidthCm") ?? "")),
    dimensionsH: parseOptionalPositiveFloat(String(formData.get("dealerHeightCm") ?? "")),
    dimensionsD: parseOptionalPositiveFloat(String(formData.get("dealerDepthCm") ?? "")),
    propMaterials: materialText ? [materialText.slice(0, 120)] : [],
    styleTags: styleText ? [styleText.slice(0, 120)] : [],
    dateSpecific: manufacturingDate ? manufacturingDate.slice(0, 120) : null,
    dealerDesigner: designer ? designer.slice(0, 120) : null,
    geographicOrigin: countryOfOrigin ? countryOfOrigin.slice(0, 120) : null,
    dealerAcquisitionStory: acquisitionStory ? acquisitionStory.slice(0, 2000) : null,
    dealerProvenanceTimeline: timeline.length
      ? (timeline as unknown as Prisma.InputJsonValue)
      : Prisma.DbNull,
    dealerProvenanceDocuments: documents.length
      ? (documents as unknown as Prisma.InputJsonValue)
      : Prisma.DbNull,
  };
}

async function materialCarbonFromForm(formData: FormData) {
  const materialType = ((formData.get("materialType") as string) ?? "").trim() || null;
  const qtyRaw = ((formData.get("materialQuantity") as string) ?? "").trim();
  const materialQuantity =
    qtyRaw !== "" && !Number.isNaN(parseFloat(qtyRaw)) ? parseFloat(qtyRaw) : null;
  const unitRaw = ((formData.get("materialUnit") as string) ?? "").trim().toLowerCase() || null;

  return computeListingCarbonSnapshot({
    materialType,
    materialQuantity,
    materialUnit: unitRaw,
    distanceSavedKm: null,
  });
}

export async function createListing(formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) redirect("/auth/signin");
  const canAdminCreateForOthers = isCarbonAdmin(session);

  const listingId = formData.get("listingId") as string | null;
  if (listingId) {
    return updateListing(listingId, formData);
  }

  const adminSellerIdRaw = String(formData.get("adminSellerId") ?? "").trim();
  const effectiveSellerId =
    canAdminCreateForOthers && adminSellerIdRaw.length > 0 ? adminSellerIdRaw : session.user.id;

  const sellerProfile = await prisma.sellerProfile.findUnique({
    where: { userId: effectiveSellerId },
  });
  if (!sellerProfile) redirect("/dashboard/onboarding");

  const dbUser = await prisma.user.findUnique({
    where: { id: effectiveSellerId },
    select: { role: true },
  });

  const title = formData.get("title") as string;
  const description = formData.get("description") as string;
  const condition = formData.get("condition") as Condition;
  const postcodeRaw = (formData.get("postcode") as string)?.trim() || sellerProfile.postcode;
  const resolvedPostcode = await lookupUkPostcode(postcodeRaw);
  if (!resolvedPostcode) {
    redirect(
      "/dashboard/sell?error=" +
        encodeURIComponent("Use a full valid UK postcode for the item location.")
    );
  }
  const imagesStr = formData.get("images") as string;
  const publish = formData.get("publish") === "true";

  if (!title?.trim() || !description?.trim() || !condition) {
    redirect(
      "/dashboard/sell?error=" +
        encodeURIComponent("Title, description, and condition are required")
    );
  }

  const parsed = parseListingCommerce(formData, publish);
  if (!parsed.ok) {
    redirect("/dashboard/sell?error=" + encodeURIComponent(parsed.message));
  }
  const { listingKind, freeToCollector, price, auctionEndsAt, auctionReservePence } = parsed.data;

  const hasVisibilityField = formData.has("visibleOnMarketplace");
  const visibleOnMarketplace =
    dbUser?.role === "reclamation_yard" && listingKind === "sell" && !freeToCollector
      ? hasVisibilityField
        ? formData.get("visibleOnMarketplace") === "on"
        : true
      : true;

  const pricingParsed = parseListingPricing(formData, { listingKind, freeToCollector, publish });
  if (!pricingParsed.ok) {
    redirect("/dashboard/sell?error=" + encodeURIComponent(pricingParsed.message));
  }

  const categoryResolved = await resolveListingCategoryId(formData);
  if (!categoryResolved.ok) {
    redirect("/dashboard/sell?error=" + encodeURIComponent(categoryResolved.message));
  }
  const categoryId = categoryResolved.categoryId;

  const deliveryParsed = parseDeliveryFields(formData, { freeToCollector });
  if (!deliveryParsed.ok) {
    redirect("/dashboard/sell?error=" + encodeURIComponent(deliveryParsed.message));
  }
  const { offersDelivery, deliveryNotes, deliveryCostPence, deliveryOptions } = deliveryParsed.data;

  const validConditions: Condition[] = [
    "like_new",
    "used",
    "worn",
    "parts_not_working",
    "refurbished",
    "upcycled",
    "collectable",
  ];
  if (!validConditions.includes(condition)) {
    redirect("/dashboard/sell?error=" + encodeURIComponent("Invalid condition"));
  }

  const images = imagesStr ? imagesStr.split(",").filter(Boolean) : [];
  if (images.length === 0) {
    redirect("/dashboard/sell?error=" + encodeURIComponent("At least one image is required"));
  }

  const carbon = await materialCarbonFromForm(formData);

  const notifyLocalYards =
    listingKind === "sell" && !freeToCollector && formData.get("notifyLocalYards") === "on";

  const sellerReference = parseSellerReference(formData);
  const dealerFields = parseDealerListingFields(formData, { isDealer: dbUser?.role === "dealer" });

  const created = await prisma.listing.create({
    data: {
      sellerId: effectiveSellerId,
      title: title.trim(),
      sellerReference,
      description: description.trim(),
      price,
      condition,
      categoryId,
      pricingMode: pricingParsed.pricingMode,
      unitsAvailable: pricingParsed.unitsAvailable,
      postcode: resolvedPostcode.postcode,
      lat: resolvedPostcode.lat,
      lng: resolvedPostcode.lng,
      adminDistrict: resolvedPostcode.adminDistrict,
      region: resolvedPostcode.region,
      postcodeLocality: resolvedPostcode.postcodeLocality,
      images,
      listingKind,
      freeToCollector,
      notifyLocalYards,
      visibleOnMarketplace,
      ...dealerFields,
      offersDelivery,
      deliveryNotes,
      deliveryCostPence,
      deliveryOptions:
        deliveryOptions === null ? Prisma.DbNull : (deliveryOptions as Prisma.InputJsonValue),
      auctionEndsAt,
      auctionReservePence,
      materialType: carbon.materialType,
      materialQuantity: carbon.materialQuantity,
      materialUnit: carbon.materialUnit,
      distanceSavedKm: carbon.distanceSavedKm,
      carbonSavedKg: carbon.carbonSavedKg,
      carbonWasteDivertedKg: carbon.carbonWasteDivertedKg,
      carbonImpactJson:
        carbon.carbonImpactJson === null
          ? Prisma.DbNull
          : (carbon.carbonImpactJson as Prisma.InputJsonValue),
      status: publish ? ListingStatus.active : ListingStatus.draft,
    },
  });

  await syncListingLocalYardAlerts(created.id);
  await syncListingToWooCommerce(created.id);

  await afterMarketplaceListingPersisted(effectiveSellerId, created.id, { wasLive: false });

  if (publish) {
    redirect(
      `/dashboard/sell?published=1&listingId=${encodeURIComponent(created.id)}`
    );
  }
  redirect(`/dashboard?justAdded=${encodeURIComponent(created.id)}`);
}

export async function updateListing(id: string, formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) redirect("/auth/signin");
  const canAdminEdit = isCarbonAdmin(session);

  const listing = await prisma.listing.findUnique({
    where: { id },
  });
  if (!listing || (!canAdminEdit && listing.sellerId !== session.user.id)) {
    redirect("/dashboard?error=Listing+not+found");
  }

  const dbUser = await prisma.user.findUnique({
    where: { id: listing.sellerId },
    select: { role: true },
  });

  const editUrl = `/dashboard/listings/${id}/edit`;
  const title = formData.get("title") as string;
  const description = formData.get("description") as string;
  const condition = formData.get("condition") as Condition;
  const postcodeRaw =
    (formData.get("postcode") as string)?.trim() || listing.postcode || "";
  const resolvedPostcode = await lookupUkPostcode(postcodeRaw);
  if (!resolvedPostcode) {
    redirect(
      editUrl +
        "?error=" +
        encodeURIComponent("Use a full valid UK postcode for the item location.")
    );
  }
  const imagesStr = formData.get("images") as string;
  const publish = formData.get("publish") === "true";
  if (!title?.trim() || !description?.trim() || !condition) {
    redirect(
      editUrl + "?error=" + encodeURIComponent("Title, description, and condition are required")
    );
  }

  const parsed = parseListingCommerce(formData, publish);
  if (!parsed.ok) {
    redirect(editUrl + "?error=" + encodeURIComponent(parsed.message));
  }
  const { listingKind, freeToCollector, price, auctionEndsAt, auctionReservePence } = parsed.data;

  const hasVisibilityField = formData.has("visibleOnMarketplace");
  const visibleOnMarketplace =
    dbUser?.role === "reclamation_yard" && listingKind === "sell" && !freeToCollector
      ? hasVisibilityField
        ? formData.get("visibleOnMarketplace") === "on"
        : true
      : true;

  const categoryResolved = await resolveListingCategoryId(formData);
  if (!categoryResolved.ok) {
    redirect(editUrl + "?error=" + encodeURIComponent(categoryResolved.message));
  }
  const categoryId = categoryResolved.categoryId;

  const deliveryParsed = parseDeliveryFields(formData, { freeToCollector });
  if (!deliveryParsed.ok) {
    redirect(editUrl + "?error=" + encodeURIComponent(deliveryParsed.message));
  }
  const { offersDelivery, deliveryNotes, deliveryCostPence, deliveryOptions } = deliveryParsed.data;

  const pricingParsed = parseListingPricing(formData, {
    listingKind,
    freeToCollector,
    publish,
    existingUnitsAvailable: listing.unitsAvailable,
  });
  if (!pricingParsed.ok) {
    redirect(editUrl + "?error=" + encodeURIComponent(pricingParsed.message));
  }

  const validConditions: Condition[] = [
    "like_new",
    "used",
    "worn",
    "parts_not_working",
    "refurbished",
    "upcycled",
    "collectable",
  ];
  if (!validConditions.includes(condition)) {
    redirect(editUrl + "?error=" + encodeURIComponent("Invalid condition"));
  }

  const images = imagesStr ? imagesStr.split(",").filter(Boolean) : [];
  if (images.length === 0) {
    redirect(editUrl + "?error=" + encodeURIComponent("At least one image is required"));
  }

  const carbon = await materialCarbonFromForm(formData);

  const notifyLocalYards =
    listingKind === "sell" && !freeToCollector && formData.get("notifyLocalYards") === "on";

  const sellerReference = parseSellerReference(formData);
  const dealerFields = parseDealerListingFields(formData, { isDealer: dbUser?.role === "dealer" });

  const wasLive =
    listing.status === ListingStatus.active && Boolean(listing.visibleOnMarketplace);

  const relistEndedAuction =
    publish &&
    parsed.data.listingKind === "auction" &&
    listing.status === ListingStatus.ended;

  await prisma.listing.update({
    where: { id },
    data: {
      title: title.trim(),
      sellerReference,
      description: description.trim(),
      price,
      condition,
      categoryId,
      pricingMode: pricingParsed.pricingMode,
      unitsAvailable: pricingParsed.unitsAvailable,
      postcode: resolvedPostcode.postcode,
      lat: resolvedPostcode.lat,
      lng: resolvedPostcode.lng,
      adminDistrict: resolvedPostcode.adminDistrict,
      region: resolvedPostcode.region,
      postcodeLocality: resolvedPostcode.postcodeLocality,
      images,
      listingKind,
      freeToCollector,
      notifyLocalYards,
      visibleOnMarketplace,
      ...dealerFields,
      offersDelivery,
      deliveryNotes,
      deliveryCostPence,
      deliveryOptions:
        deliveryOptions === null ? Prisma.DbNull : (deliveryOptions as Prisma.InputJsonValue),
      auctionEndsAt,
      auctionReservePence,
      materialType: carbon.materialType,
      materialQuantity: carbon.materialQuantity,
      materialUnit: carbon.materialUnit,
      distanceSavedKm: carbon.distanceSavedKm,
      carbonSavedKg: carbon.carbonSavedKg,
      carbonWasteDivertedKg: carbon.carbonWasteDivertedKg,
      carbonImpactJson:
        carbon.carbonImpactJson === null
          ? Prisma.DbNull
          : (carbon.carbonImpactJson as Prisma.InputJsonValue),
      status: publish ? ListingStatus.active : ListingStatus.draft,
      ...(relistEndedAuction ? { auctionFinalizedAt: null } : {}),
    },
  });

  await syncListingLocalYardAlerts(id);
  await syncListingToWooCommerce(id);

  await afterMarketplaceListingPersisted(session.user.id, id, { wasLive });

  if (publish) {
    redirect(
      `/dashboard/listings/${encodeURIComponent(id)}/edit?published=1&listingId=${encodeURIComponent(id)}`
    );
  }
  redirect("/dashboard");
}

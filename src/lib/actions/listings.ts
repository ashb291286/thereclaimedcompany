"use server";

import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { redirect } from "next/navigation";
import {
  ListingStatus,
  Prisma,
  type Condition,
  type ListingKind,
} from "@/generated/prisma/client";
import { STRIPE_MIN_AMOUNT_PENCE } from "@/lib/constants";
import { lookupUkPostcode } from "@/lib/postcode-uk";
import {
  minDeliveryPricePence,
  parseDeliveryOptionsJson,
  type DeliveryOptionStored,
} from "@/lib/delivery-carriers";
import { computeListingCarbonSnapshot } from "@/lib/carbon/listing";

type ParsedListing = {
  listingKind: ListingKind;
  freeToCollector: boolean;
  price: number;
  auctionEndsAt: Date | null;
  auctionReservePence: number | null;
};

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

async function materialCarbonFromForm(formData: FormData) {
  const materialType = ((formData.get("materialType") as string) ?? "").trim() || null;
  const qtyRaw = ((formData.get("materialQuantity") as string) ?? "").trim();
  const materialQuantity =
    qtyRaw !== "" && !Number.isNaN(parseFloat(qtyRaw)) ? parseFloat(qtyRaw) : null;
  const unitRaw = ((formData.get("materialUnit") as string) ?? "").trim().toLowerCase() || null;
  const distRaw = ((formData.get("distanceSavedKm") as string) ?? "").trim();
  const distanceSavedKm =
    distRaw !== "" && !Number.isNaN(parseFloat(distRaw)) ? parseFloat(distRaw) : null;

  return computeListingCarbonSnapshot({
    materialType,
    materialQuantity,
    materialUnit: unitRaw,
    distanceSavedKm,
  });
}

export async function createListing(formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) redirect("/auth/signin");

  const listingId = formData.get("listingId") as string | null;
  if (listingId) {
    return updateListing(listingId, formData);
  }

  const sellerProfile = await prisma.sellerProfile.findUnique({
    where: { userId: session.user.id },
  });
  if (!sellerProfile) redirect("/dashboard/onboarding");

  const title = formData.get("title") as string;
  const description = formData.get("description") as string;
  const condition = formData.get("condition") as Condition;
  const categoryId = formData.get("categoryId") as string;
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

  if (!title?.trim() || !description?.trim() || !condition || !categoryId) {
    redirect(
      "/dashboard/sell?error=" +
        encodeURIComponent("Title, description, condition and category are required")
    );
  }

  const parsed = parseListingCommerce(formData, publish);
  if (!parsed.ok) {
    redirect("/dashboard/sell?error=" + encodeURIComponent(parsed.message));
  }
  const { listingKind, freeToCollector, price, auctionEndsAt, auctionReservePence } = parsed.data;

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

  const category = await prisma.category.findUnique({ where: { id: categoryId } });
  if (!category) redirect("/dashboard/sell?error=" + encodeURIComponent("Invalid category"));

  const carbon = await materialCarbonFromForm(formData);

  await prisma.listing.create({
    data: {
      sellerId: session.user.id,
      title: title.trim(),
      description: description.trim(),
      price,
      condition,
      categoryId,
      postcode: resolvedPostcode.postcode,
      lat: resolvedPostcode.lat,
      lng: resolvedPostcode.lng,
      adminDistrict: resolvedPostcode.adminDistrict,
      region: resolvedPostcode.region,
      images,
      listingKind,
      freeToCollector,
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

  redirect("/dashboard");
}

export async function updateListing(id: string, formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) redirect("/auth/signin");

  const listing = await prisma.listing.findFirst({
    where: { id, sellerId: session.user.id },
  });
  if (!listing) redirect("/dashboard?error=Listing+not+found");

  const editUrl = `/dashboard/listings/${id}/edit`;
  const title = formData.get("title") as string;
  const description = formData.get("description") as string;
  const condition = formData.get("condition") as Condition;
  const categoryId = formData.get("categoryId") as string;
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
  if (!title?.trim() || !description?.trim() || !condition || !categoryId) {
    redirect(editUrl + "?error=" + encodeURIComponent("Title, description, condition and category are required"));
  }

  const parsed = parseListingCommerce(formData, publish);
  if (!parsed.ok) {
    redirect(editUrl + "?error=" + encodeURIComponent(parsed.message));
  }
  const { listingKind, freeToCollector, price, auctionEndsAt, auctionReservePence } = parsed.data;

  const deliveryParsed = parseDeliveryFields(formData, { freeToCollector });
  if (!deliveryParsed.ok) {
    redirect(editUrl + "?error=" + encodeURIComponent(deliveryParsed.message));
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
    redirect(editUrl + "?error=" + encodeURIComponent("Invalid condition"));
  }

  const images = imagesStr ? imagesStr.split(",").filter(Boolean) : [];
  if (images.length === 0) {
    redirect(editUrl + "?error=" + encodeURIComponent("At least one image is required"));
  }

  const category = await prisma.category.findUnique({ where: { id: categoryId } });
  if (!category) redirect(editUrl + "?error=" + encodeURIComponent("Invalid category"));

  const carbon = await materialCarbonFromForm(formData);

  await prisma.listing.update({
    where: { id },
    data: {
      title: title.trim(),
      description: description.trim(),
      price,
      condition,
      categoryId,
      postcode: resolvedPostcode.postcode,
      lat: resolvedPostcode.lat,
      lng: resolvedPostcode.lng,
      adminDistrict: resolvedPostcode.adminDistrict,
      region: resolvedPostcode.region,
      images,
      listingKind,
      freeToCollector,
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

  redirect("/dashboard");
}

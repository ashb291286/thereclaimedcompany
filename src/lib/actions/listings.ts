"use server";

import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { redirect } from "next/navigation";
import type { Condition, ListingKind } from "@/generated/prisma/client";
import { ListingStatus } from "@/generated/prisma/client";
import { STRIPE_MIN_AMOUNT_PENCE } from "@/lib/constants";

type ParsedListing = {
  listingKind: ListingKind;
  freeToCollector: boolean;
  price: number;
  auctionEndsAt: Date | null;
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
    const endsRaw = (formData.get("auctionEndsAt") as string)?.trim();
    if (!endsRaw) return { ok: false, message: "Auction end date and time required" };
    auctionEndsAt = new Date(endsRaw);
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
    },
  };
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
  const postcode = (formData.get("postcode") as string)?.trim() || sellerProfile.postcode;
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
  const { listingKind, freeToCollector, price, auctionEndsAt } = parsed.data;

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

  await prisma.listing.create({
    data: {
      sellerId: session.user.id,
      title: title.trim(),
      description: description.trim(),
      price,
      condition,
      categoryId,
      postcode,
      images,
      listingKind,
      freeToCollector,
      auctionEndsAt,
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

  const title = formData.get("title") as string;
  const description = formData.get("description") as string;
  const condition = formData.get("condition") as Condition;
  const categoryId = formData.get("categoryId") as string;
  const postcode = (formData.get("postcode") as string)?.trim() || listing.postcode || "";
  const imagesStr = formData.get("images") as string;
  const publish = formData.get("publish") === "true";

  const editUrl = `/dashboard/listings/${id}/edit`;
  if (!title?.trim() || !description?.trim() || !condition || !categoryId) {
    redirect(editUrl + "?error=" + encodeURIComponent("Title, description, condition and category are required"));
  }

  const parsed = parseListingCommerce(formData, publish);
  if (!parsed.ok) {
    redirect(editUrl + "?error=" + encodeURIComponent(parsed.message));
  }
  const { listingKind, freeToCollector, price, auctionEndsAt } = parsed.data;

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

  await prisma.listing.update({
    where: { id },
    data: {
      title: title.trim(),
      description: description.trim(),
      price,
      condition,
      categoryId,
      postcode,
      images,
      listingKind,
      freeToCollector,
      auctionEndsAt,
      status: publish ? ListingStatus.active : ListingStatus.draft,
    },
  });

  redirect("/dashboard");
}

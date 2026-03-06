"use server";

import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { redirect } from "next/navigation";
import type { Condition } from "@/generated/prisma/client";
import { ListingStatus } from "@/generated/prisma/client";

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
  const priceStr = formData.get("price") as string;
  const condition = formData.get("condition") as Condition;
  const categoryId = formData.get("categoryId") as string;
  const postcode = (formData.get("postcode") as string)?.trim() || sellerProfile.postcode;
  const imagesStr = formData.get("images") as string;
  const publish = formData.get("publish") === "true";

  if (!title?.trim() || !description?.trim() || !priceStr || !condition || !categoryId) {
    redirect("/dashboard/sell?error=" + encodeURIComponent("Title, description, price, condition and category are required"));
  }

  const price = Math.round(parseFloat(priceStr) * 100);
  if (isNaN(price) || price < 0) redirect("/dashboard/sell?error=" + encodeURIComponent("Invalid price"));

  const validConditions: Condition[] = [
    "like_new", "used", "worn", "parts_not_working",
    "refurbished", "upcycled", "collectable",
  ];
  if (!validConditions.includes(condition)) redirect("/dashboard/sell?error=" + encodeURIComponent("Invalid condition"));

  const images = imagesStr ? imagesStr.split(",").filter(Boolean) : [];
  if (images.length === 0) redirect("/dashboard/sell?error=" + encodeURIComponent("At least one image is required"));

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
  const priceStr = formData.get("price") as string;
  const condition = formData.get("condition") as Condition;
  const categoryId = formData.get("categoryId") as string;
  const postcode = (formData.get("postcode") as string)?.trim() || listing.postcode || "";
  const imagesStr = formData.get("images") as string;
  const publish = formData.get("publish") === "true";

  const editUrl = `/dashboard/listings/${id}/edit`;
  if (!title?.trim() || !description?.trim() || !priceStr || !condition || !categoryId) {
    redirect(editUrl + "?error=" + encodeURIComponent("Title, description, price, condition and category are required"));
  }

  const price = Math.round(parseFloat(priceStr) * 100);
  if (isNaN(price) || price < 0) redirect(editUrl + "?error=" + encodeURIComponent("Invalid price"));

  const validConditions: Condition[] = [
    "like_new", "used", "worn", "parts_not_working",
    "refurbished", "upcycled", "collectable",
  ];
  if (!validConditions.includes(condition)) redirect(editUrl + "?error=" + encodeURIComponent("Invalid condition"));

  const images = imagesStr ? imagesStr.split(",").filter(Boolean) : [];
  if (images.length === 0) redirect(editUrl + "?error=" + encodeURIComponent("At least one image is required"));

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
      status: publish ? ListingStatus.active : ListingStatus.draft,
    },
  });

  redirect("/dashboard");
}

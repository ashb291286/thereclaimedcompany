"use server";

import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { redirect } from "next/navigation";
import type { UserRole } from "@/generated/prisma/client";
import { lookupUkPostcode } from "@/lib/postcode-uk";

export async function completeSellerOnboarding(formData: FormData): Promise<void> {
  const session = await auth();
  if (!session?.user?.id) redirect("/auth/signin");

  const sellerType = formData.get("sellerType") as UserRole;
  const displayName = formData.get("displayName") as string;
  const postcodeRaw = formData.get("postcode") as string;
  const businessName = formData.get("businessName") as string | null;
  const openingHours = formData.get("openingHours") as string | null;

  if (!sellerType || !displayName?.trim() || !postcodeRaw?.trim()) {
    redirect("/dashboard/onboarding?error=Display+name+and+postcode+required");
  }
  if (sellerType !== "individual" && sellerType !== "reclamation_yard") {
    redirect("/dashboard/onboarding?error=Invalid+seller+type");
  }

  const resolved = await lookupUkPostcode(postcodeRaw);
  if (!resolved) {
    redirect(
      "/dashboard/onboarding?error=" +
        encodeURIComponent("Enter a full valid UK postcode (e.g. SW1A 1AA).")
    );
  }

  await prisma.$transaction([
    prisma.user.update({
      where: { id: session.user.id },
      data: { role: sellerType },
    }),
    prisma.sellerProfile.create({
      data: {
        userId: session.user.id,
        displayName: displayName.trim(),
        postcode: resolved.postcode,
        lat: resolved.lat,
        lng: resolved.lng,
        adminDistrict: resolved.adminDistrict,
        region: resolved.region,
        businessName: sellerType === "reclamation_yard" ? (businessName?.trim() || null) : null,
        openingHours: sellerType === "reclamation_yard" ? (openingHours?.trim() || null) : null,
      },
    }),
  ]);

  redirect("/dashboard/sell?firstListing=1");
}

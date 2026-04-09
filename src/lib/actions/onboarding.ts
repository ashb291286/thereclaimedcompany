"use server";

import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { slugifyAdminDistrict } from "@/lib/yard-area-seo";
import type { UserRole } from "@/generated/prisma/client";
import { lookupUkPostcode } from "@/lib/postcode-uk";
import { defaultYardOpeningHours, parseOpeningHoursSchedule } from "@/lib/opening-hours";
import type { Prisma } from "@/generated/prisma/client";
import { allocateYardSlug } from "@/lib/yard-slug";

export async function completeSellerOnboarding(formData: FormData): Promise<void> {
  const session = await auth();
  if (!session?.user?.id) redirect("/auth/signin");

  const sellerType = formData.get("sellerType") as UserRole;
  const displayName = formData.get("displayName") as string;
  const postcodeRaw = formData.get("postcode") as string;
  const businessName = formData.get("businessName") as string | null;
  const openingHoursScheduleRaw = formData.get("openingHoursSchedule") as string | null;
  const vatRegisteredRaw = String(formData.get("vatRegistered") ?? "").trim();

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

  let openingHoursSchedule: Prisma.InputJsonValue | undefined;
  if (sellerType === "reclamation_yard") {
    let json: unknown;
    if (openingHoursScheduleRaw?.trim()) {
      try {
        json = JSON.parse(openingHoursScheduleRaw) as unknown;
      } catch {
        redirect("/dashboard/onboarding?error=" + encodeURIComponent("Invalid opening hours."));
      }
    } else {
      json = defaultYardOpeningHours();
    }
    const parsed = parseOpeningHoursSchedule(json);
    if (!parsed) {
      redirect("/dashboard/onboarding?error=" + encodeURIComponent("Invalid opening hours."));
    }
    openingHoursSchedule = parsed as unknown as Prisma.InputJsonValue;
  }

  let yardSlug: string | undefined;
  const vatRegistered = sellerType === "reclamation_yard" && vatRegisteredRaw === "yes";
  if (sellerType === "reclamation_yard") {
    const baseName = (businessName?.trim() || displayName.trim()) as string;
    yardSlug = await allocateYardSlug(prisma, baseName, session.user.id);
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
        openingHours: null,
        openingHoursSchedule,
        yardSlug: sellerType === "reclamation_yard" ? yardSlug : null,
        vatRegistered: sellerType === "reclamation_yard" ? vatRegistered : false,
      },
    }),
  ]);

  if (sellerType === "reclamation_yard" && resolved.adminDistrict?.trim()) {
    revalidatePath("/reclamation-yards");
    revalidatePath(`/reclamation-yards/${slugifyAdminDistrict(resolved.adminDistrict)}`);
  }

  redirect("/dashboard/onboarding?phase=payments");
}

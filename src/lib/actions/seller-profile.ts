"use server";

import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { parseOpeningHoursSchedule } from "@/lib/opening-hours";
import { resolveYardSlugForUpdate } from "@/lib/yard-slug";
import { yardSocialFromForm } from "@/lib/yard-social";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { Prisma } from "@/generated/prisma/client";

function normalizeWebsiteUrl(raw: string | null | undefined): string | null {
  const t = raw?.trim();
  if (!t) return null;
  if (/^https?:\/\//i.test(t)) return t;
  return `https://${t}`;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function updateYardProfileAction(formData: FormData): Promise<void> {
  const session = await auth();
  if (!session?.user?.id) redirect("/auth/signin");
  if (session.user.role !== "reclamation_yard") redirect("/dashboard");

  const displayName = (formData.get("displayName") as string)?.trim();
  if (!displayName) {
    redirect("/dashboard/seller-profile?error=" + encodeURIComponent("Display name is required."));
  }

  const slugRaw = formData.get("yardSlug") as string | null;
  const slugResult = await resolveYardSlugForUpdate(prisma, slugRaw ?? "", session.user.id);
  if (!slugResult.ok) {
    redirect("/dashboard/seller-profile?error=" + encodeURIComponent(slugResult.error));
  }

  const scheduleRaw = formData.get("openingHoursSchedule") as string | null;
  if (!scheduleRaw?.trim()) {
    redirect("/dashboard/seller-profile?error=" + encodeURIComponent("Opening hours data missing."));
  }
  let parsedJson: unknown;
  try {
    parsedJson = JSON.parse(scheduleRaw) as unknown;
  } catch {
    redirect("/dashboard/seller-profile?error=" + encodeURIComponent("Invalid opening hours."));
  }
  const schedule = parseOpeningHoursSchedule(parsedJson);
  if (!schedule) {
    redirect("/dashboard/seller-profile?error=" + encodeURIComponent("Invalid opening hours."));
  }

  const yardTagline = (formData.get("yardTagline") as string)?.trim() || null;
  const yardAbout = (formData.get("yardAbout") as string)?.trim() || null;
  const yardContactEmail = (formData.get("yardContactEmail") as string)?.trim() || null;
  if (yardContactEmail && !EMAIL_RE.test(yardContactEmail)) {
    redirect("/dashboard/seller-profile?error=" + encodeURIComponent("Enter a valid contact email or leave it blank."));
  }
  const yardContactPhone = (formData.get("yardContactPhone") as string)?.trim() || null;
  const yardWebsiteUrl = normalizeWebsiteUrl(formData.get("yardWebsiteUrl") as string | null);

  const yardLogoUrl = (formData.get("yardLogoUrl") as string)?.trim() || null;
  const yardHeaderImageUrl = (formData.get("yardHeaderImageUrl") as string)?.trim() || null;

  const social = yardSocialFromForm(formData);

  await prisma.sellerProfile.update({
    where: { userId: session.user.id },
    data: {
      displayName,
      businessName: (formData.get("businessName") as string)?.trim() || null,
      yardSlug: slugResult.slug,
      yardTagline,
      yardAbout,
      yardLogoUrl: yardLogoUrl || null,
      yardHeaderImageUrl: yardHeaderImageUrl || null,
      yardContactEmail,
      yardContactPhone,
      yardWebsiteUrl,
      yardSocialJson:
        social === undefined ? Prisma.JsonNull : (social as Prisma.InputJsonValue),
      openingHoursSchedule: schedule as unknown as Prisma.InputJsonValue,
      openingHours: null,
    },
  });

  revalidatePath("/dashboard/seller-profile");
  revalidatePath("/dashboard");
  revalidatePath(`/sellers/${session.user.id}`);
  revalidatePath(`/reclamation-yard/${slugResult.slug}`);
  redirect("/dashboard/seller-profile?saved=1");
}

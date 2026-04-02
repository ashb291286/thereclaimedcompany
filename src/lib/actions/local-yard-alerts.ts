"use server";

import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";

export async function declineListingLocalYardAlert(alertId: string) {
  const session = await auth();
  if (!session?.user?.id) {
    return { ok: false as const, error: "Sign in required." };
  }

  const alert = await prisma.listingLocalYardAlert.findUnique({
    where: { id: alertId },
    include: { listing: { select: { id: true, sellerId: true, title: true } } },
  });
  if (!alert || alert.yardUserId !== session.user.id) {
    return { ok: false as const, error: "Alert not found." };
  }
  if (alert.status !== "PENDING") {
    return { ok: false as const, error: "Already responded." };
  }

  const now = new Date();
  await prisma.listingLocalYardAlert.update({
    where: { id: alertId },
    data: { status: "DECLINED", respondedAt: now },
  });

  revalidatePath(`/listings/${alert.listingId}`);
  revalidatePath("/dashboard/nearby-stock");
  revalidatePath("/dashboard");
  return { ok: true as const };
}

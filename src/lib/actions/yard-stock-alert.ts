"use server";

import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";

export async function toggleYardStockAlertAction(formData: FormData): Promise<{ ok: boolean; message?: string }> {
  const session = await auth();
  if (!session?.user?.id) {
    return { ok: false, message: "Sign in to set stock alerts." };
  }

  const sellerId = String(formData.get("sellerId") ?? "").trim();
  const yardSlug = String(formData.get("yardSlug") ?? "").trim();
  const categoryIdRaw = String(formData.get("categoryId") ?? "").trim();
  const categoryId = categoryIdRaw && categoryIdRaw !== "all" ? categoryIdRaw : null;

  if (!sellerId || !yardSlug) return { ok: false, message: "Missing yard." };

  const yard = await prisma.sellerProfile.findUnique({
    where: { userId: sellerId },
    select: { yardSlug: true, user: { select: { role: true } } },
  });
  if (!yard || yard.user.role !== "reclamation_yard" || yard.yardSlug !== yardSlug) {
    return { ok: false, message: "Yard not found." };
  }
  if (sellerId === session.user.id) {
    return { ok: false, message: "You cannot alert on your own yard." };
  }

  const existing = await prisma.yardStockAlert.findFirst({
    where: {
      userId: session.user.id,
      sellerId,
      categoryId,
    },
  });

  if (existing) {
    await prisma.yardStockAlert.delete({ where: { id: existing.id } });
    revalidatePath(`/yards/${yardSlug}`);
    revalidatePath("/dashboard/stock-alerts");
    return { ok: true };
  }

  await prisma.yardStockAlert.create({
    data: {
      userId: session.user.id,
      sellerId,
      categoryId,
    },
  });
  revalidatePath(`/yards/${yardSlug}`);
  revalidatePath("/dashboard/stock-alerts");
  return { ok: true };
}

"use server";

import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

function safeInternalPath(raw: string): string {
  const t = raw.trim();
  if (!t.startsWith("/") || t.startsWith("//")) return "/dashboard/stock-alerts";
  return t;
}

/** Form actions must return void — use redirect only when sign-in is required. */
export async function toggleYardStockAlertAction(formData: FormData): Promise<void> {
  const session = await auth();
  if (!session?.user?.id) {
    const cb = safeInternalPath(String(formData.get("callbackUrl") ?? ""));
    redirect(`/auth/signin?callbackUrl=${encodeURIComponent(cb)}`);
  }

  const sellerId = String(formData.get("sellerId") ?? "").trim();
  const yardSlug = String(formData.get("yardSlug") ?? "").trim();
  const categoryIdRaw = String(formData.get("categoryId") ?? "").trim();
  const categoryId = categoryIdRaw && categoryIdRaw !== "all" ? categoryIdRaw : null;

  if (!sellerId || !yardSlug) return;

  const yard = await prisma.sellerProfile.findUnique({
    where: { userId: sellerId },
    select: { yardSlug: true, user: { select: { role: true } } },
  });
  if (!yard || yard.user.role !== "reclamation_yard" || yard.yardSlug !== yardSlug) {
    return;
  }
  if (sellerId === session.user.id) {
    return;
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
    return;
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
}

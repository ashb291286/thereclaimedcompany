"use server";

import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { isCarbonAdmin } from "@/lib/admin";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { ListingStatus } from "@/generated/prisma/client";

async function requireAdmin(): Promise<void> {
  const session = await auth();
  if (!session?.user?.id) redirect("/auth/signin");
  if (!isCarbonAdmin(session)) redirect("/dashboard");
}

export async function adminToggleUserSuspensionAction(formData: FormData): Promise<void> {
  await requireAdmin();
  const userId = String(formData.get("userId") ?? "").trim();
  const mode = String(formData.get("mode") ?? "").trim();
  const reason = String(formData.get("reason") ?? "").trim().slice(0, 1200) || null;
  if (!userId || (mode !== "suspend" && mode !== "unsuspend")) return;

  await prisma.user.update({
    where: { id: userId },
    data:
      mode === "suspend"
        ? { suspendedAt: new Date(), suspensionReason: reason }
        : { suspendedAt: null, suspensionReason: null },
  });

  revalidatePath("/dashboard/admin");
}

export async function adminDeleteListingAction(formData: FormData): Promise<void> {
  await requireAdmin();
  const listingId = String(formData.get("listingId") ?? "").trim();
  if (!listingId) return;
  try {
    await prisma.listing.delete({ where: { id: listingId } });
  } catch {
    redirect("/dashboard/admin?error=delete_blocked");
  }
  revalidatePath("/dashboard/admin");
}

export async function adminSetListingVisibilityAction(formData: FormData): Promise<void> {
  await requireAdmin();
  const listingId = String(formData.get("listingId") ?? "").trim();
  const visible = String(formData.get("visible") ?? "") === "1";
  if (!listingId) return;
  await prisma.listing.update({
    where: { id: listingId },
    data: { visibleOnMarketplace: visible },
  });
  revalidatePath("/dashboard/admin");
}

export async function adminSetListingStatusAction(formData: FormData): Promise<void> {
  await requireAdmin();
  const listingId = String(formData.get("listingId") ?? "").trim();
  const statusRaw = String(formData.get("status") ?? "").trim();
  if (!listingId) return;
  const allowed: ListingStatus[] = ["draft", "active", "ended", "sold", "payment_pending"];
  if (!allowed.includes(statusRaw as ListingStatus)) return;
  await prisma.listing.update({
    where: { id: listingId },
    data: { status: statusRaw as ListingStatus },
  });
  revalidatePath("/dashboard/admin");
}

/** Deletes read in-app notifications older than the cutoff (housekeeping). */
export async function adminPurgeReadNotificationsAction(formData: FormData): Promise<void> {
  await requireAdmin();
  if (String(formData.get("confirm") ?? "") !== "on") return;
  const days = parseInt(String(formData.get("olderThanDays") ?? "90"), 10);
  if (!Number.isFinite(days) || days < 30 || days > 730) return;
  const cutoff = new Date(Date.now() - days * 86400000);
  await prisma.notification.deleteMany({
    where: {
      readAt: { not: null },
      createdAt: { lt: cutoff },
    },
  });
  revalidatePath("/dashboard/admin");
}

"use server";

import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { isCarbonAdmin } from "@/lib/admin";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { ListingStatus, UserRole } from "@/generated/prisma/client";

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

export async function adminSetUserRoleAction(formData: FormData): Promise<void> {
  await requireAdmin();
  const userId = String(formData.get("userId") ?? "").trim();
  const roleRaw = String(formData.get("role") ?? "").trim();
  if (!userId) return;
  const allowed: UserRole[] = ["individual", "dealer", "reclamation_yard"];
  if (!allowed.includes(roleRaw as UserRole)) return;

  await prisma.user.update({
    where: { id: userId },
    data: { role: roleRaw as UserRole },
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

function slugify(raw: string): string {
  return raw
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 120);
}

export async function adminCreateBlogPostAction(formData: FormData): Promise<void> {
  await requireAdmin();
  const title = String(formData.get("title") ?? "").trim().slice(0, 180);
  const slugInput = String(formData.get("slug") ?? "").trim();
  const excerptRaw = String(formData.get("excerpt") ?? "").trim();
  const htmlContent = String(formData.get("htmlContent") ?? "").trim();
  const published = String(formData.get("published") ?? "") === "on";
  if (!title || !htmlContent) return;
  const slug = slugify(slugInput || title);
  if (!slug) return;
  const existing = await prisma.blogPost.findUnique({ where: { slug }, select: { id: true } });
  if (existing) redirect("/dashboard/admin?error=blog_slug_taken");

  await prisma.blogPost.create({
    data: {
      title,
      slug,
      excerpt: excerptRaw ? excerptRaw.slice(0, 300) : null,
      htmlContent,
      published,
      publishedAt: published ? new Date() : null,
    },
  });
  revalidatePath("/");
  revalidatePath("/blog");
  revalidatePath("/dashboard/admin");
}

export async function adminDeleteBlogPostAction(formData: FormData): Promise<void> {
  await requireAdmin();
  const id = String(formData.get("id") ?? "").trim();
  if (!id) return;
  const post = await prisma.blogPost.findUnique({ where: { id }, select: { slug: true } });
  await prisma.blogPost.deleteMany({ where: { id } });
  revalidatePath("/");
  revalidatePath("/blog");
  if (post?.slug) revalidatePath(`/blog/${post.slug}`);
  revalidatePath("/dashboard/admin");
}

export async function adminSetBlogPublishedAction(formData: FormData): Promise<void> {
  await requireAdmin();
  const id = String(formData.get("id") ?? "").trim();
  const published = String(formData.get("published") ?? "") === "1";
  if (!id) return;
  const post = await prisma.blogPost.update({
    where: { id },
    data: {
      published,
      publishedAt: published ? new Date() : null,
    },
    select: { slug: true },
  });
  revalidatePath("/");
  revalidatePath("/blog");
  revalidatePath(`/blog/${post.slug}`);
  revalidatePath("/dashboard/admin");
}

function parseBps(formData: FormData, key: string, fallback: number, min = 0, max = 10000): number {
  const v = parseInt(String(formData.get(key) ?? ""), 10);
  if (!Number.isFinite(v)) return fallback;
  return Math.min(max, Math.max(min, v));
}

function parsePence(formData: FormData, key: string, fallback: number, min = 0, max = 100000): number {
  const v = parseInt(String(formData.get(key) ?? ""), 10);
  if (!Number.isFinite(v)) return fallback;
  return Math.min(max, Math.max(min, v));
}

export async function adminUpdateMarketplaceFeesAction(formData: FormData): Promise<void> {
  await requireAdmin();
  const next = {
    commissionPercentBps: parseBps(formData, "commissionPercentBps", 1000),
    commissionFixedPence: parsePence(formData, "commissionFixedPence", 20),
    commissionVatRateBps: parseBps(formData, "commissionVatRateBps", 2000, 0, 2500),
    stripeFeePercentBps: parseBps(formData, "stripeFeePercentBps", 150),
    stripeFeeFixedPence: parsePence(formData, "stripeFeeFixedPence", 20),
    digitalMarketplaceFeeBps: parseBps(formData, "digitalMarketplaceFeeBps", 0),
    digitalMarketplaceFeeFixedPence: parsePence(formData, "digitalMarketplaceFeeFixedPence", 0),
  };
  await prisma.marketplaceFeeSettings.upsert({
    where: { id: "default" },
    update: next,
    create: { id: "default", ...next },
  });
  revalidatePath("/dashboard/admin");
}

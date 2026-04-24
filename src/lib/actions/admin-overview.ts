"use server";

import { randomBytes } from "node:crypto";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { isCarbonAdmin } from "@/lib/admin";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { ListingStatus, UserRole } from "@/generated/prisma/client";
import { lookupUkPostcode } from "@/lib/postcode-uk";
import { allocateYardSlug } from "@/lib/yard-slug";
import { resolveYardSlugForUpdate } from "@/lib/yard-slug";
import { slugifyAdminDistrict } from "@/lib/yard-area-seo";
import { revalidateYardPublicPaths } from "@/lib/revalidate-yard";
import {
  removeListingFromWooCommerce,
  syncListingToWooCommerce,
} from "@/lib/listing-woocommerce-sync";

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

/**
 * Irreversibly remove a user account. Blocked when they are buyer or seller on any order (audit).
 * Does not run if the target is the current admin session user.
 */
export async function adminDeleteUserAccountAction(formData: FormData): Promise<void> {
  const session = await auth();
  await requireAdmin();
  const userId = String(formData.get("userId") ?? "").trim();
  const confirmDelete = String(formData.get("confirmDelete") ?? "").trim();
  if (!userId) return;

  if (session?.user?.id === userId) {
    redirect("/dashboard/admin?error=delete_self");
  }

  const target = await prisma.user.findUnique({
    where: { id: userId },
    select: { email: true },
  });
  if (!target) {
    redirect("/dashboard/admin?error=delete_user_missing");
  }

  const email = target.email?.trim() ?? null;
  if (email) {
    if (confirmDelete.toLowerCase() !== email.toLowerCase()) {
      redirect("/dashboard/admin?error=delete_confirm_mismatch");
    }
  } else {
    if (confirmDelete !== "DELETE") {
      redirect("/dashboard/admin?error=delete_confirm_mismatch");
    }
  }

  const orderCount = await prisma.order.count({
    where: { OR: [{ buyerId: userId }, { sellerId: userId }] },
  });
  if (orderCount > 0) {
    redirect("/dashboard/admin?error=user_has_orders");
  }

  try {
    await prisma.$transaction(async (tx) => {
      await tx.drivenGarageEntry.deleteMany({ where: { userId } });
      await tx.drivenVehicle.deleteMany({ where: { ownerId: userId } });
      await tx.user.delete({ where: { id: userId } });
    });
  } catch (e) {
    console.error("adminDeleteUserAccountAction", e);
    redirect("/dashboard/admin?error=delete_user_failed");
  }

  revalidatePath("/dashboard/admin");
  redirect("/dashboard/admin?userDeleted=1");
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
    await removeListingFromWooCommerce(listingId);
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
  await syncListingToWooCommerce(listingId);
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
  await syncListingToWooCommerce(listingId);
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

function normalizeWebsiteUrl(raw: string | null | undefined): string | null {
  const t = raw?.trim();
  if (!t) return null;
  if (/^https?:\/\//i.test(t)) return t;
  return `https://${t}`;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function adminUpdateYardDetailsAction(formData: FormData): Promise<void> {
  await requireAdmin();
  const sellerProfileId = String(formData.get("sellerProfileId") ?? "").trim();
  if (!sellerProfileId) return;

  const existing = await prisma.sellerProfile.findUnique({
    where: { id: sellerProfileId },
    select: {
      id: true,
      userId: true,
      yardSlug: true,
      adminDistrict: true,
      user: { select: { role: true } },
    },
  });
  if (!existing || existing.user.role !== "reclamation_yard") {
    redirect("/dashboard/admin?error=yard_edit_missing");
  }

  const displayName = String(formData.get("displayName") ?? "").trim();
  const businessName = String(formData.get("businessName") ?? "").trim();
  const postcodeRaw = String(formData.get("postcode") ?? "").trim();
  const yardSlugRaw = String(formData.get("yardSlug") ?? "").trim();
  const yardTagline = String(formData.get("yardTagline") ?? "").trim();
  const yardContactEmail = String(formData.get("yardContactEmail") ?? "").trim();
  const yardContactPhone = String(formData.get("yardContactPhone") ?? "").trim();
  const yardWebsiteUrlRaw = String(formData.get("yardWebsiteUrl") ?? "").trim();
  const vatRegistered = String(formData.get("vatRegistered") ?? "").trim() === "yes";
  const salvoCodeMember = String(formData.get("salvoCodeMember") ?? "").trim() === "yes";
  const isRegisteredCharity = String(formData.get("isRegisteredCharity") ?? "").trim() === "yes";
  const charityNumber = String(formData.get("charityNumber") ?? "").trim().toUpperCase().replace(/\s+/g, "");

  if (!displayName || !postcodeRaw) {
    redirect(`/dashboard/admin/yards/${sellerProfileId}/edit?error=required`);
  }
  if (yardContactEmail && !EMAIL_RE.test(yardContactEmail)) {
    redirect(`/dashboard/admin/yards/${sellerProfileId}/edit?error=email`);
  }
  if (isRegisteredCharity && charityNumber.length < 5) {
    redirect(`/dashboard/admin/yards/${sellerProfileId}/edit?error=charity_number`);
  }
  const resolvedPostcode = await lookupUkPostcode(postcodeRaw);
  if (!resolvedPostcode) {
    redirect(`/dashboard/admin/yards/${sellerProfileId}/edit?error=postcode`);
  }
  const slugResult = await resolveYardSlugForUpdate(prisma, yardSlugRaw, existing.userId);
  if (!slugResult.ok) {
    redirect(`/dashboard/admin/yards/${sellerProfileId}/edit?error=slug`);
  }

  await prisma.sellerProfile.update({
    where: { id: sellerProfileId },
    data: {
      displayName,
      businessName: businessName || null,
      postcode: resolvedPostcode.postcode,
      lat: resolvedPostcode.lat,
      lng: resolvedPostcode.lng,
      adminDistrict: resolvedPostcode.adminDistrict,
      region: resolvedPostcode.region,
      postcodeLocality: resolvedPostcode.postcodeLocality,
      yardSlug: slugResult.slug,
      yardTagline: yardTagline || null,
      yardContactEmail: yardContactEmail || null,
      yardContactPhone: yardContactPhone || null,
      yardWebsiteUrl: normalizeWebsiteUrl(yardWebsiteUrlRaw),
      vatRegistered,
      salvoCodeMember,
      isRegisteredCharity,
      charityNumber: isRegisteredCharity ? charityNumber : null,
    },
  });

  if (existing.adminDistrict?.trim()) {
    revalidatePath(`/reclamation-yards/${slugifyAdminDistrict(existing.adminDistrict)}`);
  }
  if (resolvedPostcode.adminDistrict?.trim()) {
    revalidatePath(`/reclamation-yards/${slugifyAdminDistrict(resolvedPostcode.adminDistrict)}`);
  }
  if (existing.yardSlug && existing.yardSlug !== slugResult.slug) {
    revalidatePath(`/yards/${existing.yardSlug}`);
  }
  revalidateYardPublicPaths(slugResult.slug);
  revalidatePath("/dashboard/admin");
  revalidatePath("/reclamation-yards");
  revalidatePath("/search");
  revalidatePath(`/sellers/${existing.userId}`);
  redirect(`/dashboard/admin/yards/${sellerProfileId}/edit?saved=1`);
}

export async function adminCreateBlogPostAction(formData: FormData): Promise<void> {
  await requireAdmin();
  const title = String(formData.get("title") ?? "").trim().slice(0, 180);
  const slugInput = String(formData.get("slug") ?? "").trim();
  const excerptRaw = String(formData.get("excerpt") ?? "").trim();
  const featuredImageUrlRaw = String(formData.get("featuredImageUrl") ?? "").trim();
  const htmlContent = String(formData.get("htmlContent") ?? "").trim();
  const published = String(formData.get("published") ?? "") === "on";
  if (!title || !htmlContent) return;
  const slug = slugify(slugInput || title);
  if (!slug) return;
  const existing = await prisma.blogPost.findUnique({ where: { slug }, select: { id: true } });
  if (existing) redirect("/dashboard/admin?error=blog_slug_taken");

  const featuredImageUrl =
    featuredImageUrlRaw && /^https?:\/\//i.test(featuredImageUrlRaw)
      ? featuredImageUrlRaw.slice(0, 2048)
      : null;

  await prisma.blogPost.create({
    data: {
      title,
      slug,
      excerpt: excerptRaw ? excerptRaw.slice(0, 300) : null,
      featuredImageUrl,
      htmlContent,
      published,
      publishedAt: published ? new Date() : null,
    },
  });
  revalidatePath("/");
  revalidatePath("/blog");
  revalidatePath("/dashboard/admin");
}

export async function adminUpdateBlogPostAction(formData: FormData): Promise<void> {
  await requireAdmin();
  const id = String(formData.get("id") ?? "").trim();
  const title = String(formData.get("title") ?? "").trim().slice(0, 180);
  const slugInput = String(formData.get("slug") ?? "").trim();
  const excerptRaw = String(formData.get("excerpt") ?? "").trim();
  const featuredImageUrlRaw = String(formData.get("featuredImageUrl") ?? "").trim();
  const htmlContent = String(formData.get("htmlContent") ?? "").trim();
  const published = String(formData.get("published") ?? "") === "on";
  if (!id || !title || !htmlContent) return;

  const existing = await prisma.blogPost.findUnique({
    where: { id },
    select: { slug: true, publishedAt: true },
  });
  if (!existing) return;

  const newSlug = slugify(slugInput || title);
  if (!newSlug) return;

  const slugOwner = await prisma.blogPost.findFirst({
    where: { slug: newSlug, NOT: { id } },
    select: { id: true },
  });
  if (slugOwner) redirect(`/dashboard/admin/blog/${id}/edit?error=blog_slug_taken`);

  const featuredImageUrl =
    featuredImageUrlRaw && /^https?:\/\//i.test(featuredImageUrlRaw)
      ? featuredImageUrlRaw.slice(0, 2048)
      : null;

  const publishedAt = published ? (existing.publishedAt ?? new Date()) : null;

  await prisma.blogPost.update({
    where: { id },
    data: {
      title,
      slug: newSlug,
      excerpt: excerptRaw ? excerptRaw.slice(0, 300) : null,
      featuredImageUrl,
      htmlContent,
      published,
      publishedAt,
    },
  });

  if (existing.slug !== newSlug) {
    revalidatePath(`/blog/${existing.slug}`);
  }
  revalidatePath("/");
  revalidatePath("/blog");
  revalidatePath(`/blog/${newSlug}`);
  revalidatePath("/dashboard/admin");
  revalidatePath(`/dashboard/admin/blog/${id}/edit`);
  redirect(`/dashboard/admin/blog/${id}/edit`);
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

function randomClaimCode(): string {
  return randomBytes(6).toString("hex").toUpperCase();
}

export async function adminCreateOnboardedSellerAction(formData: FormData): Promise<void> {
  await requireAdmin();

  const roleRaw = String(formData.get("role") ?? "").trim();
  const role: UserRole = roleRaw === "dealer" ? "dealer" : "reclamation_yard";
  const displayName = String(formData.get("displayName") ?? "").trim().slice(0, 200);
  const businessNameRaw = String(formData.get("businessName") ?? "").trim().slice(0, 200);
  const postcodeRaw = String(formData.get("postcode") ?? "").trim();
  const claimContactEmailRaw = String(formData.get("claimContactEmail") ?? "").trim().toLowerCase();
  const yardSlugRaw = String(formData.get("yardSlug") ?? "").trim().toLowerCase();

  if (!displayName || !postcodeRaw) {
    redirect("/dashboard/admin?error=onboard_missing");
  }

  const postcode = await lookupUkPostcode(postcodeRaw);
  if (!postcode) {
    redirect("/dashboard/admin?error=onboard_postcode");
  }

  const claimContactEmail = claimContactEmailRaw || null;

  const user = await prisma.user.create({
    data: {
      email: null,
      password: null,
      name: displayName,
      role,
      registrationIntent: "selling",
    },
    select: { id: true },
  });

  let yardSlug: string | null = null;
  if (role === "reclamation_yard") {
    if (yardSlugRaw) {
      const taken = await prisma.sellerProfile.findUnique({
        where: { yardSlug: yardSlugRaw },
        select: { id: true },
      });
      if (taken) {
        redirect("/dashboard/admin?error=onboard_slug_taken");
      }
      yardSlug = yardSlugRaw;
    } else {
      yardSlug = await allocateYardSlug(prisma, businessNameRaw || displayName, user.id);
    }
  }

  await prisma.sellerProfile.create({
    data: {
      userId: user.id,
      businessName: role === "reclamation_yard" ? businessNameRaw || null : null,
      displayName,
      postcode: postcode.postcode,
      lat: postcode.lat,
      lng: postcode.lng,
      adminDistrict: postcode.adminDistrict,
      region: postcode.region,
      postcodeLocality: postcode.postcodeLocality,
      yardSlug,
      importedByAdmin: true,
      claimCode: randomClaimCode(),
      claimContactEmail,
    },
  });

  revalidatePath("/dashboard/admin");
}

export async function adminAssignListingToUserAction(formData: FormData): Promise<void> {
  await requireAdmin();
  const listingId = String(formData.get("listingId") ?? "").trim();
  const targetUserId = String(formData.get("targetUserId") ?? "").trim();
  if (!listingId || !targetUserId) return;

  const target = await prisma.sellerProfile.findUnique({
    where: { userId: targetUserId },
    select: { userId: true, importedByAdmin: true },
  });
  if (!target?.importedByAdmin) {
    redirect("/dashboard/admin?error=onboard_target");
  }

  await prisma.listing.update({
    where: { id: listingId },
    data: { sellerId: target.userId },
  });

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

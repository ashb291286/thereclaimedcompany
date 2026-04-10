"use server";

import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { isCarbonAdmin } from "@/lib/admin";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { syncListingToWooCommerce } from "@/lib/listing-woocommerce-sync";

export async function updateCategoryWooSyncAction(formData: FormData): Promise<void> {
  const session = await auth();
  if (!session?.user?.id) redirect("/auth/signin");
  if (!isCarbonAdmin(session)) {
    redirect("/dashboard/admin/woocommerce-sync?error=" + encodeURIComponent("Not allowed"));
  }

  const categoryId = String(formData.get("categoryId") ?? "").trim();
  if (!categoryId) {
    redirect("/dashboard/admin/woocommerce-sync?error=" + encodeURIComponent("Missing category"));
  }

  const enabled = formData.get("wooCommerceSyncEnabled") === "on";
  const rawWc = String(formData.get("wooCommerceCategoryId") ?? "").trim();
  const wcCatId = rawWc ? parseInt(rawWc, 10) : null;

  if (enabled && (wcCatId == null || Number.isNaN(wcCatId) || wcCatId < 1)) {
    redirect(
      "/dashboard/admin/woocommerce-sync?error=" +
        encodeURIComponent("WooCommerce category ID must be a positive integer when sync is on.")
    );
  }

  await prisma.category.update({
    where: { id: categoryId },
    data: {
      wooCommerceSyncEnabled: enabled,
      wooCommerceCategoryId: enabled ? wcCatId : null,
    },
  });

  revalidatePath("/dashboard/admin/woocommerce-sync");
  redirect("/dashboard/admin/woocommerce-sync?ok=1");
}

/** Re-push all active marketplace listings in categories that have sync enabled. */
export async function resyncWooCommerceListingsAction(): Promise<void> {
  const session = await auth();
  if (!session?.user?.id) redirect("/auth/signin");
  if (!isCarbonAdmin(session)) {
    redirect("/dashboard/admin/woocommerce-sync?error=" + encodeURIComponent("Not allowed"));
  }

  const listings = await prisma.listing.findMany({
    where: {
      status: "active",
      visibleOnMarketplace: true,
      category: {
        wooCommerceSyncEnabled: true,
        wooCommerceCategoryId: { not: null },
      },
    },
    select: { id: true },
  });

  for (const l of listings) {
    await syncListingToWooCommerce(l.id);
  }

  revalidatePath("/dashboard/admin/woocommerce-sync");
  redirect(`/dashboard/admin/woocommerce-sync?bulk=${listings.length}`);
}

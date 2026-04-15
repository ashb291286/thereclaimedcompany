"use server";

import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { isCarbonAdmin } from "@/lib/admin";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { slugifyCategoryName } from "@/lib/category-suggest";

async function uniqueSlug(base: string): Promise<string> {
  let s = base;
  let n = 0;
  while (await prisma.category.findUnique({ where: { slug: s } })) {
    n += 1;
    s = `${base}-${n}`;
  }
  return s;
}

export async function createMarketplaceCategoryAction(formData: FormData): Promise<void> {
  const session = await auth();
  if (!session?.user?.id) redirect("/auth/signin");
  if (!isCarbonAdmin(session)) {
    redirect(
      "/dashboard/admin/marketplace-categories?error=" + encodeURIComponent("Not allowed")
    );
  }

  const name = String(formData.get("name") ?? "").trim().slice(0, 120);
  if (!name) {
    redirect(
      "/dashboard/admin/marketplace-categories?error=" + encodeURIComponent("Name is required")
    );
  }

  const slugRaw = String(formData.get("slug") ?? "").trim().toLowerCase();
  const baseSlug = slugRaw
    ? slugifyCategoryName(slugRaw.replace(/\s+/g, "-"))
    : slugifyCategoryName(name);
  if (!baseSlug) {
    redirect(
      "/dashboard/admin/marketplace-categories?error=" +
        encodeURIComponent("Could not build a URL slug — use letters or numbers in the name.")
    );
  }
  const slug = await uniqueSlug(baseSlug);

  const parentIdRaw = String(formData.get("parentId") ?? "").trim();
  let parentId: string | null = null;
  if (parentIdRaw) {
    const parent = await prisma.category.findUnique({ where: { id: parentIdRaw } });
    if (!parent) {
      redirect(
        "/dashboard/admin/marketplace-categories?error=" + encodeURIComponent("Invalid parent category")
      );
    }
    parentId = parent.id;
  }

  await prisma.category.create({
    data: {
      name,
      slug,
      parentId,
    },
  });

  revalidatePath("/dashboard/sell");
  revalidatePath("/dashboard/listings");
  revalidatePath("/search");
  revalidatePath("/dashboard/admin/marketplace-categories");
  revalidatePath("/dashboard/admin/woocommerce-sync");
  revalidatePath("/dashboard/wanted");
  revalidatePath("/dashboard/prop-yard");

  redirect("/dashboard/admin/marketplace-categories?created=1");
}

export async function updateMarketplaceCategoryAction(formData: FormData): Promise<void> {
  const session = await auth();
  if (!session?.user?.id) redirect("/auth/signin");
  if (!isCarbonAdmin(session)) {
    redirect(
      "/dashboard/admin/marketplace-categories?error=" + encodeURIComponent("Not allowed")
    );
  }

  const id = String(formData.get("id") ?? "").trim();
  const name = String(formData.get("name") ?? "").trim().slice(0, 120);
  const parentIdRaw = String(formData.get("parentId") ?? "").trim();

  if (!id) {
    redirect(
      "/dashboard/admin/marketplace-categories?error=" +
        encodeURIComponent("Category id is required")
    );
  }
  if (!name) {
    redirect(
      "/dashboard/admin/marketplace-categories?error=" + encodeURIComponent("Name is required")
    );
  }

  let parentId: string | null = null;
  if (parentIdRaw) {
    if (parentIdRaw === id) {
      redirect(
        "/dashboard/admin/marketplace-categories?error=" +
          encodeURIComponent("A category cannot be its own parent")
      );
    }
    const parent = await prisma.category.findUnique({
      where: { id: parentIdRaw },
      select: { id: true, parentId: true },
    });
    if (!parent) {
      redirect(
        "/dashboard/admin/marketplace-categories?error=" +
          encodeURIComponent("Invalid parent category")
      );
    }

    // Prevent hierarchy loops: the new parent cannot be a child/descendant of the edited category.
    let cursor = parent.parentId;
    while (cursor) {
      if (cursor === id) {
        redirect(
          "/dashboard/admin/marketplace-categories?error=" +
            encodeURIComponent("Invalid parent: this would create a category loop")
        );
      }
      const next = await prisma.category.findUnique({
        where: { id: cursor },
        select: { parentId: true },
      });
      cursor = next?.parentId ?? null;
    }

    parentId = parent.id;
  }

  await prisma.category.update({
    where: { id },
    data: { name, parentId },
  });

  revalidatePath("/dashboard/sell");
  revalidatePath("/search");
  revalidatePath("/dashboard/admin/marketplace-categories");

  redirect("/dashboard/admin/marketplace-categories?updated=1");
}

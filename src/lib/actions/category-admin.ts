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

/** Slug unique among other rows; allows keeping the same slug on the category being updated. */
async function uniqueSlugForCategory(base: string, categoryId: string): Promise<string> {
  let s = base;
  let n = 0;
  while (true) {
    const found = await prisma.category.findUnique({ where: { slug: s }, select: { id: true } });
    if (!found || found.id === categoryId) return s;
    n += 1;
    s = `${base}-${n}`;
  }
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
  revalidatePath("/categories");
  revalidatePath(`/categories/${slug}`);

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
  const slugRaw = String(formData.get("slug") ?? "").trim();

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

  const existingRow = await prisma.category.findUnique({
    where: { id },
    select: { slug: true },
  });
  if (!existingRow) {
    redirect(
      "/dashboard/admin/marketplace-categories?error=" + encodeURIComponent("Unknown category")
    );
  }

  if (!slugRaw) {
    redirect(
      "/dashboard/admin/marketplace-categories?error=" +
        encodeURIComponent("URL slug is required when saving")
    );
  }
  const baseSlug = slugifyCategoryName(slugRaw.toLowerCase().replace(/\s+/g, "-"));
  if (!baseSlug) {
    redirect(
      "/dashboard/admin/marketplace-categories?error=" +
        encodeURIComponent("Could not build a URL slug — use letters or numbers.")
    );
  }
  const slug = await uniqueSlugForCategory(baseSlug, id);
  const previousSlug = existingRow.slug;

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
    data: { name, parentId, slug },
  });

  revalidatePath("/dashboard/sell");
  revalidatePath("/dashboard/listings");
  revalidatePath("/search");
  revalidatePath("/dashboard/admin/marketplace-categories");
  revalidatePath("/dashboard/admin/woocommerce-sync");
  revalidatePath("/dashboard/wanted");
  revalidatePath("/dashboard/prop-yard");
  revalidatePath("/categories");
  revalidatePath(`/categories/${previousSlug}`);
  if (slug !== previousSlug) {
    revalidatePath(`/categories/${slug}`);
  }

  redirect("/dashboard/admin/marketplace-categories?updated=1");
}

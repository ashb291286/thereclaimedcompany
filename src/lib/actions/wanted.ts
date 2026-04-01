"use server";

import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { createNotification } from "@/lib/notifications";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

export async function createWantedAd(formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) redirect("/auth/signin");

  const title = (formData.get("title") as string)?.trim();
  const description = (formData.get("description") as string)?.trim();
  const categoryIdRaw = (formData.get("categoryId") as string)?.trim();
  const categoryId = categoryIdRaw || null;
  const postcode = (formData.get("postcode") as string)?.trim() || null;
  const budgetStr = formData.get("budgetMax") as string;
  let budgetMaxPence: number | null = null;
  if (budgetStr?.trim()) {
    const n = Math.round(parseFloat(budgetStr) * 100);
    if (!Number.isNaN(n) && n > 0) budgetMaxPence = n;
  }

  if (!title || !description) {
    redirect("/dashboard/wanted/new?error=" + encodeURIComponent("Title and description are required."));
  }

  if (categoryId) {
    const cat = await prisma.category.findUnique({ where: { id: categoryId } });
    if (!cat) {
      redirect("/dashboard/wanted/new?error=" + encodeURIComponent("Invalid category."));
    }
  }

  const wanted = await prisma.wantedAd.create({
    data: {
      userId: session.user.id,
      title,
      description,
      categoryId,
      postcode,
      budgetMaxPence,
      status: "active",
    },
  });

  const sellerWhere = {
    sellerProfile: { isNot: null } as const,
    listings: {
      some: {
        status: "active" as const,
        ...(categoryId ? { categoryId } : {}),
      },
    },
  };

  const sellers = await prisma.user.findMany({
    where: sellerWhere,
    select: { id: true },
    distinct: ["id"],
  });

  const buyerLabel = session.user.name ?? session.user.email ?? "Someone";
  const budgetLine =
    budgetMaxPence != null
      ? ` Budget up to £${(budgetMaxPence / 100).toFixed(2)}.`
      : "";

  for (const s of sellers) {
    if (s.id === session.user.id) continue;
    await createNotification({
      userId: s.id,
      type: "wanted_ad_posted",
      title: `Wanted: ${title}`,
      body: `${buyerLabel} is looking for this.${budgetLine} Can you help? Post a matching item with a price.`,
      linkUrl: `/wanted/${wanted.id}`,
    });
  }

  revalidatePath("/wanted");
  revalidatePath("/dashboard/notifications");
  redirect("/dashboard/wanted?created=1");
}

export async function markNotificationRead(id: string) {
  const session = await auth();
  if (!session?.user?.id) return;
  await prisma.notification.updateMany({
    where: { id, userId: session.user.id },
    data: { readAt: new Date() },
  });
  revalidatePath("/dashboard/notifications");
  revalidatePath("/dashboard");
}

export async function markNotificationReadForm(formData: FormData) {
  const id = formData.get("id") as string;
  if (id) await markNotificationRead(id);
}

export async function markAllNotificationsRead() {
  const session = await auth();
  if (!session?.user?.id) return;
  await prisma.notification.updateMany({
    where: { userId: session.user.id, readAt: null },
    data: { readAt: new Date() },
  });
  revalidatePath("/dashboard/notifications");
  revalidatePath("/dashboard");
}

"use server";

import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { generateListingQaOverview } from "@/lib/listing-qa-ai";
import { revalidatePath } from "next/cache";

export type ListingQaFormState = { error?: string; ok?: boolean };

const MAX_LEN = 4000;

function formatThreadLines(
  rows: Array<{
    createdAt: Date;
    body: string;
    user: { id: string; name: string | null };
    sellerId: string;
  }>
): string[] {
  return rows.map((r) => {
    const who = r.user.id === r.sellerId ? "Seller" : r.user.name?.trim() || "Member";
    const d = r.createdAt.toISOString().slice(0, 10);
    return `[${d}] ${who}: ${r.body.replace(/\s+/g, " ").trim()}`;
  });
}

async function refreshListingQaOverview(listingId: string): Promise<void> {
  const listing = await prisma.listing.findUnique({
    where: { id: listingId },
    include: {
      qaComments: {
        orderBy: { createdAt: "asc" },
        include: { user: { select: { id: true, name: true } } },
      },
    },
  });
  if (!listing) return;

  const lines = formatThreadLines(
    listing.qaComments.map((c) => ({
      createdAt: c.createdAt,
      body: c.body,
      user: c.user,
      sellerId: listing.sellerId,
    }))
  );
  const overview = await generateListingQaOverview({
    listingTitle: listing.title,
    lines,
  });

  await prisma.listing.update({
    where: { id: listingId },
    data: {
      qaAiOverview: overview,
      qaAiOverviewUpdatedAt: overview ? new Date() : null,
    },
  });
}

export async function postListingQaCommentAction(
  _prev: ListingQaFormState,
  formData: FormData
): Promise<ListingQaFormState> {
  const session = await auth();
  if (!session?.user?.id) {
    return { error: "Sign in to post a question or comment." };
  }

  const listingId = String(formData.get("listingId") ?? "").trim();
  const body = String(formData.get("body") ?? "").trim();
  const parentRaw = String(formData.get("parentId") ?? "").trim();
  const parentId = parentRaw === "" ? null : parentRaw;

  if (!listingId || !body) {
    return { error: "Write something before posting." };
  }
  if (body.length > MAX_LEN) {
    return { error: `Please keep comments under ${MAX_LEN} characters.` };
  }

  const listing = await prisma.listing.findUnique({
    where: { id: listingId },
    select: {
      id: true,
      sellerId: true,
      status: true,
      listingKind: true,
      auctionEndsAt: true,
    },
  });
  if (!listing) {
    return { error: "This listing is not available for comments." };
  }

  if (listing.status !== "active") {
    return { error: "Comments are closed for this listing." };
  }

  if (listing.listingKind === "auction" && listing.auctionEndsAt && listing.auctionEndsAt <= new Date()) {
    return { error: "This auction has ended — the Q&A thread is read-only." };
  }

  if (parentId) {
    const parent = await prisma.listingQaComment.findFirst({
      where: { id: parentId, listingId },
      select: { id: true },
    });
    if (!parent) {
      return { error: "That reply thread is no longer available." };
    }
  }

  await prisma.listingQaComment.create({
    data: {
      listingId,
      parentId,
      userId: session.user.id,
      body,
    },
  });

  await refreshListingQaOverview(listingId);
  revalidatePath(`/listings/${listingId}`);
  return { ok: true };
}

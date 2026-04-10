"use server";

import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { generateDrivenAuctionQaOverview } from "@/lib/driven/auction-qa-ai";
import { revalidatePath } from "next/cache";

export type DrivenQaFormState = { error?: string; ok?: boolean };

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
    const who =
      r.user.id === r.sellerId ? "Seller" : (r.user.name?.trim() || "Member");
    const d = r.createdAt.toISOString().slice(0, 10);
    return `[${d}] ${who}: ${r.body.replace(/\s+/g, " ").trim()}`;
  });
}

async function refreshAuctionQaOverview(auctionId: string): Promise<void> {
  const listing = await prisma.drivenAuctionListing.findUnique({
    where: { id: auctionId },
    include: {
      vehicle: { select: { make: true, model: true, year: true, ownerId: true } },
      comments: {
        orderBy: { createdAt: "asc" },
        include: { user: { select: { id: true, name: true } } },
      },
    },
  });
  if (!listing) return;

  const lines = formatThreadLines(
    listing.comments.map((c) => ({
      createdAt: c.createdAt,
      body: c.body,
      user: c.user,
      sellerId: listing.vehicle.ownerId,
    }))
  );
  const vehicleTitle = `${listing.vehicle.year} ${listing.vehicle.make} ${listing.vehicle.model}`;
  const overview = await generateDrivenAuctionQaOverview({ vehicleTitle, lines });

  await prisma.drivenAuctionListing.update({
    where: { id: auctionId },
    data: {
      qaAiOverview: overview,
      qaAiOverviewUpdatedAt: overview ? new Date() : null,
    },
  });
}

export async function postDrivenAuctionCommentAction(
  _prev: DrivenQaFormState,
  formData: FormData
): Promise<DrivenQaFormState> {
  const session = await auth();
  if (!session?.user?.id) {
    return { error: "Sign in to post a question or comment." };
  }

  const auctionId = String(formData.get("auctionId") ?? "").trim();
  const body = String(formData.get("body") ?? "").trim();
  const parentRaw = String(formData.get("parentId") ?? "").trim();
  const parentId = parentRaw === "" ? null : parentRaw;

  if (!auctionId || !body) {
    return { error: "Write something before posting." };
  }
  if (body.length > MAX_LEN) {
    return { error: `Please keep comments under ${MAX_LEN} characters.` };
  }

  const listing = await prisma.drivenAuctionListing.findUnique({
    where: { id: auctionId },
    select: {
      id: true,
      vehicle: { select: { ownerId: true } },
    },
  });
  if (!listing) {
    return { error: "This auction is not available for comments." };
  }

  if (parentId) {
    const parent = await prisma.drivenAuctionComment.findFirst({
      where: { id: parentId, auctionListingId: auctionId },
      select: { id: true },
    });
    if (!parent) {
      return { error: "That reply thread is no longer available." };
    }
  }

  await prisma.drivenAuctionComment.create({
    data: {
      auctionListingId: auctionId,
      parentId,
      userId: session.user.id,
      body,
    },
  });

  await refreshAuctionQaOverview(auctionId);
  revalidatePath(`/driven/auctions/${auctionId}`);
  return { ok: true };
}

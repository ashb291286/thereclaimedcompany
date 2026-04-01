import { prisma } from "@/lib/db";
import { NextResponse } from "next/server";

export async function POST(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id: listingId } = await ctx.params;

  const listing = await prisma.listing.findFirst({
    where: {
      id: listingId,
      status: { in: ["active", "payment_pending"] },
    },
    select: { id: true },
  });
  if (!listing) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  await prisma.listingViewEvent.create({
    data: { listingId },
  });

  return NextResponse.json({ ok: true });
}

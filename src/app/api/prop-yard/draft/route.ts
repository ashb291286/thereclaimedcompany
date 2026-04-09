import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const draft = await prisma.propListingDraft.findFirst({
    where: { yardId: session.user.id },
    orderBy: { updatedAt: "desc" },
    select: { id: true, payload: true, updatedAt: true },
  });
  return NextResponse.json({ draft });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = (await req.json().catch(() => null)) as { listingId?: string | null; payload?: unknown } | null;
  if (!body?.payload) return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  const listingId = body.listingId ?? null;
  const existing = await prisma.propListingDraft.findFirst({
    where: { yardId: session.user.id, listingId },
    select: { id: true },
  });
  if (existing) {
    await prisma.propListingDraft.update({ where: { id: existing.id }, data: { payload: body.payload as object } });
  } else {
    await prisma.propListingDraft.create({
      data: { yardId: session.user.id, listingId, payload: body.payload as object },
    });
  }
  return NextResponse.json({ ok: true });
}

export async function DELETE() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  await prisma.propListingDraft.deleteMany({ where: { yardId: session.user.id } });
  return NextResponse.json({ ok: true });
}

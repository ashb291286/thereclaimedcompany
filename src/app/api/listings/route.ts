import { prisma } from "@/lib/db";
import type { Condition } from "@/generated/prisma/client";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q") ?? "";
  const categoryId = searchParams.get("categoryId") ?? "";
  const condition = searchParams.get("condition") ?? "";
  const postcode = searchParams.get("postcode") ?? "";
  const radiusMiles = parseInt(searchParams.get("radius") ?? "50", 10);
  const sellerType = searchParams.get("sellerType") ?? ""; // individual | reclamation_yard
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10));
  const pageSize = Math.min(24, parseInt(searchParams.get("pageSize") ?? "12", 10));
  const skip = (page - 1) * pageSize;

  const where: {
    status: "active";
    OR?: Array<{ title?: { contains: string; mode: "insensitive" }; description?: { contains: string; mode: "insensitive" } }>;
    categoryId?: string;
    condition?: Condition;
    seller?: { role: "individual" | "reclamation_yard" };
    postcode?: { startsWith: string; mode: "insensitive" };
  } = {
    status: "active",
  };

  if (q.trim()) {
    where.OR = [
      { title: { contains: q.trim(), mode: "insensitive" } },
      { description: { contains: q.trim(), mode: "insensitive" } },
    ];
  }
  if (categoryId) where.categoryId = categoryId;
  if (condition) where.condition = condition as Condition;
  if (sellerType) {
    where.seller = { role: sellerType as "individual" | "reclamation_yard" };
  }

  // Postcode/radius: if we had lat/lng we'd filter by distance; for MVP we filter by postcode prefix match or leave as "all"
  if (postcode.trim()) {
    const prefix = postcode.trim().toUpperCase().replace(/\s/g, "").slice(0, 4);
    if (prefix.length >= 2) {
      where.postcode = { startsWith: prefix, mode: "insensitive" };
    }
  }

  const [listings, total] = await Promise.all([
    prisma.listing.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip,
      take: pageSize,
      include: { category: true },
    }),
    prisma.listing.count({ where }),
  ]);

  return NextResponse.json({
    listings,
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  });
}

import { prisma } from "@/lib/db";
import {
  averageHashFromBuffer,
  averageHashFromUrl,
  hammingDistance64,
} from "@/lib/image-hash";

export const runtime = "nodejs";

const MAX_UPLOAD_BYTES = 6 * 1024 * 1024;
const MAX_LISTINGS_TO_SCAN = 160;
const TOP_MATCHES = 24;
const IMAGE_FETCH_TIMEOUT_MS = 6500;

export async function POST(req: Request) {
  const formData = await req.formData();
  const file = formData.get("image");

  if (!file || !(file instanceof File)) {
    return Response.json({ error: "Missing image file." }, { status: 400 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  if (buffer.length === 0) {
    return Response.json({ error: "Empty file." }, { status: 400 });
  }
  if (buffer.length > MAX_UPLOAD_BYTES) {
    return Response.json({ error: "Image too large (max 6MB)." }, { status: 400 });
  }

  let queryHash: bigint;
  try {
    queryHash = await averageHashFromBuffer(buffer);
  } catch {
    return Response.json({ error: "Could not read image." }, { status: 400 });
  }

  const listings = await prisma.listing.findMany({
    where: {
      status: "active",
      NOT: { images: { equals: [] } },
    },
    select: { id: true, images: true },
    orderBy: { createdAt: "desc" },
    take: MAX_LISTINGS_TO_SCAN,
  });

  const scored: { id: string; distance: number }[] = [];

  for (const listing of listings) {
    const url = listing.images[0];
    if (!url) continue;
    const hash = await averageHashFromUrl(url, IMAGE_FETCH_TIMEOUT_MS);
    if (hash === null) continue;
    scored.push({
      id: listing.id,
      distance: hammingDistance64(queryHash, hash),
    });
  }

  scored.sort((a, b) => a.distance - b.distance);
  const listingIds = [...new Set(scored.map((s) => s.id))].slice(0, TOP_MATCHES);

  if (listingIds.length === 0) {
    return Response.json({
      listingIds: [],
      message:
        "No comparable listing photos found yet. Try a text search, or list your item so others can match against it.",
    });
  }

  return Response.json({ listingIds });
}

import { NextRequest, NextResponse } from "next/server";

const DEFAULT_ORIGIN = "https://thereclaimedcompany.com";

function normalizePath(raw: string | null): string | null {
  if (raw == null || raw === "") return null;
  let path: string;
  try {
    path = decodeURIComponent(raw);
  } catch {
    return null;
  }
  if (!path.startsWith("/wp-content/uploads/")) return null;
  if (path.includes("..") || path.includes("\\")) return null;
  return path;
}

export async function GET(req: NextRequest) {
  const path = normalizePath(req.nextUrl.searchParams.get("path"));
  if (!path) {
    return NextResponse.json({ error: "Invalid path" }, { status: 400 });
  }

  const origin = (process.env.WORDPRESS_MEDIA_ORIGIN ?? DEFAULT_ORIGIN).replace(/\/$/, "");
  const upstreamUrl = `${origin}${path}`;

  try {
    const upstream = await fetch(upstreamUrl, {
      headers: {
        Referer: `${origin}/`,
        Accept: "image/avif,image/webp,image/apng,image/*,*/*;q=0.8",
        "User-Agent":
          "Mozilla/5.0 (compatible; ReclaimedMarketplaceImageProxy/1.0; +https://thereclaimedcompany.com)",
      },
      redirect: "follow",
    });

    if (!upstream.ok) {
      return NextResponse.json(
        { error: "Upstream media unavailable", status: upstream.status },
        { status: upstream.status === 403 ? 502 : 502 }
      );
    }

    const ct = upstream.headers.get("content-type") ?? "";
    if (ct.includes("text/html")) {
      return NextResponse.json({ error: "Unexpected response type" }, { status: 502 });
    }

    const buffer = await upstream.arrayBuffer();
    const contentType = ct.startsWith("image/") ? ct : "application/octet-stream";

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=86400, stale-while-revalidate=604800",
      },
    });
  } catch {
    return NextResponse.json({ error: "Fetch failed" }, { status: 502 });
  }
}

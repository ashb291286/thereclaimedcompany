import { NextResponse } from "next/server";

const FRANKFURTER =
  "https://api.frankfurter.app/latest?from=GBP&to=USD,EUR";

/**
 * Proxies Frankfurter on the server so the client avoids CORS
 * (api.frankfurter.app does not send Access-Control-Allow-Origin for browser origins).
 */
export async function GET() {
  try {
    const res = await fetch(FRANKFURTER, {
      next: { revalidate: 3600 },
    });
    if (!res.ok) {
      return NextResponse.json(
        { error: "upstream failed" },
        { status: 502 }
      );
    }
    const data = (await res.json()) as { rates?: Record<string, number> };
    const r = data.rates;
    if (!r?.USD || !r?.EUR) {
      return NextResponse.json(
        { error: "invalid upstream payload" },
        { status: 502 }
      );
    }
    return NextResponse.json(
      { USD: r.USD, EUR: r.EUR },
      {
        headers: {
          "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400",
        },
      }
    );
  } catch {
    return NextResponse.json({ error: "fetch failed" }, { status: 502 });
  }
}

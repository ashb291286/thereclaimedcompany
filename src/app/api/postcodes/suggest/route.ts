import { suggestUkPostcodes } from "@/lib/postcode-uk";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q") ?? "";
  const suggestions = await suggestUkPostcodes(q, 10);
  return NextResponse.json({ suggestions });
}

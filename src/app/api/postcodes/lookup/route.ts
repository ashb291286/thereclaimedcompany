import { lookupUkPostcode, formatUkAreaLine } from "@/lib/postcode-uk";
import { NextRequest, NextResponse } from "next/server";

/** Public read-only: validate postcode and return coordinates + area labels (postcodes.io). */
export async function GET(req: NextRequest) {
  const postcode = req.nextUrl.searchParams.get("postcode") ?? "";
  const result = await lookupUkPostcode(postcode);
  if (!result) {
    return NextResponse.json({ ok: false, error: "Postcode not found" }, { status: 404 });
  }
  return NextResponse.json({
    ok: true,
    postcode: result.postcode,
    lat: result.lat,
    lng: result.lng,
    adminDistrict: result.adminDistrict,
    region: result.region,
    areaLine: formatUkAreaLine(result),
  });
}

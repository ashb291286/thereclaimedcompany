import { NextRequest, NextResponse } from "next/server";

/**
 * DVLA-style registration lookup. Returns mock data when DVLA_API_KEY is unset.
 */
export async function GET(req: NextRequest) {
  const reg = req.nextUrl.searchParams.get("reg")?.trim().toUpperCase();
  if (!reg) {
    return NextResponse.json({ error: "Missing reg parameter" }, { status: 400 });
  }

  const key = process.env.DVLA_API_KEY;
  if (!key) {
    return NextResponse.json({
      registration: reg,
      make: "Porsche",
      model: "911",
      year: 1987,
      colour: "Guards Red",
      source: "mock",
    });
  }

  // Real integration can call DVLA API here when key is present.
  return NextResponse.json({
    registration: reg,
    make: null,
    model: null,
    year: null,
    colour: null,
    source: "dvla",
    message: "Wire DVLA endpoint to vehicle-enquiry API when ready.",
  });
}

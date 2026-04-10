import { NextRequest, NextResponse } from "next/server";
import { fetchDvlaVehicleByRegistration, normaliseUkRegistration } from "@/lib/dvla-vehicle-enquiry";

/**
 * Driven “DVLA lookup” — fills make / year / colour from the official Vehicle Enquiry Service.
 * Set `DVLA_API_KEY` (from the DVLA API developer portal). Optional `DVLA_API_BASE` for UAT.
 */
export async function GET(req: NextRequest) {
  const reg = req.nextUrl.searchParams.get("reg")?.trim();
  if (!reg) {
    return NextResponse.json({ error: "Missing reg parameter" }, { status: 400 });
  }

  const normalised = normaliseUkRegistration(reg);
  const key = process.env.DVLA_API_KEY?.trim();

  if (!key) {
    return NextResponse.json({
      registration: normalised,
      make: "Porsche",
      model: "911",
      year: 1987,
      colour: "Guards Red",
      source: "mock",
    });
  }

  const result = await fetchDvlaVehicleByRegistration(reg, key);
  if (!result.ok) {
    return NextResponse.json(
      {
        error: result.message,
        code: result.code ?? null,
        registration: normalised,
        source: "dvla",
      },
      { status: result.status >= 400 && result.status < 600 ? result.status : 502 }
    );
  }

  const { data } = result;
  return NextResponse.json({
    registration: data.registrationNumber,
    make: data.make ?? null,
    /** DVLA VES does not return model — user completes this field. */
    model: null,
    year: data.yearOfManufacture ?? null,
    colour: data.colour ?? null,
    fuelType: data.fuelType ?? null,
    motStatus: data.motStatus ?? null,
    motExpiryDate: data.motExpiryDate ?? null,
    taxStatus: data.taxStatus ?? null,
    source: "dvla",
  });
}

import { NextRequest, NextResponse } from "next/server";
import {
  fetchDvlaVehicleByRegistration,
  normaliseUkRegistration,
  type DvlaVehicleEnquiryData,
} from "@/lib/dvla-vehicle-enquiry";

function jsonResponseFromDvla(data: DvlaVehicleEnquiryData, source: "dvla" | "mock") {
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
    taxDueDate: data.taxDueDate ?? null,
    dvla: data,
    source,
  });
}

/**
 * Driven “DVLA lookup” — fills core fields plus full VES snapshot for the add-car form.
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
    const mock: DvlaVehicleEnquiryData = {
      registrationNumber: normalised,
      taxStatus: "Taxed",
      taxDueDate: "2026-06-01",
      artEndDate: "2007-12-25",
      motStatus: "Valid",
      motExpiryDate: "2026-11-15",
      make: "Porsche",
      monthOfFirstDvlaRegistration: "1987-06",
      monthOfFirstRegistration: "1987-05",
      yearOfManufacture: 1987,
      engineCapacity: 3164,
      co2Emissions: 282,
      fuelType: "PETROL",
      markedForExport: false,
      colour: "Guards Red",
      typeApproval: "M1",
      wheelplan: "2 AXLE RIGID BODY",
      revenueWeight: 1450,
      realDrivingEmissions: 1,
      dateOfLastV5CIssued: "2024-03-10",
      euroStatus: "Euro 4",
      automatedVehicle: false,
    };
    return jsonResponseFromDvla(mock, "mock");
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

  return jsonResponseFromDvla(result.data, "dvla");
}

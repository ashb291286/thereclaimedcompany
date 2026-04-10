/**
 * DVLA Vehicle Enquiry Service (VES) — server-side only.
 * @see https://developer-portal.driver-vehicle-licensing.api.gov.uk/apis/vehicle-enquiry-service/
 */

const DEFAULT_PRODUCTION_URL =
  "https://driver-vehicle-licensing.api.gov.uk/vehicle-enquiry/v1/vehicles";

export type DvlaVehicleEnquirySuccess = {
  registrationNumber: string;
  make?: string;
  yearOfManufacture?: number;
  colour?: string;
  fuelType?: string;
  motStatus?: string;
  motExpiryDate?: string;
  taxStatus?: string;
};

type DvlaErrorBody = {
  errors?: Array<{ status?: string; code?: string; title?: string; detail?: string }>;
};

export function normaliseUkRegistration(raw: string): string {
  return raw.replace(/\s+/g, "").toUpperCase();
}

export async function fetchDvlaVehicleByRegistration(
  registrationNumber: string,
  apiKey: string
): Promise<
  | { ok: true; data: DvlaVehicleEnquirySuccess }
  | { ok: false; status: number; message: string; code?: string }
> {
  const reg = normaliseUkRegistration(registrationNumber);
  if (reg.length < 2) {
    return { ok: false, status: 400, message: "Invalid registration." };
  }

  const url = process.env.DVLA_API_BASE?.trim() || DEFAULT_PRODUCTION_URL;

  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      "x-api-key": apiKey,
    },
    body: JSON.stringify({ registrationNumber: reg }),
    cache: "no-store",
  });

  const text = await res.text();
  let json: unknown;
  try {
    json = text ? JSON.parse(text) : {};
  } catch {
    return {
      ok: false,
      status: res.status,
      message: "Unexpected response from DVLA.",
    };
  }

  if (!res.ok) {
    const err = json as DvlaErrorBody;
    const first = err.errors?.[0];
    const message =
      first?.detail ||
      first?.title ||
      (res.status === 404 ? "Vehicle not found." : "DVLA lookup failed.");
    return {
      ok: false,
      status: res.status,
      message,
      code: first?.code,
    };
  }

  const data = json as Record<string, unknown>;
  return {
    ok: true,
    data: {
      registrationNumber: String(data.registrationNumber ?? reg),
      make: typeof data.make === "string" ? data.make : undefined,
      yearOfManufacture:
        typeof data.yearOfManufacture === "number" && Number.isFinite(data.yearOfManufacture)
          ? data.yearOfManufacture
          : undefined,
      colour: typeof data.colour === "string" ? data.colour : undefined,
      fuelType: typeof data.fuelType === "string" ? data.fuelType : undefined,
      motStatus: typeof data.motStatus === "string" ? data.motStatus : undefined,
      motExpiryDate: typeof data.motExpiryDate === "string" ? data.motExpiryDate : undefined,
      taxStatus: typeof data.taxStatus === "string" ? data.taxStatus : undefined,
    },
  };
}

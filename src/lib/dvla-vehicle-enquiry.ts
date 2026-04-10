/**
 * DVLA Vehicle Enquiry Service (VES) — server-side only.
 * @see https://developer-portal.driver-vehicle-licensing.api.gov.uk/apis/vehicle-enquiry-service/
 */

const DEFAULT_PRODUCTION_URL =
  "https://driver-vehicle-licensing.api.gov.uk/vehicle-enquiry/v1/vehicles";

/** Normalised successful VES payload (all fields optional except registration). */
export type DvlaVehicleEnquiryData = {
  registrationNumber: string;
  taxStatus?: string;
  taxDueDate?: string;
  artEndDate?: string;
  motStatus?: string;
  motExpiryDate?: string;
  make?: string;
  monthOfFirstDvlaRegistration?: string;
  monthOfFirstRegistration?: string;
  yearOfManufacture?: number;
  engineCapacity?: number;
  co2Emissions?: number;
  fuelType?: string;
  markedForExport?: boolean;
  colour?: string;
  typeApproval?: string;
  wheelplan?: string;
  revenueWeight?: number;
  /** RDE category — API may return number or string. */
  realDrivingEmissions?: number | string;
  dateOfLastV5CIssued?: string;
  euroStatus?: string;
  automatedVehicle?: boolean;
};

export function normaliseUkRegistration(raw: string): string {
  return raw.replace(/\s+/g, "").toUpperCase();
}

function pickStr(data: Record<string, unknown>, key: string): string | undefined {
  const v = data[key];
  if (typeof v === "string" && v.trim()) return v.trim();
  return undefined;
}

function pickNum(data: Record<string, unknown>, key: string): number | undefined {
  const v = data[key];
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string" && v.trim()) {
    const n = Number(v.replace(/[^\d.-]/g, ""));
    if (Number.isFinite(n)) return n;
  }
  return undefined;
}

function pickBool(data: Record<string, unknown>, key: string): boolean | undefined {
  const v = data[key];
  if (typeof v === "boolean") return v;
  if (v === "true" || v === true) return true;
  if (v === "false" || v === false) return false;
  return undefined;
}

function pickRde(data: Record<string, unknown>): number | string | undefined {
  const v = data.realDrivingEmissions;
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string" && v.trim()) return v.trim();
  return undefined;
}

function mapJsonToDvlaData(reg: string, data: Record<string, unknown>): DvlaVehicleEnquiryData {
  const year = pickNum(data, "yearOfManufacture");
  return {
    registrationNumber: pickStr(data, "registrationNumber") ?? reg,
    taxStatus: pickStr(data, "taxStatus"),
    taxDueDate: pickStr(data, "taxDueDate"),
    artEndDate: pickStr(data, "artEndDate"),
    motStatus: pickStr(data, "motStatus"),
    motExpiryDate: pickStr(data, "motExpiryDate"),
    make: pickStr(data, "make"),
    monthOfFirstDvlaRegistration: pickStr(data, "monthOfFirstDvlaRegistration"),
    monthOfFirstRegistration: pickStr(data, "monthOfFirstRegistration"),
    yearOfManufacture: year !== undefined ? Math.trunc(year) : undefined,
    engineCapacity: pickNum(data, "engineCapacity"),
    co2Emissions: pickNum(data, "co2Emissions"),
    fuelType: pickStr(data, "fuelType"),
    markedForExport: pickBool(data, "markedForExport"),
    colour: pickStr(data, "colour"),
    typeApproval: pickStr(data, "typeApproval"),
    wheelplan: pickStr(data, "wheelplan") ?? pickStr(data, "wheelPlan"),
    revenueWeight: pickNum(data, "revenueWeight"),
    realDrivingEmissions: pickRde(data),
    dateOfLastV5CIssued: pickStr(data, "dateOfLastV5CIssued"),
    euroStatus: pickStr(data, "euroStatus"),
    automatedVehicle: pickBool(data, "automatedVehicle"),
  };
}

type DvlaErrorBody = {
  errors?: Array<{ status?: string; code?: string; title?: string; detail?: string }>;
};

export async function fetchDvlaVehicleByRegistration(
  registrationNumber: string,
  apiKey: string
): Promise<
  | { ok: true; data: DvlaVehicleEnquiryData }
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
    data: mapJsonToDvlaData(reg, data),
  };
}

import type { DvlaVehicleEnquiryData } from "@/lib/dvla-vehicle-enquiry";

/** Display order for Driven add-car / passport UI (keys omitted if absent). */
export const DVLA_VES_DISPLAY_ORDER: (keyof DvlaVehicleEnquiryData)[] = [
  "registrationNumber",
  "make",
  "colour",
  "yearOfManufacture",
  "monthOfFirstRegistration",
  "monthOfFirstDvlaRegistration",
  "fuelType",
  "engineCapacity",
  "co2Emissions",
  "euroStatus",
  "realDrivingEmissions",
  "taxStatus",
  "taxDueDate",
  "motStatus",
  "motExpiryDate",
  "typeApproval",
  "wheelplan",
  "revenueWeight",
  "dateOfLastV5CIssued",
  "markedForExport",
  "automatedVehicle",
  "artEndDate",
];

export const DVLA_VES_LABELS: Record<string, string> = {
  registrationNumber: "Registration",
  taxStatus: "Tax status",
  taxDueDate: "Tax due / expires",
  artEndDate: "ART end date",
  motStatus: "MOT status",
  motExpiryDate: "MOT expiry",
  make: "Make (DVLA)",
  monthOfFirstDvlaRegistration: "First registered with DVLA",
  monthOfFirstRegistration: "Original first registration",
  yearOfManufacture: "Year of manufacture",
  engineCapacity: "Engine capacity",
  co2Emissions: "CO₂ emissions",
  fuelType: "Fuel type",
  markedForExport: "Marked for export",
  colour: "Colour (DVLA)",
  typeApproval: "Type approval",
  wheelplan: "Wheelplan",
  revenueWeight: "Revenue weight",
  realDrivingEmissions: "Real driving emissions (RDE)",
  dateOfLastV5CIssued: "Date of last V5C issued",
  euroStatus: "Euro status",
  automatedVehicle: "Automated vehicle",
};

export function formatDvlaValueForDisplay(key: string, value: unknown): string {
  if (value === null || value === undefined) return "";
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (typeof value === "number") {
    if (key === "engineCapacity") return `${value.toLocaleString("en-GB")} cc`;
    if (key === "co2Emissions") return `${value} g/km`;
    if (key === "revenueWeight") return `${value.toLocaleString("en-GB")} kg`;
    return String(value);
  }
  return String(value);
}

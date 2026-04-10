import {
  normaliseUkRegistration,
  type DvlaVehicleEnquiryData,
} from "@/lib/dvla-vehicle-enquiry";

/** Demo VES-shaped payload when `DVLA_API_KEY` is unset — shared by `/api/driven/dvla` and sample passport. */
export function demoDvlaSnapshotForRegistration(rawReg: string): DvlaVehicleEnquiryData {
  const registrationNumber = normaliseUkRegistration(rawReg);
  return {
    registrationNumber,
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
}

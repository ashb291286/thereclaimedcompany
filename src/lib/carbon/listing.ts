import { calculateCarbonImpact } from "./calculate";
import { getCarbonFactors } from "./factors";
import type { CarbonImpactResult, MaterialUnit } from "./types";

export { parseStoredCarbonImpact } from "./stored-impact";

export type ListingCarbonFields = {
  materialType: string | null;
  materialQuantity: number | null;
  materialUnit: string | null;
  distanceSavedKm: number | null;
  carbonSavedKg: number | null;
  carbonWasteDivertedKg: number | null;
  carbonImpactJson: unknown | null;
};

export async function computeListingCarbonSnapshot(input: {
  materialType: string | null;
  materialQuantity: number | null;
  materialUnit: string | null;
  distanceSavedKm: number | null;
}): Promise<{
  carbonSavedKg: number | null;
  carbonWasteDivertedKg: number | null;
  carbonImpactJson: CarbonImpactResult | null;
  materialType: string | null;
  materialQuantity: number | null;
  materialUnit: string | null;
  distanceSavedKm: number | null;
}> {
  const { materialType, materialQuantity, materialUnit, distanceSavedKm } = input;
  if (!materialType?.trim() || materialQuantity == null || !materialUnit?.trim()) {
    return {
      carbonSavedKg: null,
      carbonWasteDivertedKg: null,
      carbonImpactJson: null,
      materialType: materialType?.trim() || null,
      materialQuantity: null,
      materialUnit: null,
      distanceSavedKm: distanceSavedKm ?? null,
    };
  }

  const unit = materialUnit.trim().toLowerCase() as MaterialUnit;
  if (unit !== "kg" && unit !== "tonne" && unit !== "m3") {
    return {
      carbonSavedKg: null,
      carbonWasteDivertedKg: null,
      carbonImpactJson: null,
      materialType: materialType.trim(),
      materialQuantity,
      materialUnit: unit,
      distanceSavedKm: distanceSavedKm ?? null,
    };
  }

  const factors = await getCarbonFactors();
  const calc = calculateCarbonImpact(
    materialType.trim(),
    materialQuantity,
    unit,
    factors,
    { isReclaimed: true }
  );

  if (!calc.ok) {
    return {
      carbonSavedKg: null,
      carbonWasteDivertedKg: null,
      carbonImpactJson: null,
      materialType: materialType.trim(),
      materialQuantity,
      materialUnit: unit,
      distanceSavedKm: distanceSavedKm ?? null,
    };
  }

  return {
    carbonSavedKg: calc.data.carbon_saved_kg,
    carbonWasteDivertedKg: calc.data.waste_diverted_kg,
    carbonImpactJson: calc.data,
    materialType: materialType.trim(),
    materialQuantity,
    materialUnit: unit,
    distanceSavedKm: distanceSavedKm ?? null,
  };
}

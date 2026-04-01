import { calculateCarbonImpact } from "./calculate";
import { getCarbonFactors } from "./factors";
import type { CarbonImpactResult, MaterialUnit } from "./types";

export type ListingCarbonFields = {
  materialType: string | null;
  materialQuantity: number | null;
  materialUnit: string | null;
  distanceSavedKm: number | null;
  carbonSavedKg: number | null;
  carbonWasteDivertedKg: number | null;
  carbonImpactJson: unknown | null;
};

export function parseStoredCarbonImpact(listing: {
  carbonImpactJson: unknown;
  carbonSavedKg: number | null;
}): CarbonImpactResult | null {
  if (listing.carbonImpactJson && typeof listing.carbonImpactJson === "object") {
    const j = listing.carbonImpactJson as Record<string, unknown>;
    if (
      typeof j.carbon_saved_kg === "number" &&
      typeof j.carbon_saved_tonnes === "number" &&
      typeof j.trees_equivalent === "number" &&
      typeof j.miles_equivalent === "number" &&
      typeof j.waste_diverted_kg === "number" &&
      typeof j.data_source === "string"
    ) {
      return {
        carbon_saved_kg: j.carbon_saved_kg,
        carbon_saved_tonnes: j.carbon_saved_tonnes,
        trees_equivalent: j.trees_equivalent,
        miles_equivalent: j.miles_equivalent,
        waste_diverted_kg: j.waste_diverted_kg,
        data_source: j.data_source,
        material_type: typeof j.material_type === "string" ? j.material_type : "",
        quantity_basis_kg: typeof j.quantity_basis_kg === "number" ? j.quantity_basis_kg : 0,
      };
    }
  }
  return null;
}

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

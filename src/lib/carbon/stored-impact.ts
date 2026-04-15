import type { CarbonImpactResult } from "./types";

/** Parse persisted carbon JSON from a listing — safe for client components (no DB). */
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

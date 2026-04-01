/** kg CO2e per mile — UK DEFRA-style car average (indicative). */
export const KG_CO2E_PER_MILE = 0.404;

/** kg CO2e absorbed per tree per year (indicative equivalence). */
export const KG_CO2E_PER_TREE_YEAR = 22;

/** Avoided emissions vs new production for reclaimed stock (90% of embodied new). */
export const RECLAIMED_AVOIDANCE_FACTOR = 0.9;

export const DATA_SOURCE_LABEL = "ICE Database (University of Bath)";

export type MaterialUnit = "kg" | "tonne" | "m3";

export type CarbonImpactResult = {
  carbon_saved_kg: number;
  carbon_saved_tonnes: number;
  trees_equivalent: number;
  miles_equivalent: number;
  waste_diverted_kg: number;
  data_source: string;
  material_type: string;
  quantity_basis_kg: number;
};

export type CarbonFactorRow = {
  materialType: string;
  unitType: string;
  co2PerUnit: number;
  source: string;
  label: string;
  densityKgPerM3: number | null;
};

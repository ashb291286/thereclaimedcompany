import type { CarbonFactorRow } from "./types";

/**
 * ICE-style factors when the database has no CarbonFactor rows (e.g. seed not run).
 * Keep in sync with prisma/seed.ts CARBON_FACTORS.
 */
export const CARBON_FACTOR_ROWS_FALLBACK: CarbonFactorRow[] = [
  {
    materialType: "timber",
    unitType: "kg",
    co2PerUnit: 0.45,
    source: "ICE Database",
    label: "Timber (general)",
    densityKgPerM3: 500,
  },
  {
    materialType: "brick",
    unitType: "kg",
    co2PerUnit: 0.24,
    source: "ICE Database",
    label: "Brick / clay",
    densityKgPerM3: 1800,
  },
  {
    materialType: "steel",
    unitType: "kg",
    co2PerUnit: 1.85,
    source: "ICE Database",
    label: "Steel",
    densityKgPerM3: 7850,
  },
  {
    materialType: "concrete",
    unitType: "kg",
    co2PerUnit: 0.13,
    source: "ICE Database",
    label: "Concrete",
    densityKgPerM3: 2400,
  },
  {
    materialType: "tile",
    unitType: "kg",
    co2PerUnit: 0.2,
    source: "ICE Database",
    label: "Ceramic tile",
    densityKgPerM3: 2200,
  },
  {
    materialType: "insulation",
    unitType: "kg",
    co2PerUnit: 1.2,
    source: "ICE Database",
    label: "Insulation (mineral wool–class)",
    densityKgPerM3: 50,
  },
  {
    materialType: "other",
    unitType: "kg",
    co2PerUnit: 0.2,
    source: "ICE Database",
    label: "Other / mixed",
    densityKgPerM3: 800,
  },
];

/** Listing form dropdown (kg materials only). */
export const MATERIAL_FORM_OPTIONS_FALLBACK = CARBON_FACTOR_ROWS_FALLBACK.map(
  ({ materialType, label }) => ({ materialType, label })
);

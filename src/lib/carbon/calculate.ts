import type { CarbonFactorRow, CarbonImpactResult, MaterialUnit } from "./types";
import {
  DATA_SOURCE_LABEL,
  KG_CO2E_PER_MILE,
  KG_CO2E_PER_TREE_YEAR,
  RECLAIMED_AVOIDANCE_FACTOR,
} from "./types";

/** Mass in kg from quantity + unit (uses density when unit is m³). */
export function quantityToKg(
  quantity: number,
  unit: MaterialUnit,
  densityKgPerM3: number | null
): { kg: number; ok: true } | { ok: false; error: string } {
  if (!Number.isFinite(quantity) || quantity <= 0) {
    return { ok: false, error: "Quantity must be a positive number" };
  }
  switch (unit) {
    case "kg":
      return { ok: true, kg: quantity };
    case "tonne":
      return { ok: true, kg: quantity * 1000 };
    case "m3": {
      const d = densityKgPerM3;
      if (d == null || !Number.isFinite(d) || d <= 0) {
        return { ok: false, error: "Density is required for cubic metre quantities" };
      }
      return { ok: true, kg: quantity * d };
    }
    default:
      return { ok: false, error: "Unsupported unit" };
  }
}

/** Find kg-based factor row for embodied carbon (kg CO2e per kg material). */
export function findKgFactor(
  factors: CarbonFactorRow[],
  materialType: string
): CarbonFactorRow | undefined {
  return factors.find((f) => f.materialType === materialType && f.unitType === "kg");
}

/**
 * Embodied carbon for *new* production (kg CO2e), then reclaimed avoidance.
 * Uses kg CO2e per kg × mass in kg.
 */
export function calculateCarbonImpact(
  materialType: string,
  quantity: number,
  unit: MaterialUnit,
  factors: CarbonFactorRow[],
  options?: { isReclaimed?: boolean }
): { ok: true; data: CarbonImpactResult } | { ok: false; error: string } {
  const kgFactor = findKgFactor(factors, materialType);
  if (!kgFactor) {
    return { ok: false, error: `Unknown material type: ${materialType}` };
  }

  const mass = quantityToKg(quantity, unit, kgFactor.densityKgPerM3);
  if (!mass.ok) return mass;

  const carbonNewKg = mass.kg * kgFactor.co2PerUnit;
  const isReclaimed = options?.isReclaimed !== false;
  const carbonSavedKg = isReclaimed ? carbonNewKg * RECLAIMED_AVOIDANCE_FACTOR : carbonNewKg;

  const wasteDivertedKg = mass.kg;
  const treesEquivalent = carbonSavedKg / KG_CO2E_PER_TREE_YEAR;
  const milesEquivalent = carbonSavedKg / KG_CO2E_PER_MILE;

  return {
    ok: true,
    data: {
      carbon_saved_kg: round4(carbonSavedKg),
      carbon_saved_tonnes: round4(carbonSavedKg / 1000),
      trees_equivalent: round4(treesEquivalent),
      miles_equivalent: round4(milesEquivalent),
      waste_diverted_kg: round4(wasteDivertedKg),
      data_source: DATA_SOURCE_LABEL,
      material_type: materialType,
      quantity_basis_kg: round4(mass.kg),
    },
  };
}

function round4(n: number): number {
  return Math.round(n * 10000) / 10000;
}

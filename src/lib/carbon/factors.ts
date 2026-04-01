import { unstable_cache } from "next/cache";
import { prisma } from "@/lib/db";
import { CARBON_FACTOR_ROWS_FALLBACK, MATERIAL_FORM_OPTIONS_FALLBACK } from "./material-defaults";
import type { CarbonFactorRow } from "./types";

function mapRow(r: {
  materialType: string;
  unitType: string;
  co2PerUnit: number;
  source: string;
  label: string;
  densityKgPerM3: number | null;
}): CarbonFactorRow {
  return {
    materialType: r.materialType,
    unitType: r.unitType,
    co2PerUnit: r.co2PerUnit,
    source: r.source,
    label: r.label,
    densityKgPerM3: r.densityKgPerM3,
  };
}

async function loadCarbonFactorRows(): Promise<CarbonFactorRow[]> {
  const rows = await prisma.carbonFactor.findMany({
    orderBy: [{ materialType: "asc" }, { unitType: "asc" }],
  });
  if (rows.length > 0) return rows.map(mapRow);
  return CARBON_FACTOR_ROWS_FALLBACK;
}

/** Cached carbon factor table (revalidate 1h). */
export async function getCarbonFactorsCached(): Promise<CarbonFactorRow[]> {
  const cached = unstable_cache(
    async () => loadCarbonFactorRows(),
    ["carbon-factors-v1"],
    { revalidate: 3600, tags: ["carbon-factors"] }
  );
  return cached();
}

/** Uncached read (admin mutations, API calculate, listing snapshot). */
export async function getCarbonFactors(): Promise<CarbonFactorRow[]> {
  return loadCarbonFactorRows();
}

/** Distinct materials for listing form (prefer kg row for label + density). */
export async function getMaterialOptionsForForm(): Promise<
  { materialType: string; label: string; densityKgPerM3: number | null }[]
> {
  const rows = await prisma.carbonFactor.findMany({
    where: { unitType: "kg" },
    orderBy: { label: "asc" },
    select: { materialType: true, label: true, densityKgPerM3: true },
  });
  if (rows.length > 0) return rows;
  return MATERIAL_FORM_OPTIONS_FALLBACK.map((o) => ({
    materialType: o.materialType,
    label: o.label,
    densityKgPerM3: null,
  }));
}

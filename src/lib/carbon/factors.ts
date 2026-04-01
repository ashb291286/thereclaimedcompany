import { unstable_cache } from "next/cache";
import { prisma } from "@/lib/db";
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

/** Cached carbon factor table (revalidate 1h). */
export async function getCarbonFactorsCached(): Promise<CarbonFactorRow[]> {
  const cached = unstable_cache(
    async () => {
      const rows = await prisma.carbonFactor.findMany({
        orderBy: [{ materialType: "asc" }, { unitType: "asc" }],
      });
      return rows.map(mapRow);
    },
    ["carbon-factors-v1"],
    { revalidate: 3600, tags: ["carbon-factors"] }
  );
  return cached();
}

/** Uncached read (admin mutations, API calculate). */
export async function getCarbonFactors(): Promise<CarbonFactorRow[]> {
  const rows = await prisma.carbonFactor.findMany({
    orderBy: [{ materialType: "asc" }, { unitType: "asc" }],
  });
  return rows.map(mapRow);
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
  return rows;
}

import { prisma } from "../src/lib/db";

const CATEGORIES = [
  { name: "Bricks & blocks", slug: "bricks-blocks" },
  { name: "Timber & wood", slug: "timber-wood" },
  { name: "Roof tiles & slates", slug: "roof-tiles-slates" },
  { name: "Flooring", slug: "flooring" },
  { name: "Fireplaces", slug: "fireplaces" },
  { name: "Doors", slug: "doors" },
  { name: "Windows", slug: "windows" },
  { name: "Staircases", slug: "staircases" },
  { name: "Cornicing & architraves", slug: "cornicing-architraves" },
  { name: "Hardware & fixtures", slug: "hardware-fixtures" },
  { name: "Stone & paving", slug: "stone-paving" },
  { name: "Other", slug: "other" },
];

/** ICE-style embodied carbon (kg CO2e per kg material) + typical density for m³ → kg conversions. */
const CARBON_FACTORS: {
  materialType: string;
  unitType: string;
  co2PerUnit: number;
  label: string;
  densityKgPerM3: number | null;
}[] = [
  { materialType: "timber", unitType: "kg", co2PerUnit: 0.45, label: "Timber (general)", densityKgPerM3: 500 },
  { materialType: "brick", unitType: "kg", co2PerUnit: 0.24, label: "Brick / clay", densityKgPerM3: 1800 },
  { materialType: "steel", unitType: "kg", co2PerUnit: 1.85, label: "Steel", densityKgPerM3: 7850 },
  { materialType: "concrete", unitType: "kg", co2PerUnit: 0.13, label: "Concrete", densityKgPerM3: 2400 },
  { materialType: "tile", unitType: "kg", co2PerUnit: 0.2, label: "Ceramic tile", densityKgPerM3: 2200 },
  { materialType: "insulation", unitType: "kg", co2PerUnit: 1.2, label: "Insulation (mineral wool–class)", densityKgPerM3: 50 },
  { materialType: "other", unitType: "kg", co2PerUnit: 0.2, label: "Other / mixed", densityKgPerM3: 800 },
];

async function main() {
  for (const cat of CATEGORIES) {
    await prisma.category.upsert({
      where: { slug: cat.slug },
      create: cat,
      update: { name: cat.name },
    });
  }
  console.log("Seeded categories:", CATEGORIES.length);

  for (const row of CARBON_FACTORS) {
    await prisma.carbonFactor.upsert({
      where: {
        materialType_unitType: {
          materialType: row.materialType,
          unitType: row.unitType,
        },
      },
      create: {
        materialType: row.materialType,
        unitType: row.unitType,
        co2PerUnit: row.co2PerUnit,
        label: row.label,
        densityKgPerM3: row.densityKgPerM3,
        source: "ICE Database",
      },
      update: {
        co2PerUnit: row.co2PerUnit,
        label: row.label,
        densityKgPerM3: row.densityKgPerM3,
        source: "ICE Database",
      },
    });
  }
  console.log("Seeded carbon factors:", CARBON_FACTORS.length);
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e);
    prisma.$disconnect();
    process.exit(1);
  });

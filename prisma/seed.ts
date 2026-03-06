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

async function main() {
  for (const cat of CATEGORIES) {
    await prisma.category.upsert({
      where: { slug: cat.slug },
      create: cat,
      update: { name: cat.name },
    });
  }
  console.log("Seeded categories:", CATEGORIES.length);
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e);
    prisma.$disconnect();
    process.exit(1);
  });

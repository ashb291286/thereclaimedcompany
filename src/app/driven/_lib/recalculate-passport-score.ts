import { prisma } from "@/lib/db";

/**
 * Passport score rules (caps at 100). Call after lineage/inspection changes.
 */
export async function recalculatePassportScore(vehicleId: string): Promise<number> {
  const vehicle = await prisma.drivenVehicle.findUnique({
    where: { id: vehicleId },
    include: {
      lineageEntries: true,
      inspection: true,
    },
  });
  if (!vehicle) return 0;

  const categories = new Set(vehicle.lineageEntries.map((e) => e.category));
  const ownershipCount = vehicle.lineageEntries.filter((e) => e.category === "OWNERSHIP").length;
  const serviceCount = vehicle.lineageEntries.filter((e) => e.category === "SERVICE").length;

  let score = 0;
  if (categories.has("FACTORY")) score += 20;
  if (ownershipCount >= 2) score += 20;
  if (serviceCount >= 3) score += 20;
  if (vehicle.inspection) score += 20;
  if (categories.has("BODYWORK") || categories.has("RESTORATION")) score += 10;
  if (categories.has("COMPETITION")) score += 10;

  score = Math.min(100, score);
  await prisma.drivenVehicle.update({
    where: { id: vehicleId },
    data: { passportScore: score },
  });
  return score;
}

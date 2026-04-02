import { randomBytes } from "node:crypto";
import { prisma } from "@/lib/db";

const PREFIX = "TRC-DRV-";
const SUFFIX_BYTES = 5; // 10 hex chars

export async function allocateReclaimedPublicId(): Promise<string> {
  for (let attempt = 0; attempt < 24; attempt++) {
    const suffix = randomBytes(SUFFIX_BYTES).toString("hex").toUpperCase();
    const reclaimedPublicId = `${PREFIX}${suffix}`;
    const existing = await prisma.drivenVehicle.findUnique({
      where: { reclaimedPublicId },
      select: { id: true },
    });
    if (!existing) return reclaimedPublicId;
  }
  throw new Error("Could not allocate a unique Reclaimed ID");
}

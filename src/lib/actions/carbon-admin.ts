"use server";

import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { isCarbonAdmin } from "@/lib/admin";
import { revalidateTag } from "next/cache";

export async function updateCarbonFactorAction(formData: FormData): Promise<void> {
  const session = await auth();
  if (!isCarbonAdmin(session)) return;

  const id = (formData.get("id") as string)?.trim();
  const co2Raw = (formData.get("co2PerUnit") as string)?.trim();
  const label = (formData.get("label") as string)?.trim();
  const densityRaw = (formData.get("densityKgPerM3") as string)?.trim();
  const source = (formData.get("source") as string)?.trim() || "ICE Database";

  if (!id || !label) return;
  const co2PerUnit = parseFloat(co2Raw ?? "");
  if (!Number.isFinite(co2PerUnit) || co2PerUnit < 0) return;

  let densityKgPerM3: number | null = null;
  if (densityRaw !== "") {
    const d = parseFloat(densityRaw);
    if (!Number.isFinite(d) || d <= 0) return;
    densityKgPerM3 = d;
  }

  try {
    await prisma.carbonFactor.update({
      where: { id },
      data: {
        co2PerUnit,
        label,
        densityKgPerM3,
        source,
      },
    });
  } catch {
    return;
  }

  revalidateTag("carbon-factors", "max");
}

export async function createCarbonFactorAction(formData: FormData): Promise<void> {
  const session = await auth();
  if (!isCarbonAdmin(session)) return;

  const materialType = (formData.get("materialType") as string)?.trim().toLowerCase();
  const unitType = (formData.get("unitType") as string)?.trim().toLowerCase();
  const label = (formData.get("label") as string)?.trim();
  const co2Raw = (formData.get("co2PerUnit") as string)?.trim();
  const densityRaw = (formData.get("densityKgPerM3") as string)?.trim();
  const source = (formData.get("source") as string)?.trim() || "ICE Database";

  if (!materialType || !unitType || !label) return;
  if (unitType !== "kg" && unitType !== "m3" && unitType !== "tonne") return;
  const co2PerUnit = parseFloat(co2Raw ?? "");
  if (!Number.isFinite(co2PerUnit) || co2PerUnit < 0) return;
  let densityKgPerM3: number | null = null;
  if (densityRaw !== "") {
    const d = parseFloat(densityRaw);
    if (!Number.isFinite(d) || d <= 0) return;
    densityKgPerM3 = d;
  }

  try {
    await prisma.carbonFactor.create({
      data: {
        materialType,
        unitType,
        label,
        co2PerUnit,
        densityKgPerM3,
        source,
      },
    });
  } catch {
    return;
  }

  revalidateTag("carbon-factors", "max");
}

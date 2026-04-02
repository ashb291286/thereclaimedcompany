"use server";

import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { redirect } from "next/navigation";
import { recalculatePassportScore } from "@/app/driven/_lib/recalculate-passport-score";
import type { DrivenEntryCategory } from "@/generated/prisma/client";

export async function createDrivenVehicleFromGarageAction(formData: FormData): Promise<void> {
  const session = await auth();
  if (!session?.user?.id) redirect("/auth/signin?callbackUrl=/driven/garage/add");

  const registration = String(formData.get("registration") ?? "").trim().toUpperCase();
  const make = String(formData.get("make") ?? "").trim();
  const model = String(formData.get("model") ?? "").trim();
  const year = parseInt(String(formData.get("year") ?? ""), 10);
  const colour = String(formData.get("colour") ?? "").trim() || null;
  const mileageRaw = String(formData.get("mileage") ?? "").trim();
  const mileage = mileageRaw ? parseInt(mileageRaw, 10) : null;
  const howAcquired = String(formData.get("howAcquired") ?? "").trim();
  const sellingNote = String(formData.get("sellingIntention") ?? "").trim();

  if (!registration || !make || !model || !Number.isFinite(year)) {
    redirect("/driven/garage/add?error=missing-fields");
  }

  const vehicle = await prisma.drivenVehicle.create({
    data: {
      registration,
      make,
      model,
      year,
      colour,
      mileage: Number.isFinite(mileage ?? NaN) ? mileage : null,
      ownerId: session.user.id,
      status: "PRIVATE",
    },
  });

  await prisma.drivenGarageEntry.create({
    data: {
      userId: session.user.id,
      vehicleId: vehicle.id,
      relationship: "OWNED",
      notes: sellingNote || null,
    },
  });

  await prisma.drivenLineageEntry.create({
    data: {
      vehicleId: vehicle.id,
      date: new Date(),
      mileageAtTime: Number.isFinite(mileage ?? NaN) ? mileage : null,
      category: "OWNERSHIP",
      title: "Added to Driven · Reclaimed",
      description: howAcquired || "Vehicle record started on Reclaimed Marketplace.",
    },
  });

  await recalculatePassportScore(vehicle.id);
  redirect(`/driven/garage/${vehicle.id}/upload`);
}

export async function createLineageEntryDraftAction(formData: FormData): Promise<void> {
  const session = await auth();
  if (!session?.user?.id) redirect("/auth/signin");

  const vehicleId = String(formData.get("vehicleId") ?? "");
  const category = String(formData.get("category") ?? "") as DrivenEntryCategory;
  const title = String(formData.get("title") ?? "").trim();
  const dateStr = String(formData.get("date") ?? "");
  const mileageRaw = String(formData.get("mileageAtTime") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim() || null;
  const costRaw = String(formData.get("cost") ?? "").trim();
  const workshop = String(formData.get("workshop") ?? "").trim() || null;

  if (!vehicleId || !title || !dateStr) {
    redirect(`/driven/garage/${vehicleId}/upload?error=missing-fields`);
  }

  const vehicle = await prisma.drivenVehicle.findUnique({
    where: { id: vehicleId },
    select: { ownerId: true },
  });
  if (!vehicle || vehicle.ownerId !== session.user.id) {
    redirect("/driven/garage");
  }

  const date = new Date(dateStr);
  if (Number.isNaN(date.getTime())) {
    redirect(`/driven/garage/${vehicleId}/upload?error=invalid-date`);
  }

  const mileageAtTime = mileageRaw ? parseInt(mileageRaw, 10) : null;
  const cost = costRaw ? parseInt(costRaw, 10) : null;

  const allowed: DrivenEntryCategory[] = [
    "FACTORY",
    "OWNERSHIP",
    "SERVICE",
    "BODYWORK",
    "RESTORATION",
    "COMPETITION",
    "DOCUMENT",
  ];
  if (!allowed.includes(category)) {
    redirect(`/driven/garage/${vehicleId}/upload?error=invalid-category`);
  }

  const entry = await prisma.drivenLineageEntry.create({
    data: {
      vehicleId,
      date,
      mileageAtTime: Number.isFinite(mileageAtTime ?? NaN) ? mileageAtTime : null,
      category,
      title,
      description,
      cost: Number.isFinite(cost ?? NaN) ? cost : null,
      workshop,
    },
  });

  redirect(`/driven/garage/${vehicleId}/upload?entryId=${encodeURIComponent(entry.id)}`);
}

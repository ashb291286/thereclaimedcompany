"use server";

import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { recalculatePassportScore } from "@/app/driven/_lib/recalculate-passport-score";
import type { DrivenEntryCategory } from "@/generated/prisma/client";
import { allocateReclaimedPublicId } from "@/lib/driven-reclaimed-id";
import { STRIPE_MIN_AMOUNT_PENCE } from "@/lib/constants";

function parseScore0to100(raw: string): number | null {
  const n = parseInt(raw.trim(), 10);
  if (!Number.isFinite(n) || n < 0 || n > 100) return null;
  return n;
}

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

  const imagesStr = String(formData.get("initialImageUrls") ?? "").trim();
  const imageUrls = imagesStr ? imagesStr.split(",").map((u) => u.trim()).filter(Boolean) : [];

  if (!registration || !make || !model || !Number.isFinite(year)) {
    redirect("/driven/garage/add?error=missing-fields");
  }

  const selfInspect = formData.get("selfInspect") === "on";
  if (selfInspect && formData.get("selfInspectDisclaimer") !== "on") {
    redirect("/driven/garage/add?error=disclaimer-required");
  }

  let inspectionData: {
    bodyAndPaint: number;
    mechanical: number;
    interior: number;
    underbody: number;
    electrics: number;
    overallScore: number;
  } | null = null;

  if (selfInspect) {
    const bodyAndPaint = parseScore0to100(String(formData.get("inspectBodyPaint") ?? ""));
    const mechanical = parseScore0to100(String(formData.get("inspectMechanical") ?? ""));
    const interior = parseScore0to100(String(formData.get("inspectInterior") ?? ""));
    const underbody = parseScore0to100(String(formData.get("inspectUnderbody") ?? ""));
    const electrics = parseScore0to100(String(formData.get("inspectElectrics") ?? ""));
    if (
      bodyAndPaint === null ||
      mechanical === null ||
      interior === null ||
      underbody === null ||
      electrics === null
    ) {
      redirect("/driven/garage/add?error=invalid-inspection-scores");
    }
    const overallScore = Math.round(
      (bodyAndPaint + mechanical + interior + underbody + electrics) / 5
    );
    inspectionData = {
      bodyAndPaint,
      mechanical,
      interior,
      underbody,
      electrics,
      overallScore,
    };
  }

  const reclaimedPublicId = await allocateReclaimedPublicId();

  const vehicle = await prisma.drivenVehicle.create({
    data: {
      reclaimedPublicId,
      registration,
      make,
      model,
      year,
      colour,
      mileage: Number.isFinite(mileage ?? NaN) ? mileage : null,
      imageUrls,
      ownerId: session.user.id,
      status: "PRIVATE",
    },
  });

  if (inspectionData) {
    await prisma.drivenInspection.create({
      data: {
        vehicleId: vehicle.id,
        overallScore: inspectionData.overallScore,
        bodyAndPaint: inspectionData.bodyAndPaint,
        mechanical: inspectionData.mechanical,
        interior: inspectionData.interior,
        underbody: inspectionData.underbody,
        electrics: inspectionData.electrics,
        inspectorName: "Owner self-assessment",
        inspectedAt: new Date(),
      },
    });
  }

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

export async function createDrivenAuctionFromGarageAction(formData: FormData): Promise<void> {
  const session = await auth();
  if (!session?.user?.id) redirect("/auth/signin?callbackUrl=/driven/garage");

  const vehicleId = String(formData.get("vehicleId") ?? "").trim();
  const reservePounds = parseFloat(String(formData.get("reservePounds") ?? ""));
  const startingPounds = parseFloat(String(formData.get("startingPounds") ?? ""));
  const endsRaw = String(formData.get("auctionEndsAt") ?? "").trim();

  if (!vehicleId || !endsRaw) {
    redirect(
      vehicleId
        ? `/driven/garage/${vehicleId}/auction?error=missing-fields`
        : "/driven/garage?error=auction-missing-fields"
    );
  }

  const endsAt = new Date(endsRaw);
  if (Number.isNaN(endsAt.getTime()) || endsAt <= new Date()) {
    redirect(`/driven/garage/${vehicleId}/auction?error=invalid-end`);
  }

  const reservePrice = Math.round(reservePounds * 100);
  const startingBid = Math.round(startingPounds * 100);

  if (
    !Number.isFinite(reservePrice) ||
    !Number.isFinite(startingBid) ||
    startingBid < STRIPE_MIN_AMOUNT_PENCE ||
    reservePrice < STRIPE_MIN_AMOUNT_PENCE
  ) {
    redirect(`/driven/garage/${vehicleId}/auction?error=invalid-amounts`);
  }

  if (reservePrice < startingBid) {
    redirect(`/driven/garage/${vehicleId}/auction?error=reserve-below-start`);
  }

  const vehicle = await prisma.drivenVehicle.findFirst({
    where: { id: vehicleId, ownerId: session.user.id },
    include: { auction: true },
  });
  if (!vehicle) redirect("/driven/garage");
  if (vehicle.auction) {
    redirect(`/driven/garage/${vehicleId}/auction?error=already-listed`);
  }
  if (vehicle.status !== "PRIVATE") {
    redirect(`/driven/garage/${vehicleId}/auction?error=not-private`);
  }

  const listingId = await prisma.$transaction(async (tx) => {
    const created = await tx.drivenAuctionListing.create({
      data: {
        vehicleId: vehicle.id,
        reservePrice,
        currentBid: startingBid,
        bidCount: 0,
        endsAt,
        status: "ACTIVE",
      },
    });
    await tx.drivenVehicle.update({
      where: { id: vehicle.id },
      data: { status: "LISTED" },
    });
    return created.id;
  });

  revalidatePath("/driven/garage");
  revalidatePath("/driven/auctions");
  revalidatePath(`/driven/auctions/${listingId}`);
  redirect(`/driven/auctions/${listingId}`);
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

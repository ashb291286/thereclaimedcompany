import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { put } from "@vercel/blob";
import { NextResponse } from "next/server";
import type { DrivenDocumentType } from "@/generated/prisma/client";
import { recalculatePassportScore } from "@/app/driven/_lib/recalculate-passport-score";

function guessDocumentType(fileName: string): DrivenDocumentType {
  const n = fileName.toLowerCase();
  if (n.includes("mot")) return "MOT";
  if (n.includes("build")) return "BUILD_SHEET";
  if (n.includes("inspect")) return "INSPECTION";
  if (n.includes("cert")) return "CERTIFICATE";
  if (n.endsWith(".jpg") || n.endsWith(".jpeg") || n.endsWith(".png") || n.endsWith(".webp") || n.endsWith(".heic")) {
    return "PHOTO";
  }
  if (n.endsWith(".pdf")) return "INVOICE";
  return "OTHER";
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const token = process.env.BLOB_READ_WRITE_TOKEN;
  if (!token) {
    return NextResponse.json({ error: "Upload not configured" }, { status: 503 });
  }

  const formData = await req.formData();
  const file = formData.get("file") as File | null;
  const vehicleId = String(formData.get("vehicleId") ?? "");
  const entryId = String(formData.get("entryId") ?? "");
  if (!file || !vehicleId || !entryId) {
    return NextResponse.json({ error: "Missing file, vehicleId, or entryId" }, { status: 400 });
  }

  const vehicle = await prisma.drivenVehicle.findUnique({
    where: { id: vehicleId },
    select: { ownerId: true },
  });
  if (!vehicle || vehicle.ownerId !== session.user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const entry = await prisma.drivenLineageEntry.findFirst({
    where: { id: entryId, vehicleId },
    select: { id: true },
  });
  if (!entry) {
    return NextResponse.json({ error: "Entry not found" }, { status: 404 });
  }

  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 120);
  const objectPath = `driven/${session.user.id}/${vehicleId}/${Date.now()}-${safeName}`;

  try {
    const blob = await put(objectPath, file, { access: "public", token });
    const docType = guessDocumentType(file.name);
    await prisma.drivenDocument.create({
      data: {
        entryId,
        type: docType,
        url: blob.url,
        fileName: file.name,
      },
    });
    await recalculatePassportScore(vehicleId);
    return NextResponse.json({ url: blob.url, type: docType });
  } catch (e) {
    console.error("Driven document upload error:", e);
    return NextResponse.json({ error: "Upload failed" }, { status: 500 });
  }
}

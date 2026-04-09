import { NextResponse } from "next/server";
import { calculateCarbonImpact } from "@/lib/carbon/calculate";
import { getCarbonFactorsCached } from "@/lib/carbon/factors";
import type { MaterialUnit } from "@/lib/carbon/types";

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Expected JSON object" }, { status: 400 });
  }

  const o = body as Record<string, unknown>;
  const materialType = typeof o.material_type === "string" ? o.material_type.trim() : "";
  const quantity = typeof o.quantity === "number" ? o.quantity : Number(o.quantity);
  const unitRaw = typeof o.unit === "string" ? o.unit.trim().toLowerCase() : "";
  const isReclaimed = o.is_reclaimed !== false;

  if (!materialType) {
    return NextResponse.json({ error: "material_type is required" }, { status: 400 });
  }
  if (!Number.isFinite(quantity) || quantity <= 0) {
    return NextResponse.json(
      { error: "weight or volume must be a positive number" },
      { status: 400 }
    );
  }
  const unit = unitRaw as MaterialUnit;
  if (unit !== "kg" && unit !== "tonne" && unit !== "m3") {
    return NextResponse.json({ error: "unit must be kg, tonne, or m3" }, { status: 400 });
  }

  const factors = await getCarbonFactorsCached();
  const result = calculateCarbonImpact(materialType, quantity, unit, factors, {
    isReclaimed,
  });

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  return NextResponse.json(result.data);
}

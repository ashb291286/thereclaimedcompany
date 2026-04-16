import { NextResponse } from "next/server";
import { promises as fs } from "node:fs";
import path from "node:path";
import { LEGAL_DOC_NAMES } from "@/lib/legal-docs";

type Params = { params: Promise<{ fileName: string }> };

export async function GET(_: Request, { params }: Params) {
  const { fileName } = await params;
  if (!LEGAL_DOC_NAMES.has(fileName)) {
    return new NextResponse("Not found", { status: 404 });
  }

  const abs = path.join(process.cwd(), "legaldocs", fileName);
  try {
    const data = await fs.readFile(abs);
    return new NextResponse(new Uint8Array(data), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="${fileName}"`,
        "Cache-Control": "public, max-age=3600",
      },
    });
  } catch {
    return new NextResponse("Not found", { status: 404 });
  }
}

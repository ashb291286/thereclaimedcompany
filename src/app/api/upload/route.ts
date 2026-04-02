import { auth } from "@/auth";
import { put } from "@vercel/blob";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const formData = await req.formData();
  const file = formData.get("file") as File | null;
  const folder = formData.get("folder") as string | null;
  if (!file) {
    return NextResponse.json({ error: "No file" }, { status: 400 });
  }

  const token = process.env.BLOB_READ_WRITE_TOKEN;
  if (!token) {
    return NextResponse.json(
      { error: "Upload not configured" },
      { status: 503 }
    );
  }

  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 120);
  const stamp = Date.now();
  let objectPath: string;
  if (folder === "yard-logo") {
    objectPath = `yards/${session.user.id}/logo-${stamp}-${safeName}`;
  } else if (folder === "yard-header") {
    objectPath = `yards/${session.user.id}/header-${stamp}-${safeName}`;
  } else if (folder === "driven-vehicle") {
    objectPath = `driven/${session.user.id}/draft/${stamp}-${safeName}`;
  } else {
    objectPath = `listings/${session.user.id}/${stamp}-${safeName}`;
  }

  try {
    const blob = await put(objectPath, file, {
      access: "public",
      token,
    });
    return NextResponse.json({ url: blob.url });
  } catch (e) {
    console.error("Upload error:", e);
    return NextResponse.json({ error: "Upload failed" }, { status: 500 });
  }
}

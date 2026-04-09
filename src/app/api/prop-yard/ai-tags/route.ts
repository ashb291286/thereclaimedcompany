import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";

const PROMPT =
  "Analyse this item for a reclaimed prop marketplace. Suggest: period/era, design style, primary material, likely film/TV genre suitability, and interior/exterior scene type. Return strict JSON with keys: eras (string[]), styles (string[]), materials (string[]), genres (string[]), settingsInterior (string[]), settingsExterior (string[]).";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { imageUrl } = (await req.json().catch(() => ({}))) as { imageUrl?: string };
  if (!imageUrl) return NextResponse.json({ error: "imageUrl required" }, { status: 400 });
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return NextResponse.json({ error: "Missing ANTHROPIC_API_KEY" }, { status: 500 });

  const r = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-3-5-sonnet-latest",
      max_tokens: 800,
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: PROMPT },
            { type: "image", source: { type: "url", url: imageUrl } },
          ],
        },
      ],
    }),
  });

  if (!r.ok) {
    const err = await r.text();
    return NextResponse.json({ error: `Anthropic failed: ${err}` }, { status: 502 });
  }
  const body = (await r.json()) as { content?: Array<{ type?: string; text?: string }> };
  const text = body.content?.find((c) => c.type === "text")?.text ?? "";
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) return NextResponse.json({ error: "No JSON returned", raw: text }, { status: 502 });
  let suggestions: unknown;
  try {
    suggestions = JSON.parse(match[0]);
  } catch {
    return NextResponse.json({ error: "Invalid JSON from model", raw: text }, { status: 502 });
  }
  return NextResponse.json({ suggestions });
}

/**
 * Generates a short neutral overview of a marketplace listing Q&A thread (OpenAI Chat Completions).
 * Same stack as Driven auction QA — requires OPENAI_API_KEY.
 */

export async function generateListingQaOverview(args: {
  listingTitle: string;
  lines: string[];
}): Promise<string | null> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey || args.lines.length === 0) return null;

  const model = process.env.OPENAI_QA_MODEL?.trim() || "gpt-4o-mini";
  const transcript = args.lines.join("\n");
  const prompt = `You are summarising a public comment thread on a reclaimed / salvage marketplace listing titled: "${args.listingTitle}".

Thread (oldest to newest):
${transcript}

Write a concise **AI overview** for buyers who skim the page first:
- 3–5 short bullet points (use a leading "• " on each line).
- Cover themes: what people asked, what the seller answered, anything still open or unclear.
- Neutral tone. **Only** use information that appears in the thread — do not guess condition, provenance, or pricing beyond what was said.
- If the thread is mostly greetings or off-topic, say so briefly.

Output plain text bullets only, no title line.`;

  const r = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      max_tokens: 600,
      messages: [{ role: "user", content: prompt }],
    }),
  });

  if (!r.ok) return null;
  const body = (await r.json()) as {
    choices?: Array<{ message?: { content?: string | null } }>;
  };
  const text = body.choices?.[0]?.message?.content?.trim() ?? "";
  return text || null;
}

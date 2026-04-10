/**
 * Generates a short neutral overview of a Driven auction Q&A thread (OpenAI Chat Completions).
 * Not legal or mechanical advice — display a disclaimer in UI.
 */

export async function generateDrivenAuctionQaOverview(args: {
  vehicleTitle: string;
  lines: string[];
}): Promise<string | null> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey || args.lines.length === 0) return null;

  const model = process.env.OPENAI_QA_MODEL?.trim() || "gpt-4o-mini";
  const transcript = args.lines.join("\n");
  const prompt = `You are summarising a public comment thread on a classic/collector vehicle auction listing titled: "${args.vehicleTitle}".

Thread (newest context may appear last):
${transcript}

Write a concise **AI overview** for buyers who skim the page first:
- 3–5 short bullet points (use a leading "• " on each line).
- Cover themes: what people asked, what was answered, anything still unclear or disputed.
- Neutral tone. **Only** use information that appears in the thread — do not guess mechanical condition, history, or values.
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

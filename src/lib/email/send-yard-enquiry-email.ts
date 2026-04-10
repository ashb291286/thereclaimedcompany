/**
 * Optional Resend delivery for yard enquiries. If RESEND_API_KEY is unset, no-op (in-app notification still created).
 */
export async function sendYardEnquiryEmail(input: {
  toEmail: string;
  yardDisplayName: string;
  fromName: string;
  fromEmail: string;
  message: string;
  phone?: string | null;
  quantity?: string | null;
  yardPageUrl: string;
}): Promise<void> {
  const key = process.env.RESEND_API_KEY?.trim();
  if (!key) return;

  const from = process.env.RESEND_FROM?.trim() || "Reclaimed Marketplace <onboarding@resend.dev>";
  const text = [
    `New enquiry for ${input.yardDisplayName}`,
    "",
    `From: ${input.fromName} <${input.fromEmail}>`,
    input.phone ? `Phone: ${input.phone}` : null,
    input.quantity ? `Quantity / details: ${input.quantity}` : null,
    "",
    input.message,
    "",
    `Yard page: ${input.yardPageUrl}`,
  ]
    .filter(Boolean)
    .join("\n");

  await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: [input.toEmail],
      subject: `Enquiry via Reclaimed Marketplace — ${input.yardDisplayName}`,
      text,
    }),
  });
}

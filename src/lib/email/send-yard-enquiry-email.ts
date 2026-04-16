import nodemailer from "nodemailer";

/**
 * Optional SMTP delivery for yard enquiries.
 * If SMTP credentials are unset, this is a no-op (in-app notification still created).
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
  const smtpHost = process.env.SMTP_HOST?.trim() || "smtp.thereclaimedcompany.com";
  const smtpPort = parseInt(process.env.SMTP_PORT?.trim() || "465", 10);
  const smtpSecure = String(process.env.SMTP_SECURE ?? "true").trim().toLowerCase() !== "false";
  const smtpUser = process.env.SMTP_USER?.trim();
  const smtpPass = process.env.SMTP_PASS?.trim();
  if (!smtpUser || !smtpPass) return;

  const from =
    process.env.MAIL_FROM?.trim() ||
    process.env.SMTP_FROM?.trim() ||
    "Reclaimed Marketplace <nowthen@thereclaimedcompany.com>";
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

  const transport = nodemailer.createTransport({
    host: smtpHost,
    port: Number.isFinite(smtpPort) ? smtpPort : 465,
    secure: smtpSecure,
    auth: {
      user: smtpUser,
      pass: smtpPass,
    },
  });

  await transport.sendMail({
    from,
    to: input.toEmail,
    subject: `Enquiry via Reclaimed Marketplace — ${input.yardDisplayName}`,
    text,
    replyTo: `${input.fromName} <${input.fromEmail}>`,
  });
}

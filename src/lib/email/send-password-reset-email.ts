import nodemailer from "nodemailer";

/**
 * Sends a password reset link. Returns false when SMTP is not configured (same pattern as yard enquiry mail).
 */
export async function sendPasswordResetEmail(input: {
  toEmail: string;
  resetUrl: string;
}): Promise<boolean> {
  const smtpHost = process.env.SMTP_HOST?.trim() || "smtp.thereclaimedcompany.com";
  const smtpPort = parseInt(process.env.SMTP_PORT?.trim() || "465", 10);
  const smtpSecure = String(process.env.SMTP_SECURE ?? "true").trim().toLowerCase() !== "false";
  const smtpUser = process.env.SMTP_USER?.trim();
  const smtpPass = process.env.SMTP_PASS?.trim();
  if (!smtpUser || !smtpPass) return false;

  const from =
    process.env.MAIL_FROM?.trim() ||
    process.env.SMTP_FROM?.trim() ||
    "Reclaimed Marketplace <nowthen@thereclaimedcompany.com>";

  const text = [
    "Reset your Reclaimed Marketplace password",
    "",
    "Open this link (valid for 1 hour):",
    input.resetUrl,
    "",
    "If you did not request this, you can ignore this email.",
  ].join("\n");

  const transport = nodemailer.createTransport({
    host: smtpHost,
    port: Number.isFinite(smtpPort) ? smtpPort : 465,
    secure: smtpSecure,
    auth: { user: smtpUser, pass: smtpPass },
  });

  await transport.sendMail({
    from,
    to: input.toEmail,
    subject: "Reset your Reclaimed Marketplace password",
    text,
  });

  return true;
}

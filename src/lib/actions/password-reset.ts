"use server";

import { randomBytes } from "node:crypto";
import { hash } from "bcryptjs";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getSiteBaseUrl } from "@/lib/site-url";
import { safeInternalPath } from "@/lib/safe-internal-path";
import { sendPasswordResetEmail } from "@/lib/email/send-password-reset-email";

const RESET_PREFIX = "password-reset:";
const TOKEN_TTL_MS = 60 * 60 * 1000;

function normalizeEmail(raw: string): string {
  return raw.trim().toLowerCase();
}

export async function requestPasswordResetAction(formData: FormData): Promise<void> {
  const email = normalizeEmail(String(formData.get("email") ?? ""));
  const callbackRaw = safeInternalPath(String(formData.get("callbackUrl") ?? "")) ?? "";

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    redirect("/auth/forgot-password?error=invalid_email");
  }

  const smtpUser = process.env.SMTP_USER?.trim();
  const smtpPass = process.env.SMTP_PASS?.trim();
  if (!smtpUser || !smtpPass) {
    redirect("/auth/forgot-password?error=smtp");
  }

  const user = await prisma.user.findUnique({
    where: { email },
    select: { id: true, email: true },
  });

  if (!user?.email) {
    redirect("/auth/forgot-password?sent=1");
  }

  const token = randomBytes(32).toString("hex");
  const identifier = `${RESET_PREFIX}${email}`;
  const expires = new Date(Date.now() + TOKEN_TTL_MS);

  await prisma.verificationToken.deleteMany({ where: { identifier } });
  await prisma.verificationToken.create({
    data: { identifier, token, expires },
  });

  const base = getSiteBaseUrl();
  const resetUrl = `${base}/auth/reset-password?token=${encodeURIComponent(token)}${
    callbackRaw ? `&callbackUrl=${encodeURIComponent(callbackRaw)}` : ""
  }`;

  const sent = await sendPasswordResetEmail({ toEmail: email, resetUrl });
  if (!sent) {
    await prisma.verificationToken.deleteMany({ where: { token } });
    redirect("/auth/forgot-password?error=smtp");
  }

  redirect("/auth/forgot-password?sent=1");
}

export async function completePasswordResetAction(formData: FormData): Promise<void> {
  const token = String(formData.get("token") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const confirm = String(formData.get("confirmPassword") ?? "");
  const callbackUrl = safeInternalPath(String(formData.get("callbackUrl") ?? "")) ?? "";

  const resetQs = (parts: Record<string, string>) => {
    const q = new URLSearchParams(parts);
    if (callbackUrl) q.set("callbackUrl", callbackUrl);
    return `/auth/reset-password?${q.toString()}`;
  };

  if (!token) {
    redirect("/auth/reset-password?error=missing_token");
  }
  if (password.length < 8) {
    redirect(resetQs({ token, error: "weak_password" }));
  }
  if (password !== confirm) {
    redirect(resetQs({ token, error: "mismatch" }));
  }

  const row = await prisma.verificationToken.findUnique({
    where: { token },
    select: { identifier: true, expires: true },
  });

  if (!row || !row.identifier.startsWith(RESET_PREFIX) || row.expires < new Date()) {
    redirect("/auth/reset-password?error=invalid_or_expired");
  }

  const email = row.identifier.slice(RESET_PREFIX.length);
  const user = await prisma.user.findUnique({
    where: { email },
    select: { id: true },
  });
  if (!user) {
    await prisma.verificationToken.deleteMany({ where: { token } });
    redirect("/auth/reset-password?error=invalid_or_expired");
  }

  const hashed = await hash(password, 12);
  await prisma.$transaction([
    prisma.user.update({
      where: { id: user.id },
      data: { password: hashed },
    }),
    prisma.verificationToken.deleteMany({ where: { token } }),
  ]);

  const q = new URLSearchParams({ reset: "success" });
  if (callbackUrl) q.set("callbackUrl", callbackUrl);
  redirect(`/auth/signin?${q.toString()}`);
}

"use server";

import { hash } from "bcryptjs";
import { prisma } from "@/lib/db";
import { signIn } from "@/auth";
import { safeInternalPath } from "@/lib/safe-internal-path";

export async function register(formData: FormData) {
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;
  const name = formData.get("name") as string;
  const accountIntent = ((formData.get("accountIntent") as string) ?? "buying").trim();
  const sellerTypePrefRaw = ((formData.get("sellerTypePref") as string) ?? "").trim();
  const sellerTypePref =
    sellerTypePrefRaw === "reclamation_yard" || sellerTypePrefRaw === "dealer"
      ? sellerTypePrefRaw
      : null;
  const businessNamePrefill = ((formData.get("businessNamePrefill") as string) ?? "").trim();
  const yearsTradingRaw = ((formData.get("yearsTrading") as string) ?? "").trim();
  const agreeLegalHub = String(formData.get("agreeLegalHub") ?? "") === "on";

  if (!email?.trim() || !password?.trim()) {
    return { error: "Email and password are required" };
  }
  if (password.length < 8) {
    return { error: "Password must be at least 8 characters" };
  }
  if (!agreeLegalHub) {
    return { error: "Please agree to the Legal hub documents to continue" };
  }

  const existing = await prisma.user.findUnique({ where: { email: email.trim() } });
  if (existing) {
    return { error: "An account with this email already exists" };
  }

  const hashed = await hash(password, 12);
  await prisma.user.create({
    data: {
      email: email.trim(),
      password: hashed,
      name: name?.trim() || null,
      registrationIntent: accountIntent === "selling" ? "selling" : "buying",
    },
  });

  const callback = safeInternalPath(String(formData.get("callbackUrl") ?? ""));
  const yearsTrading = yearsTradingRaw ? parseInt(yearsTradingRaw, 10) : NaN;
  const yearEstablishedPrefill =
    Number.isFinite(yearsTrading) && yearsTrading >= 0 && yearsTrading <= 200
      ? new Date().getFullYear() - yearsTrading
      : null;
  const onboardingParams = new URLSearchParams({ welcome: "1" });
  if (sellerTypePref) onboardingParams.set("sellerType", sellerTypePref);
  if (businessNamePrefill) onboardingParams.set("businessName", businessNamePrefill.slice(0, 120));
  if (yearEstablishedPrefill && yearEstablishedPrefill > 1800) {
    onboardingParams.set("yearEstablished", String(yearEstablishedPrefill));
  }
  const defaultSelling = `/dashboard/onboarding?${onboardingParams.toString()}`;
  const defaultBuying = "/search?welcome=1";
  const redirectTo =
    callback ??
    (accountIntent === "selling" ? defaultSelling : defaultBuying);

  await signIn("credentials", {
    email: email.trim(),
    password,
    redirectTo,
  });
}

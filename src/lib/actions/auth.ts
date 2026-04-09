"use server";

import { hash } from "bcryptjs";
import { prisma } from "@/lib/db";
import { redirect } from "next/navigation";
import { signIn } from "@/auth";

export async function register(formData: FormData) {
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;
  const name = formData.get("name") as string;
  const accountIntent = ((formData.get("accountIntent") as string) ?? "buying").trim();

  if (!email?.trim() || !password?.trim()) {
    return { error: "Email and password are required" };
  }
  if (password.length < 8) {
    return { error: "Password must be at least 8 characters" };
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

  const redirectTo =
    accountIntent === "selling" ? "/dashboard/onboarding?welcome=1" : "/search?welcome=1";

  await signIn("credentials", {
    email: email.trim(),
    password,
    redirectTo,
  });
}

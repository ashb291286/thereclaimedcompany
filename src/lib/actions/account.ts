"use server";

import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { compare, hash } from "bcryptjs";
import { redirect } from "next/navigation";

function accountRedirect(path: string, msg: string, ok = false): never {
  const key = ok ? "ok" : "error";
  redirect(`${path}?${key}=${encodeURIComponent(msg)}`);
}

export async function updateAccountEmailAction(formData: FormData): Promise<void> {
  const session = await auth();
  if (!session?.user?.id) redirect("/auth/signin");

  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const currentPassword = String(formData.get("currentPassword") ?? "");
  if (!email || !currentPassword) {
    accountRedirect("/dashboard/account", "Email and current password are required.");
  }

  const me = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { id: true, email: true, password: true },
  });
  if (!me?.password) accountRedirect("/dashboard/account", "Account not found.");

  const ok = await compare(currentPassword, me.password);
  if (!ok) accountRedirect("/dashboard/account", "Current password is incorrect.");
  if (me.email?.toLowerCase() === email) accountRedirect("/dashboard/account", "Email is unchanged.");

  const taken = await prisma.user.findFirst({
    where: { email, NOT: { id: session.user.id } },
    select: { id: true },
  });
  if (taken) accountRedirect("/dashboard/account", "That email is already in use.");

  await prisma.user.update({
    where: { id: session.user.id },
    data: { email },
  });
  accountRedirect("/dashboard/account", "Email updated.", true);
}

export async function updateAccountPasswordAction(formData: FormData): Promise<void> {
  const session = await auth();
  if (!session?.user?.id) redirect("/auth/signin");

  const currentPassword = String(formData.get("currentPassword") ?? "");
  const newPassword = String(formData.get("newPassword") ?? "");
  const confirmPassword = String(formData.get("confirmPassword") ?? "");
  if (!currentPassword || !newPassword || !confirmPassword) {
    accountRedirect("/dashboard/account", "Fill in current, new, and confirm password.");
  }
  if (newPassword.length < 8) {
    accountRedirect("/dashboard/account", "New password must be at least 8 characters.");
  }
  if (newPassword !== confirmPassword) {
    accountRedirect("/dashboard/account", "New password and confirmation do not match.");
  }

  const me = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { id: true, password: true },
  });
  if (!me?.password) accountRedirect("/dashboard/account", "Account not found.");

  const ok = await compare(currentPassword, me.password);
  if (!ok) accountRedirect("/dashboard/account", "Current password is incorrect.");

  const nextHash = await hash(newPassword, 12);
  await prisma.user.update({
    where: { id: session.user.id },
    data: { password: nextHash },
  });
  accountRedirect("/dashboard/account", "Password updated.", true);
}

export async function updateAccountTypeAction(formData: FormData): Promise<void> {
  const session = await auth();
  if (!session?.user?.id) redirect("/auth/signin");
  const nextType = String(formData.get("accountType") ?? "");
  if (nextType !== "individual" && nextType !== "reclamation_yard") {
    accountRedirect("/dashboard/account", "Choose a valid account type.");
  }

  const sellerProfile = await prisma.sellerProfile.findUnique({
    where: { userId: session.user.id },
    select: { id: true },
  });

  if (!sellerProfile) {
    if (nextType === "reclamation_yard") {
      redirect("/dashboard/onboarding?welcome=1");
    }
    await prisma.user.update({
      where: { id: session.user.id },
      data: { role: "individual" },
    });
    accountRedirect("/dashboard/account", "Account type updated to individual.", true);
  }

  await prisma.user.update({
    where: { id: session.user.id },
    data: { role: nextType },
  });

  if (nextType === "reclamation_yard") {
    accountRedirect("/dashboard/account", "Account type updated to reclamation yard.", true);
  }
  accountRedirect("/dashboard/account", "Account type updated to individual.", true);
}

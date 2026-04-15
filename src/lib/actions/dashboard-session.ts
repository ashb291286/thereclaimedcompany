"use server";

import { signOut } from "@/auth";

export async function dashboardSignOutAction(): Promise<void> {
  await signOut({ redirectTo: "/" });
}

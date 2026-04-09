"use server";

import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { lookupUkPostcode } from "@/lib/postcode-uk";
import { revalidatePath } from "next/cache";

export async function saveBuyerHomePostcode(rawPostcode: string) {
  const session = await auth();
  if (!session?.user?.id) {
    return { ok: false as const, error: "Sign in required." };
  }

  const lookup = await lookupUkPostcode(rawPostcode);
  if (!lookup) {
    return { ok: false as const, error: "We couldn’t find that UK postcode. Check and try again." };
  }

  await prisma.user.update({
    where: { id: session.user.id },
    data: {
      homePostcode: lookup.postcode,
      homeLat: lookup.lat,
      homeLng: lookup.lng,
      homeAdminDistrict: lookup.adminDistrict,
      homeRegion: lookup.region,
      buyerWelcomeCompletedAt: new Date(),
    },
  });

  revalidatePath("/search");
  return { ok: true as const };
}

export async function skipBuyerWelcome() {
  const session = await auth();
  if (!session?.user?.id) {
    return { ok: false as const, error: "Sign in required." };
  }

  await prisma.user.update({
    where: { id: session.user.id },
    data: { buyerWelcomeCompletedAt: new Date() },
  });

  revalidatePath("/search");
  return { ok: true as const };
}

"use server";

import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";

export type SellerClaimState =
  | { status: "idle" }
  | { status: "error"; message: string }
  | { status: "success"; message: string };

export async function claimImportedSellerProfileAction(
  _prev: SellerClaimState,
  formData: FormData
): Promise<SellerClaimState> {
  const session = await auth();
  if (!session?.user?.id) {
    return { status: "error", message: "Please sign in before claiming a profile." };
  }

  const sellerProfileId = String(formData.get("sellerProfileId") ?? "").trim();
  const claimCode = String(formData.get("claimCode") ?? "")
    .trim()
    .toUpperCase();
  if (!sellerProfileId || !claimCode) {
    return { status: "error", message: "Seller profile and claim code are required." };
  }

  const me = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { id: true, sellerProfile: { select: { id: true } } },
  });
  if (!me) return { status: "error", message: "Your account could not be found." };
  if (me.sellerProfile) {
    return {
      status: "error",
      message: "This account already has a seller profile. Use a separate account to claim another business.",
    };
  }

  const target = await prisma.sellerProfile.findUnique({
    where: { id: sellerProfileId },
    select: {
      id: true,
      userId: true,
      displayName: true,
      yardSlug: true,
      claimCode: true,
      importedByAdmin: true,
      user: {
        select: {
          role: true,
          _count: {
            select: {
              listings: true,
              ordersAsSeller: true,
            },
          },
        },
      },
    },
  });

  if (!target) return { status: "error", message: "Imported profile not found." };
  if (!target.importedByAdmin || !target.claimCode) {
    return { status: "error", message: "This profile is not claimable." };
  }
  if (target.claimCode !== claimCode) {
    return { status: "error", message: "Claim code is invalid." };
  }

  const hasCommercialActivity =
    target.user._count.ordersAsSeller > 0;
  if (hasCommercialActivity) {
    return {
      status: "error",
      message:
        "This profile already has seller orders and requires admin support for transfer. Please contact support.",
    };
  }

  await prisma.$transaction(async (tx) => {
    if (target.user._count.listings > 0) {
      await tx.listing.updateMany({
        where: { sellerId: target.userId },
        data: { sellerId: me.id },
      });
    }

    await tx.user.update({
      where: { id: me.id },
      data: { role: target.user.role ?? "dealer", registrationIntent: "selling" },
    });

    await tx.sellerProfile.update({
      where: { id: target.id },
      data: {
        userId: me.id,
        importedByAdmin: false,
        claimCode: null,
        claimedAt: new Date(),
      },
    });
  });

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/seller-profile");
  if (target.yardSlug) {
    revalidatePath(`/yards/${target.yardSlug}`);
  } else {
    revalidatePath(`/sellers/${session.user.id}`);
  }

  return {
    status: "success",
    message: `Profile claimed successfully. ${target.displayName} is now linked to your account.`,
  };
}


"use server";

import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { createNotification } from "@/lib/notifications";
import { sendYardEnquiryEmail } from "@/lib/email/send-yard-enquiry-email";
import { getSiteBaseUrl } from "@/lib/site-url";
import { revalidatePath } from "next/cache";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function submitYardEnquiryAction(
  _prev: { ok: boolean; message?: string },
  formData: FormData
): Promise<{ ok: boolean; message?: string }> {
  const yardUserId = String(formData.get("yardUserId") ?? "").trim();
  const yardSlug = String(formData.get("yardSlug") ?? "").trim();
  if (!yardUserId || !yardSlug) {
    return { ok: false, message: "Missing yard." };
  }

  const profile = await prisma.sellerProfile.findUnique({
    where: { userId: yardUserId },
    select: {
      user: { select: { role: true } },
      yardSlug: true,
      businessName: true,
      displayName: true,
      yardContactEmail: true,
    },
  });
  if (!profile || profile.user.role !== "reclamation_yard" || profile.yardSlug !== yardSlug) {
    return { ok: false, message: "Yard not found." };
  }

  const session = await auth();
  const fromUserId = session?.user?.id ?? null;

  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();
  const phone = String(formData.get("phone") ?? "").trim() || null;
  const message = String(formData.get("message") ?? "").trim();
  const quantity = String(formData.get("quantity") ?? "").trim() || null;
  const imageUrl = String(formData.get("imageUrl") ?? "").trim() || null;

  if (name.length < 2) return { ok: false, message: "Please enter your name." };
  if (!EMAIL_RE.test(email)) return { ok: false, message: "Please enter a valid email." };
  if (message.length < 10) return { ok: false, message: "Please add a short message (at least 10 characters)." };

  await prisma.yardEnquiry.create({
    data: {
      yardUserId,
      fromUserId,
      name,
      email,
      phone,
      message,
      quantity,
      imageUrl,
    },
  });

  const displayName = profile.businessName?.trim() || profile.displayName;
  const base = getSiteBaseUrl();
  const yardPageUrl = `${base}/yards/${yardSlug}`;

  await createNotification({
    userId: yardUserId,
    type: "yard_enquiry",
    title: "New yard enquiry",
    body: `${name}: ${message.slice(0, 120)}${message.length > 120 ? "…" : ""}`,
    linkUrl: yardPageUrl,
  });

  const notifyEmail = profile.yardContactEmail?.trim();
  if (notifyEmail && EMAIL_RE.test(notifyEmail)) {
    await sendYardEnquiryEmail({
      toEmail: notifyEmail,
      yardDisplayName: displayName,
      fromName: name,
      fromEmail: email,
      message,
      phone,
      quantity,
      yardPageUrl,
    });
  }

  revalidatePath(`/yards/${yardSlug}`);
  return { ok: true };
}

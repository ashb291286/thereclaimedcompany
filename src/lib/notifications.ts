import { prisma } from "@/lib/db";

export async function createNotification(input: {
  userId: string;
  type: string;
  title: string;
  body: string;
  linkUrl?: string | null;
}) {
  await prisma.notification.create({
    data: {
      userId: input.userId,
      type: input.type,
      title: input.title,
      body: input.body,
      linkUrl: input.linkUrl ?? null,
    },
  });
}

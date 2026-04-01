import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { redirect } from "next/navigation";
import Link from "next/link";
import {
  markAllNotificationsRead,
  markNotificationReadForm,
} from "@/lib/actions/wanted";

export default async function NotificationsPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/auth/signin");

  const items = await prisma.notification.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "desc" },
    take: 80,
  });

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold text-zinc-900">Notifications</h1>
        <form action={markAllNotificationsRead}>
          <button
            type="submit"
            className="text-sm font-medium text-amber-700 hover:underline"
          >
            Mark all read
          </button>
        </form>
      </div>
      <p className="mt-2 text-sm text-zinc-600">
        Wanted ads, offers, and auction updates appear here.
      </p>
      {items.length === 0 ? (
        <p className="mt-8 text-sm text-zinc-500">You’re all caught up.</p>
      ) : (
        <ul className="mt-6 space-y-3">
          {items.map((n) => (
            <li
              key={n.id}
              className={`rounded-xl border p-4 ${
                n.readAt ? "border-zinc-200 bg-white" : "border-amber-200 bg-amber-50/50"
              }`}
            >
              <p className="font-medium text-zinc-900">{n.title}</p>
              <p className="mt-1 text-sm text-zinc-600">{n.body}</p>
              <div className="mt-3 flex flex-wrap items-center gap-3 text-sm">
                {n.linkUrl && (
                  <Link href={n.linkUrl} className="font-medium text-amber-700 hover:underline">
                    Open
                  </Link>
                )}
                {!n.readAt && (
                  <form action={markNotificationReadForm}>
                    <input type="hidden" name="id" value={n.id} />
                    <button type="submit" className="text-zinc-500 hover:text-zinc-800">
                      Mark read
                    </button>
                  </form>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

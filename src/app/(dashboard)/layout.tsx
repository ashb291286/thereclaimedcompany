import { auth } from "@/auth";
import Link from "next/link";
import { signOut } from "@/auth";
import { prisma } from "@/lib/db";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  const unreadCount =
    session?.user?.id != null
      ? await prisma.notification.count({
          where: { userId: session.user.id, readAt: null },
        })
      : 0;

  return (
    <div className="min-h-screen bg-zinc-50">
      <header className="border-b border-zinc-200 bg-white">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4">
          <Link href="/" className="font-semibold text-zinc-900">
            Reclaimed Marketplace
          </Link>
          <nav className="flex flex-wrap items-center gap-4 sm:gap-6">
            <Link href="/" className="text-sm text-zinc-600 hover:text-zinc-900">
              Browse
            </Link>
            <Link href="/wanted" className="text-sm text-zinc-600 hover:text-zinc-900">
              Wanted
            </Link>
            <Link href="/dashboard" className="text-sm text-zinc-600 hover:text-zinc-900">
              Dashboard
            </Link>
            <Link href="/dashboard/sell" className="text-sm text-zinc-600 hover:text-zinc-900">
              Sell
            </Link>
            <Link href="/dashboard/offers" className="text-sm text-zinc-600 hover:text-zinc-900">
              Offers
            </Link>
            <Link href="/dashboard/wanted" className="text-sm text-zinc-600 hover:text-zinc-900">
              My wanted
            </Link>
            <Link
              href="/dashboard/notifications"
              className="relative text-sm text-zinc-600 hover:text-zinc-900"
            >
              Notifications
              {unreadCount > 0 && (
                <span className="absolute -right-2 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-brand px-1 text-[10px] font-bold text-white">
                  {unreadCount > 9 ? "9+" : unreadCount}
                </span>
              )}
            </Link>
            <span className="hidden text-sm text-zinc-500 sm:inline">{session?.user?.email}</span>
            <form
              action={async () => {
                "use server";
                await signOut({ redirectTo: "/" });
              }}
            >
              <button type="submit" className="text-sm text-brand hover:underline">
                Sign out
              </button>
            </form>
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-8">{children}</main>
    </div>
  );
}

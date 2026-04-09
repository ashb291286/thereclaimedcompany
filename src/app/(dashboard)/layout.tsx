import { auth } from "@/auth";
import Link from "next/link";
import { signOut } from "@/auth";
import { prisma } from "@/lib/db";
import { isCarbonAdmin } from "@/lib/admin";
import { DashboardSidebar } from "./DashboardSidebar";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  const [unreadCount, dbRole] =
    session?.user?.id != null
      ? await Promise.all([
          prisma.notification.count({
            where: { userId: session.user.id, readAt: null },
          }),
          prisma.user.findUnique({
            where: { id: session.user.id },
            select: { role: true },
          }),
        ]).then(([count, user]) => [count, user?.role ?? null] as const)
      : [0, null];
  const isYardAccount = (session?.user?.role ?? dbRole) === "reclamation_yard";
  const carbonAdmin = session ? isCarbonAdmin(session) : false;

  return (
    <div className="min-h-screen bg-zinc-50">
      <header className="border-b border-zinc-200 bg-white">
        <div className="mx-auto flex h-14 max-w-[1400px] items-center justify-between px-4">
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
            <Link href="/dashboard/account" className="text-sm text-zinc-600 hover:text-zinc-900">
              Account
            </Link>
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
      <main className="mx-auto max-w-[1400px] px-4 py-8">
        <div className="grid grid-cols-1 gap-6 md:grid-cols-[250px_minmax(0,1fr)]">
          <DashboardSidebar isYardAccount={isYardAccount} carbonAdmin={carbonAdmin} unreadCount={unreadCount} />
          <div>{children}</div>
        </div>
      </main>
    </div>
  );
}

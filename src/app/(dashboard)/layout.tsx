import { auth } from "@/auth";
import { signOut } from "@/auth";
import { prisma } from "@/lib/db";
import { isCarbonAdmin } from "@/lib/admin";
import { DashboardLayoutShell } from "./DashboardLayoutShell";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  const [unreadCount, unreadOutbidCount, dbUserMeta] =
    session?.user?.id != null
      ? await Promise.all([
          prisma.notification.count({
            where: { userId: session.user.id, readAt: null },
          }),
          prisma.notification.count({
            where: { userId: session.user.id, readAt: null, type: "auction_outbid" },
          }),
          prisma.user.findUnique({
            where: { id: session.user.id },
            select: { role: true, suspendedAt: true },
          }),
        ]).then(([count, outbid, user]) => [count, outbid, user ?? null] as const)
      : [0, 0, null];
  if (dbUserMeta?.suspendedAt) {
    await signOut({ redirectTo: "/auth/signout?suspended=1" });
  }
  const isYardAccount = (session?.user?.role ?? dbUserMeta?.role ?? null) === "reclamation_yard";
  const carbonAdmin = session ? isCarbonAdmin(session) : false;

  return (
    <DashboardLayoutShell
      unreadCount={unreadCount}
      unreadOutbidCount={unreadOutbidCount}
      isYardAccount={isYardAccount}
      carbonAdmin={carbonAdmin}
    >
      {children}
    </DashboardLayoutShell>
  );
}

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
  const [unreadCount, unreadOutbidCount, dbUserMeta, dealerDealsAsSellerCount] =
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
          prisma.dealerDeal.count({ where: { sellerId: session.user.id } }),
        ]).then(([count, outbid, user, dealCount]) => [count, outbid, user ?? null, dealCount] as const)
      : [0, 0, null, 0];
  if (dbUserMeta?.suspendedAt) {
    await signOut({ redirectTo: "/auth/signout?suspended=1" });
  }
  const role = session?.user?.role ?? dbUserMeta?.role ?? null;
  const isYardAccount = role === "reclamation_yard";
  const isDealerAccount = role === "dealer";
  const isIndividualSeller = role === "individual";
  const carbonAdmin = session ? isCarbonAdmin(session) : false;

  return (
    <DashboardLayoutShell
      unreadCount={unreadCount}
      unreadOutbidCount={unreadOutbidCount}
      isYardAccount={isYardAccount}
      isDealerAccount={isDealerAccount}
      isIndividualSeller={isIndividualSeller}
      dealerDealsAsSellerCount={isDealerAccount ? dealerDealsAsSellerCount : 0}
      carbonAdmin={carbonAdmin}
    >
      {children}
    </DashboardLayoutShell>
  );
}

import type { Metadata } from "next";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { PropYardNav } from "@/components/prop-yard/PropYardNav";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: {
    default: "The Prop Yard | The Reclaimed Company",
    template: "%s | The Prop Yard",
  },
  description:
    "Hire authentic reclaimed pieces from UK reclamation yards for film, TV, and stills. Separate from marketplace sales — weekly hire, contracts, and logistics built for productions.",
};

export default async function PropYardLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  let showManageOffers = false;
  if (session?.user?.id) {
    const [userRow, sellerProfile] = await Promise.all([
      prisma.user.findUnique({ where: { id: session.user.id }, select: { role: true } }),
      prisma.sellerProfile.findUnique({ where: { userId: session.user.id }, select: { id: true } }),
    ]);
    showManageOffers = userRow?.role === "reclamation_yard" || !!sellerProfile;
  }

  return (
    <div className="min-h-screen bg-driven-paper text-driven-ink">
      <PropYardNav showManageOffers={showManageOffers} />
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        <div className="text-base leading-relaxed">{children}</div>
      </div>
    </div>
  );
}

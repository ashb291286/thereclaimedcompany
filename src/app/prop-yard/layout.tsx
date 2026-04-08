import type { Metadata } from "next";
import { DM_Mono, DM_Sans, Playfair_Display } from "next/font/google";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { PropYardNav } from "@/components/prop-yard/PropYardNav";

const playfair = Playfair_Display({
  subsets: ["latin"],
  variable: "--font-driven-display",
  style: ["normal", "italic"],
  display: "swap",
});

const dmSans = DM_Sans({
  subsets: ["latin"],
  variable: "--font-driven-body",
  display: "swap",
});

const dmMono = DM_Mono({
  subsets: ["latin"],
  variable: "--font-driven-mono",
  display: "swap",
  weight: ["400", "500"],
});

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
    showManageOffers =
      userRow?.role === "reclamation_yard" || !!sellerProfile;
  }

  return (
    <div
      className={`${playfair.variable} ${dmSans.variable} ${dmMono.variable} min-h-screen bg-driven-paper text-driven-ink`}
    >
      <PropYardNav showManageOffers={showManageOffers} />
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        <div className="font-[family-name:var(--font-driven-body)] text-base leading-relaxed">{children}</div>
      </div>
    </div>
  );
}

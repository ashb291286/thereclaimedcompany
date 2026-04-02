import type { Metadata } from "next";
import { DM_Mono, DM_Sans, Playfair_Display } from "next/font/google";
import { DrivenNav } from "@/components/driven/DrivenNav";

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
    default: "Driven · Reclaimed | The Reclaimed Company",
    template: "%s | Driven · Reclaimed",
  },
  description:
    "Every car has a story. This is where it lives. Editorial vehicle passports, auctions, and provenance — Driven · Reclaimed.",
};

export default function DrivenLayout({ children }: { children: React.ReactNode }) {
  return (
    <div
      className={`${playfair.variable} ${dmSans.variable} ${dmMono.variable} min-h-screen bg-driven-paper text-driven-ink`}
    >
      <DrivenNav />
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        <div className="font-[family-name:var(--font-driven-body)] text-base leading-relaxed">{children}</div>
      </div>
    </div>
  );
}

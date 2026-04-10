import type { Metadata } from "next";
import { DrivenNav } from "@/components/driven/DrivenNav";

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
    <div className="min-h-screen bg-driven-paper text-driven-ink">
      <DrivenNav />
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        <div className="text-base leading-relaxed">{children}</div>
      </div>
    </div>
  );
}

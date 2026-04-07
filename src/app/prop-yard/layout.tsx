import type { Metadata } from "next";
import { PropYardNav } from "@/components/prop-yard/PropYardNav";

export const metadata: Metadata = {
  title: {
    default: "The Prop Yard | The Reclaimed Company",
    template: "%s | The Prop Yard",
  },
  description:
    "Hire authentic reclaimed pieces from UK reclamation yards for film, TV, and stills. Separate from marketplace sales — weekly hire, contracts, and logistics built for productions.",
};

export default function PropYardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gradient-to-b from-amber-50 via-stone-50 to-stone-100 text-zinc-900">
      <header className="border-b border-amber-900/10 bg-amber-100/40 backdrop-blur">
        <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-6 sm:px-6">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-amber-900/70">
                The Reclaimed Company
              </p>
              <h1 className="font-serif text-3xl font-semibold tracking-tight text-amber-950 sm:text-4xl">
                The Prop Yard
              </h1>
              <p className="mt-2 max-w-xl text-sm text-zinc-700">
                Business-to-business hire of yard stock for film &amp; TV — layered on your listings, not a
                second shopfront.
              </p>
            </div>
          </div>
          <PropYardNav />
        </div>
      </header>
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">{children}</div>
    </div>
  );
}

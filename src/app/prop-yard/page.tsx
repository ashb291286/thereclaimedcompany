import Link from "next/link";
import { PROP_YARD_RECOMMENDED_WEEKLY_RATE_OF_LIST_PRICE, PROP_YARD_TERMS_VERSION } from "@/lib/prop-yard";

export default function PropYardHomePage() {
  const pct = Math.round(PROP_YARD_RECOMMENDED_WEEKLY_RATE_OF_LIST_PRICE * 100);
  return (
    <div className="space-y-10">
      <section className="rounded-2xl border border-amber-900/10 bg-white/80 p-8 shadow-sm">
        <h2 className="text-xl font-semibold text-amber-950">For productions</h2>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-zinc-700">
          Search props drawn from real reclamation-yard inventory. Each hire is a{" "}
          <strong>rental transaction</strong> with agreed dates, fulfillment (collection / delivery / return),
          and acceptance of hire terms — separate from buying on the main marketplace.
        </p>
        <Link
          href="/prop-yard/search"
          className="mt-6 inline-flex rounded-full bg-amber-900 px-5 py-2.5 text-sm font-semibold text-amber-50 hover:bg-amber-950"
        >
          Search the Prop Yard
        </Link>
      </section>

      <section className="grid gap-6 md:grid-cols-2">
        <div className="rounded-2xl border border-amber-900/10 bg-white/80 p-6 shadow-sm">
          <h3 className="font-semibold text-amber-950">For reclamation yards</h3>
          <p className="mt-2 text-sm text-zinc-700">
            Opt in listings you already sell on Reclaimed. Set a <strong>weekly hire rate</strong> — we suggest{" "}
            <strong>{pct}% of your marketed list price per week</strong> as a starting point. Manage availability
            and blackout dates from your yard dashboard.
          </p>
          <Link
            href="/dashboard/prop-yard"
            className="mt-4 inline-block text-sm font-medium text-amber-900 underline hover:text-amber-950"
          >
            Open Prop Yard dashboard →
          </Link>
        </div>
        <div className="rounded-2xl border border-amber-900/10 bg-white/80 p-6 shadow-sm">
          <h3 className="font-semibold text-amber-950">Contracts &amp; logistics</h3>
          <p className="mt-2 text-sm text-zinc-700">
            Hirers confirm standard hire terms (v{PROP_YARD_TERMS_VERSION}) at request time. You agree collection,
            delivery, return, and any deposit or damage schedule directly with the production — we surface the
            workflow; formal agreements sit between yard and hirer.
          </p>
        </div>
      </section>
    </div>
  );
}

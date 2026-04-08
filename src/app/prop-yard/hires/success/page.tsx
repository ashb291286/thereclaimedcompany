import Link from "next/link";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { PropHirePayYards, type PropPayGroup } from "../PropHirePayYards";

type Props = {
  searchParams: Promise<{
    offerId?: string;
    sent?: string;
    yards?: string;
    batchId?: string;
    setId?: string;
    paid?: string;
    cancelled?: string;
  }>;
};

export default async function PropHireSuccessPage({ searchParams }: Props) {
  const session = await auth();
  const { offerId, sent, yards, batchId, setId, paid, cancelled } = await searchParams;

  let payGroups: PropPayGroup[] = [];
  if (batchId?.trim() && session?.user?.id) {
    const bookings = await prisma.propRentalBooking.findMany({
      where: { hireRequestBatchId: batchId.trim(), hirerId: session.user.id },
      include: {
        offer: {
          include: {
            listing: { include: { seller: { include: { sellerProfile: true } } } },
          },
        },
      },
    });
    const map = new Map<string, PropPayGroup>();
    for (const b of bookings) {
      const sid = b.offer.listing.sellerId;
      const displayName =
        b.offer.listing.seller.sellerProfile?.displayName ??
        b.offer.listing.seller.name ??
        "Supplier";
      if (!map.has(sid)) {
        map.set(sid, { sellerId: sid, displayName, totalPence: 0, allPaid: true });
      }
      const g = map.get(sid)!;
      g.totalPence += b.totalHirePence;
      if (!b.hirePaidAt) g.allPaid = false;
    }
    payGroups = [...map.values()];
  }

  const sentToLabel =
    payGroups.length > 0
      ? payGroups.map((g) => g.displayName).join(" · ")
      : yards && sent
        ? `${sent} request${sent === "1" ? "" : "s"} across ${yards} yard${yards === "1" ? "" : "s"}`
        : null;

  return (
    <div className="mx-auto max-w-lg rounded-2xl border border-driven-warm bg-white p-8 text-center shadow-sm">
      <h1 className="font-[family-name:var(--font-driven-display)] text-xl font-semibold text-driven-ink">
        {paid ? "Payment received" : "Hire requests sent"}
      </h1>
      <p className="mt-3 text-sm text-driven-muted">
        {paid
          ? "Thank you — your payment was processed securely through Stripe. The yard can see your paid hire request in their dashboard."
          : "Your set is unchanged so you can add more lines or send another batch. Complete payment below for each supplier — funds go to their connected account with our platform fee, same as marketplace sales."}
      </p>
      {cancelled ? (
        <p className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-950">Checkout cancelled — you can pay when you’re ready.</p>
      ) : null}
      {sentToLabel ? (
        <p className="mt-4 text-sm text-driven-ink">
          <span className="font-semibold">Sent to:</span> {sentToLabel}
        </p>
      ) : null}
      {sent && !paid ? (
        <p className="mt-2 text-xs text-driven-muted">
          {sent} hire request{sent === "1" ? "" : "s"} logged — pay each yard above to confirm with the platform.
        </p>
      ) : null}

      {batchId?.trim() && session?.user?.id && payGroups.length > 0 ? (
        <PropHirePayYards batchId={batchId.trim()} groups={payGroups} />
      ) : batchId?.trim() && !session?.user?.id ? (
        <p className="mt-4 text-sm text-driven-muted">
          <Link href="/auth/signin" className="font-medium text-driven-accent underline">
            Sign in
          </Link>{" "}
          to pay for this batch.
        </p>
      ) : null}

      <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-center">
        {setId?.trim() ? (
          <Link
            href={`/prop-yard/set/${encodeURIComponent(setId.trim())}`}
            className="rounded-lg border border-driven-ink bg-driven-ink px-4 py-2 font-[family-name:var(--font-driven-mono)] text-xs font-semibold uppercase tracking-wide text-driven-paper hover:bg-driven-accent"
          >
            Back to set
          </Link>
        ) : null}
        {offerId ? (
          <Link
            href={`/prop-yard/offers/${offerId}`}
            className="rounded-lg border border-driven-warm px-4 py-2 text-sm font-medium text-driven-ink hover:bg-driven-accent-light/40"
          >
            Back to prop
          </Link>
        ) : null}
        <Link
          href="/prop-yard/search"
          className="rounded-lg border border-driven-warm px-4 py-2 text-sm font-medium text-driven-ink hover:bg-driven-accent-light/40"
        >
          Find more props
        </Link>
      </div>
    </div>
  );
}

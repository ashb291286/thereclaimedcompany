import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getAuctionDetail } from "@/app/driven/_lib/get-auction-detail";
import { DrivenAuctionActions } from "@/components/driven/DrivenAuctionActions";
import { DrivenCountdown } from "@/components/driven/DrivenCountdown";
import { DrivenInspectionCard } from "@/components/driven/DrivenInspectionCard";
import { DrivenLineageTimeline } from "@/components/driven/DrivenLineageTimeline";
import { DrivenPassportCompleteness } from "@/components/driven/DrivenPassportCompleteness";
import { DrivenValueTracker } from "@/components/driven/DrivenValueTracker";

function pounds(pence: number): string {
  return `£${(pence / 100).toLocaleString("en-GB", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const detail = await getAuctionDetail(id);
  if (!detail) return { title: "Auction" };
  return {
    title: detail.data.title,
    description: `${detail.data.specLine} · ${detail.data.registration}`,
  };
}

export default async function DrivenAuctionDetailPage({ params }: Props) {
  const { id } = await params;
  const result = await getAuctionDetail(id);
  if (!result) notFound();

  const d = result.data;
  const lineageSorted = [...d.lineage].sort((a, b) => b.date.getTime() - a.date.getTime());

  return (
    <div>
      <nav className="font-[family-name:var(--font-driven-mono)] text-[10px] uppercase tracking-wide text-driven-muted">
        <Link href="/driven/auctions" className="hover:text-driven-ink">
          Auctions
        </Link>
        <span className="mx-2">/</span>
        <span className="text-driven-ink">{d.registration}</span>
      </nav>

      <header className="mt-6 border border-driven-warm bg-white px-6 py-8 sm:px-10">
        <p className="font-[family-name:var(--font-driven-mono)] text-[10px] uppercase tracking-[0.25em] text-driven-accent">
          {d.sellerType === "DEALER" ? "Dealer consignment" : "Private party"}
          <span className="mx-2 text-driven-warm">·</span>
          Title {d.titleStatus.toLowerCase().replace("_", " ")}
        </p>
        <h1 className="mt-3 font-[family-name:var(--font-driven-display)] text-3xl font-semibold sm:text-4xl">{d.title}</h1>
        <p className="mt-2 text-driven-muted">{d.specLine}</p>
        <p className="mt-4 font-[family-name:var(--font-driven-mono)] text-sm text-driven-ink">
          {d.registration}
          {d.mileage != null ? ` · ${d.mileage.toLocaleString()} mi` : ""}
        </p>
        <p className="mt-2 font-[family-name:var(--font-driven-mono)] text-xs text-driven-muted">Reclaimed ID {d.reclaimedPublicId}</p>

        <div className="mt-8 flex flex-wrap items-end gap-8 border-t border-driven-warm pt-8">
          <div>
            <p className="font-[family-name:var(--font-driven-mono)] text-[10px] uppercase text-driven-muted">Current bid</p>
            <p className="mt-1 font-[family-name:var(--font-driven-display)] text-3xl text-driven-ink">{pounds(d.currentBid)}</p>
            <p className="mt-1 font-[family-name:var(--font-driven-mono)] text-xs text-driven-muted">
              {d.bidCount} bids · {d.watcherCount} watching
            </p>
          </div>
          <div>
            <p className="font-[family-name:var(--font-driven-mono)] text-[10px] uppercase text-driven-muted">Reserve</p>
            <p className="mt-1 font-[family-name:var(--font-driven-display)] text-xl text-driven-ink">{pounds(d.reservePrice)}</p>
            <p className="mt-1 text-xs text-driven-muted">Set by the seller, not by us.</p>
          </div>
          <div>
            <p className="font-[family-name:var(--font-driven-mono)] text-[10px] uppercase text-driven-muted">Ends in</p>
            <p className="mt-1">
              <DrivenCountdown endsAtIso={d.endsAt.toISOString()} />
            </p>
          </div>
        </div>

        <div className="mt-8 flex flex-wrap gap-3">
          <span className="font-[family-name:var(--font-driven-mono)] text-[10px] uppercase tracking-wide ring-1 ring-driven-warm bg-driven-accent-light/50 px-3 py-1 text-driven-ink">
            Passport transfers
          </span>
          <span className="font-[family-name:var(--font-driven-mono)] text-[10px] uppercase tracking-wide ring-1 ring-driven-warm bg-driven-accent-light/50 px-3 py-1 text-driven-ink">
            Title in escrow
          </span>
          {d.inspection ? (
            <span className="font-[family-name:var(--font-driven-mono)] text-[10px] uppercase tracking-wide ring-1 ring-driven-warm bg-driven-accent-light/50 px-3 py-1 text-driven-ink">
              {d.inspectionIsSelfAssessment ? "Owner self-assessment" : "Inspection on file"}
            </span>
          ) : (
            <span className="font-[family-name:var(--font-driven-mono)] text-[10px] uppercase tracking-wide ring-1 ring-driven-warm bg-driven-warm px-3 py-1 text-driven-muted">
              No inspection scores
            </span>
          )}
        </div>
      </header>

      <div className="mt-10 grid gap-8 lg:grid-cols-[1fr_320px]">
        <div className="space-y-8">
          <DrivenLineageTimeline entries={lineageSorted} />
          <section className="border border-driven-warm bg-white px-5 py-6">
            <h2 className="font-[family-name:var(--font-driven-display)] text-xl italic text-driven-ink">
              Questions &amp; comments
            </h2>
            <p className="mt-3 text-sm text-driven-muted">
              Buyer questions, comments, and seller replies aren&apos;t available on auctions yet — we&apos;ll add a
              threaded Q&amp;A area in a future release.
            </p>
          </section>
        </div>

        <aside className="space-y-6">
          <DrivenAuctionActions />
          {d.inspection ? (
            <DrivenInspectionCard
              scores={d.inspection}
              footnote={
                d.inspectionIsSelfAssessment
                  ? "These scores reflect the seller's personal opinion only and are not a professional inspection. An independent inspection is recommended."
                  : undefined
              }
            />
          ) : null}
          <DrivenValueTracker valuations={d.valuations} todayEstimate={d.currentBid} />
          <DrivenPassportCompleteness score={d.passportScore} />
          <div className="border border-driven-warm bg-white p-5">
            <h2 className="font-[family-name:var(--font-driven-mono)] text-[10px] uppercase tracking-[0.2em] text-driven-muted">
              Public passport
            </h2>
            <p className="mt-3 text-sm text-driven-muted">
              Anyone can view this vehicle&apos;s Reclaimed record without an account.
            </p>
            <Link
              href={`/driven/lineage/${d.vehicleId}`}
              className="mt-4 inline-block font-[family-name:var(--font-driven-mono)] text-xs uppercase tracking-wide text-driven-accent underline"
            >
              Open passport →
            </Link>
          </div>
        </aside>
      </div>
    </div>
  );
}

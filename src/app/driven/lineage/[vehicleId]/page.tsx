import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { prisma } from "@/lib/db";
import { getMockAuctionDetail, MOCK_VEHICLE_ID, type MockLineageRow } from "@/app/driven/_lib/mock-auction";
import { DrivenLineageTimeline } from "@/components/driven/DrivenLineageTimeline";
import { DrivenPassportCompleteness } from "@/components/driven/DrivenPassportCompleteness";
import { DrivenPassportDvlaSnapshot } from "@/components/driven/DrivenPassportDvlaSnapshot";
import { demoDvlaSnapshotForRegistration } from "@/lib/driven-dvla-demo-snapshot";

type Props = { params: Promise<{ vehicleId: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { vehicleId } = await params;
  if (vehicleId === MOCK_VEHICLE_ID) {
    const m = getMockAuctionDetail();
    return {
      title: `${m.year} ${m.make} ${m.model}`,
      description: `Sample Reclaimed passport · ${m.registration}`,
    };
  }
  const v = await prisma.drivenVehicle.findUnique({
    where: { id: vehicleId },
    select: { year: true, make: true, model: true, registration: true },
  });
  if (!v) return { title: "Passport" };
  return {
    title: `${v.year} ${v.make} ${v.model}`,
    description: `Reclaimed passport · ${v.registration}`,
  };
}

export default async function DrivenLineagePublicPage({ params }: Props) {
  const { vehicleId } = await params;

  if (vehicleId === MOCK_VEHICLE_ID) {
    const mock = getMockAuctionDetail();
    const entries: MockLineageRow[] = [...mock.lineage].sort(
      (a, b) => b.date.getTime() - a.date.getTime()
    );
    return (
      <div>
        <nav className="font-[family-name:var(--font-driven-mono)] text-[10px] uppercase tracking-wide text-driven-muted">
          <Link href="/driven" className="hover:text-driven-ink">
            Driven
          </Link>
          <span className="mx-2">/</span>
          <span className="text-driven-ink">Passport</span>
        </nav>
        <p className="mt-4 font-[family-name:var(--font-driven-mono)] text-[10px] uppercase tracking-wide text-driven-accent">
          Sample vehicle · curated demo
        </p>
        <header className="mt-2 border border-driven-warm bg-white px-6 py-8">
          <p className="font-[family-name:var(--font-driven-mono)] text-[10px] uppercase tracking-[0.25em] text-driven-accent">
            Driven · Reclaimed
          </p>
          <h1 className="mt-3 font-[family-name:var(--font-driven-display)] text-3xl font-semibold sm:text-4xl">
            {mock.year} {mock.make} {mock.model}
          </h1>
          <p className="mt-2 font-[family-name:var(--font-driven-mono)] text-sm text-driven-muted">{mock.registration}</p>
          <p className="mt-1 font-[family-name:var(--font-driven-mono)] text-xs text-driven-ink">{mock.reclaimedPublicId}</p>
        </header>
        <div className="mt-10 grid gap-8 lg:grid-cols-[1fr_280px]">
          <div className="space-y-8">
            <DrivenPassportDvlaSnapshot snapshot={demoDvlaSnapshotForRegistration(mock.registration)} />
            <DrivenLineageTimeline entries={entries} />
          </div>
          <aside>
            <DrivenPassportCompleteness score={mock.passportScore} />
            <div className="mt-6 border border-driven-warm bg-white p-5">
              <p className="text-xs text-driven-muted">
                Demo passport — same layout as live vehicles. Open the{" "}
                <Link href={`/driven/auctions/${mock.auctionId}`} className="font-medium text-driven-accent underline">
                  sample auction
                </Link>{" "}
                to see the full listing.
              </p>
            </div>
          </aside>
        </div>
      </div>
    );
  }

  const vehicle = await prisma.drivenVehicle.findUnique({
    where: { id: vehicleId },
    include: {
      lineageEntries: {
        orderBy: { date: "desc" },
        include: { documents: true },
      },
    },
  });

  if (!vehicle) notFound();

  const entries: MockLineageRow[] = vehicle.lineageEntries.map((e) => ({
    id: e.id,
    date: e.date,
    mileageAtTime: e.mileageAtTime,
    category: e.category,
    title: e.title,
    description: e.description,
    documents: e.documents.map((d) => ({ label: d.fileName, type: d.type })),
  }));

  return (
    <div>
      <nav className="font-[family-name:var(--font-driven-mono)] text-[10px] uppercase tracking-wide text-driven-muted">
        <Link href="/driven" className="hover:text-driven-ink">
          Driven
        </Link>
        <span className="mx-2">/</span>
        <span className="text-driven-ink">Passport</span>
      </nav>

      <header className="mt-6 border border-driven-warm bg-white px-6 py-8">
        <p className="font-[family-name:var(--font-driven-mono)] text-[10px] uppercase tracking-[0.25em] text-driven-accent">
          Driven · Reclaimed
        </p>
        <h1 className="mt-3 font-[family-name:var(--font-driven-display)] text-3xl font-semibold sm:text-4xl">
          {vehicle.year} {vehicle.make} {vehicle.model}
        </h1>
        <p className="mt-2 font-[family-name:var(--font-driven-mono)] text-sm text-driven-muted">{vehicle.registration}</p>
        <p className="mt-1 font-[family-name:var(--font-driven-mono)] text-xs text-driven-ink">{vehicle.reclaimedPublicId}</p>
        {vehicle.imageUrls.length > 0 ? (
          <div className="mt-6 flex gap-2 overflow-x-auto pb-1">
            {vehicle.imageUrls.map((url) => (
              <div key={url} className="h-24 w-36 shrink-0 overflow-hidden border border-driven-warm bg-driven-warm">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={url} alt="" className="h-full w-full object-cover" />
              </div>
            ))}
          </div>
        ) : null}
      </header>

      <div className="mt-10 grid gap-8 lg:grid-cols-[1fr_280px]">
        <div className="space-y-8">
          <DrivenPassportDvlaSnapshot snapshot={vehicle.dvlaSnapshotJson} />
          {entries.length === 0 ? (
            <div className="border border-driven-warm bg-white p-10 text-center">
              <p className="font-[family-name:var(--font-driven-display)] text-xl italic text-driven-ink">No entries yet</p>
              <p className="mt-3 text-sm text-driven-muted">
                The owner has not published history for this vehicle on Reclaimed.
              </p>
            </div>
          ) : (
            <DrivenLineageTimeline entries={entries} />
          )}
        </div>
        <aside>
          <DrivenPassportCompleteness score={vehicle.passportScore} />
          <div className="mt-6 border border-driven-warm bg-white p-5">
            <p className="text-xs text-driven-muted">
              This is a read-only public view. Documents listed are references from the owner&apos;s record.
            </p>
          </div>
        </aside>
      </div>
    </div>
  );
}

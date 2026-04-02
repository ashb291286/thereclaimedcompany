import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { prisma } from "@/lib/db";
import type { MockLineageRow } from "@/app/driven/_lib/mock-auction";
import { DrivenLineageTimeline } from "@/components/driven/DrivenLineageTimeline";
import { DrivenPassportCompleteness } from "@/components/driven/DrivenPassportCompleteness";

type Props = { params: Promise<{ vehicleId: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { vehicleId } = await params;
  const v = await prisma.drivenVehicle.findUnique({
    where: { id: vehicleId },
    select: { year: true, make: true, model: true, registration: true },
  });
  if (!v) return { title: "Passport" };
  return {
    title: `${v.year} ${v.make} ${v.model}`,
    description: `Lineage passport · ${v.registration}`,
  };
}

export default async function DrivenLineagePublicPage({ params }: Props) {
  const { vehicleId } = await params;
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
          Driven · Lineage
        </p>
        <h1 className="mt-3 font-[family-name:var(--font-driven-display)] text-3xl font-semibold sm:text-4xl">
          {vehicle.year} {vehicle.make} {vehicle.model}
        </h1>
        <p className="mt-2 font-[family-name:var(--font-driven-mono)] text-sm text-driven-muted">{vehicle.registration}</p>
      </header>

      <div className="mt-10 grid gap-8 lg:grid-cols-[1fr_280px]">
        {entries.length === 0 ? (
          <div className="border border-driven-warm bg-white p-10 text-center">
            <p className="font-[family-name:var(--font-driven-display)] text-xl italic text-driven-ink">No entries yet</p>
            <p className="mt-3 text-sm text-driven-muted">
              The owner has not published history for this vehicle on Lineage.
            </p>
          </div>
        ) : (
          <DrivenLineageTimeline entries={entries} />
        )}
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

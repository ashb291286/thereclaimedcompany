import Link from "next/link";
import { notFound } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";

type Props = { params: Promise<{ vehicleId: string }> };

export default async function DrivenGarageRecordPage({ params }: Props) {
  const { vehicleId } = await params;
  const session = await auth();
  if (!session?.user?.id) notFound();

  const vehicle = await prisma.drivenVehicle.findUnique({
    where: { id: vehicleId },
    include: {
      lineageEntries: {
        orderBy: { date: "desc" },
        include: { _count: { select: { documents: true } } },
      },
    },
  });

  if (!vehicle || vehicle.ownerId !== session.user.id) notFound();

  return (
    <div>
      <nav className="font-[family-name:var(--font-driven-mono)] text-[10px] uppercase tracking-wide text-driven-muted">
        <Link href="/driven/garage" className="hover:text-driven-ink">
          Garage
        </Link>
        <span className="mx-2">/</span>
        <span className="text-driven-ink">{vehicle.registration}</span>
        <span className="mx-2">/</span>
        <span className="text-driven-ink">Record</span>
      </nav>

      <header className="mt-6 flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0">
          <h1 className="font-[family-name:var(--font-driven-display)] text-3xl italic text-driven-ink">
            {vehicle.year} {vehicle.make} {vehicle.model}
          </h1>
          <p className="mt-1 font-[family-name:var(--font-driven-mono)] text-sm text-driven-muted">{vehicle.registration}</p>
          <p className="mt-1 font-[family-name:var(--font-driven-mono)] text-xs text-driven-ink">{vehicle.reclaimedPublicId}</p>
          {vehicle.imageUrls.length > 0 ? (
            <div className="mt-4 flex gap-2 overflow-x-auto pb-1">
              {vehicle.imageUrls.map((url) => (
                <div key={url} className="h-20 w-28 shrink-0 overflow-hidden border border-driven-warm bg-driven-warm">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={url} alt="" className="h-full w-full object-cover" />
                </div>
              ))}
            </div>
          ) : null}
        </div>
        <div className="flex flex-wrap gap-3">
          <Link
            href={`/driven/garage/${vehicleId}/upload`}
            className="border border-driven-ink bg-driven-ink px-4 py-2 font-[family-name:var(--font-driven-mono)] text-[10px] uppercase tracking-wide text-driven-paper"
          >
            New entry + upload
          </Link>
          <Link
            href={`/driven/lineage/${vehicleId}`}
            className="border border-driven-warm px-4 py-2 font-[family-name:var(--font-driven-mono)] text-[10px] uppercase tracking-wide text-driven-ink"
          >
            Public passport
          </Link>
        </div>
      </header>

      <ul className="mt-10 space-y-3">
        {vehicle.lineageEntries.map((e) => (
          <li key={e.id} className="border border-driven-warm bg-white px-5 py-4">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="font-[family-name:var(--font-driven-mono)] text-xs text-driven-muted">
                  {e.date.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                  {e.mileageAtTime != null ? ` · ${e.mileageAtTime.toLocaleString()} mi` : ""}
                  <span className="ml-2 text-[10px] uppercase">{e.category.replaceAll("_", " ")}</span>
                </p>
                <h2 className="mt-1 font-[family-name:var(--font-driven-display)] text-lg text-driven-ink">{e.title}</h2>
                {e.description ? <p className="mt-2 text-sm text-driven-muted">{e.description}</p> : null}
                <p className="mt-2 font-[family-name:var(--font-driven-mono)] text-[10px] uppercase text-driven-muted">
                  {e._count.documents} document{e._count.documents === 1 ? "" : "s"}
                </p>
              </div>
              <Link
                href={`/driven/garage/${vehicleId}/upload?entryId=${encodeURIComponent(e.id)}`}
                className="shrink-0 font-[family-name:var(--font-driven-mono)] text-[10px] uppercase tracking-wide text-driven-accent underline"
              >
                Add documents
              </Link>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

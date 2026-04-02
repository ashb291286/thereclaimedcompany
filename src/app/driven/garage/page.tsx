import Link from "next/link";
import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";

const REL_LABEL: Record<string, string> = {
  OWNED: "Owned",
  WATCHING: "Watching",
  SOLD: "Sold",
};

type Props = { searchParams?: Promise<{ error?: string }> };

export default async function DrivenGaragePage({ searchParams }: Props) {
  const session = await auth();
  if (!session?.user?.id) redirect("/auth/signin?callbackUrl=/driven/garage");

  const sp = searchParams ? await searchParams : {};
  const listError =
    sp.error === "auction-missing-fields"
      ? "Something went wrong starting an auction. Open the vehicle and try again from List for auction."
      : null;

  const rows = await prisma.drivenGarageEntry.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "desc" },
    include: {
      vehicle: {
        select: {
          id: true,
          registration: true,
          make: true,
          model: true,
          year: true,
          passportScore: true,
          reclaimedPublicId: true,
          imageUrls: true,
          status: true,
          auction: { select: { id: true } },
        },
      },
    },
  });

  return (
    <div>
      {listError ? (
        <p className="mb-6 font-[family-name:var(--font-driven-mono)] text-xs text-driven-accent">{listError}</p>
      ) : null}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-[family-name:var(--font-driven-display)] text-3xl italic text-driven-ink">Your garage</h1>
          <p className="mt-2 max-w-xl text-sm text-driven-muted">
            Vehicles you own, watch, or have sold on Driven · Reclaimed. Add a car to start its passport.
          </p>
        </div>
        <Link
          href="/driven/garage/add"
          className="border border-driven-ink bg-driven-ink px-5 py-2.5 font-[family-name:var(--font-driven-mono)] text-xs uppercase tracking-wide text-driven-paper hover:bg-driven-accent"
        >
          Add a car
        </Link>
      </div>

      {rows.length === 0 ? (
        <div className="mt-12 border border-driven-warm bg-white p-12 text-center">
          <p className="font-[family-name:var(--font-driven-display)] text-xl italic">Garage is empty</p>
          <p className="mt-3 text-sm text-driven-muted">Register a vehicle to build its Reclaimed record.</p>
          <Link
            href="/driven/garage/add"
            className="mt-6 inline-block font-[family-name:var(--font-driven-mono)] text-xs uppercase text-driven-accent underline"
          >
            Add your first car
          </Link>
        </div>
      ) : (
        <ul className="mt-10 grid gap-4 sm:grid-cols-2">
          {rows.map((g) => {
            const v = g.vehicle;
            const rel = REL_LABEL[g.relationship] ?? g.relationship;
            const tone =
              g.relationship === "SOLD"
                ? "border-driven-muted bg-driven-accent-light/20"
                : g.relationship === "WATCHING"
                  ? "border-driven-warm bg-white"
                  : "border-driven-warm bg-white";
            const thumb = v.imageUrls[0];
            const canListAuction =
              g.relationship === "OWNED" && v.status === "PRIVATE" && !v.auction;
            return (
              <li key={g.id} className={`border ${tone}`}>
                <div className="flex flex-col gap-4 p-5 sm:flex-row sm:items-stretch">
                  {thumb ? (
                    <div className="relative h-28 w-full shrink-0 overflow-hidden border border-driven-warm bg-driven-warm sm:h-auto sm:w-40">
                      {/* eslint-disable-next-line @next/next/no-img-element -- blob / external URLs */}
                      <img src={thumb} alt="" className="h-full w-full object-cover" />
                    </div>
                  ) : null}
                  <div className="min-w-0 flex-1">
                    <p className="font-[family-name:var(--font-driven-mono)] text-[10px] uppercase tracking-wide text-driven-accent">
                      {rel}
                    </p>
                    <p className="mt-2 font-[family-name:var(--font-driven-display)] text-xl text-driven-ink">
                      {v.year} {v.make} {v.model}
                    </p>
                    <p className="mt-1 font-[family-name:var(--font-driven-mono)] text-xs text-driven-muted">{v.registration}</p>
                    <p className="mt-1 font-[family-name:var(--font-driven-mono)] text-[10px] uppercase text-driven-muted">
                      {v.reclaimedPublicId}
                    </p>
                    <p className="mt-3 text-xs text-driven-muted">Passport {v.passportScore}/100</p>
                    <div className="mt-4 flex flex-wrap gap-3 font-[family-name:var(--font-driven-mono)] text-[10px] uppercase tracking-wide">
                      <Link href={`/driven/lineage/${v.id}`} className="text-driven-accent underline">
                        View passport
                      </Link>
                      {g.relationship === "OWNED" ? (
                        <>
                          <Link href={`/driven/garage/${v.id}/record`} className="text-driven-ink underline">
                            Record
                          </Link>
                          <Link href={`/driven/garage/${v.id}/upload`} className="text-driven-ink underline">
                            Add entry
                          </Link>
                          {canListAuction ? (
                            <Link href={`/driven/garage/${v.id}/auction`} className="text-driven-ink underline">
                              List for auction
                            </Link>
                          ) : v.auction ? (
                            <Link href={`/driven/auctions/${v.auction.id}`} className="text-driven-ink underline">
                              View auction
                            </Link>
                          ) : null}
                        </>
                      ) : null}
                    </div>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

import Link from "next/link";
import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";

const REL_LABEL: Record<string, string> = {
  OWNED: "Owned",
  WATCHING: "Watching",
  SOLD: "Sold",
};

export default async function DrivenGaragePage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/auth/signin?callbackUrl=/driven/garage");

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
        },
      },
    },
  });

  return (
    <div>
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
            return (
              <li key={g.id} className={`border ${tone}`}>
                <div className="p-5">
                  <p className="font-[family-name:var(--font-driven-mono)] text-[10px] uppercase tracking-wide text-driven-accent">
                    {rel}
                  </p>
                  <p className="mt-2 font-[family-name:var(--font-driven-display)] text-xl text-driven-ink">
                    {v.year} {v.make} {v.model}
                  </p>
                  <p className="mt-1 font-[family-name:var(--font-driven-mono)] text-xs text-driven-muted">{v.registration}</p>
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
                      </>
                    ) : null}
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

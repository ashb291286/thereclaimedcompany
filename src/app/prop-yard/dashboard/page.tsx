import Link from "next/link";
import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";

export default async function PropYardUserDashboardPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/auth/signin?callbackUrl=/prop-yard/dashboard");

  const [basketCount, myRequests, asYardOffers, me] = await Promise.all([
    prisma.propRentalBasketItem.count({ where: { userId: session.user.id } }),
    prisma.propRentalBooking.findMany({
      where: { hirerId: session.user.id },
      include: { offer: { include: { listing: true } } },
      orderBy: { createdAt: "desc" },
      take: 24,
    }),
    prisma.propRentalOffer.count({ where: { listing: { sellerId: session.user.id } } }),
    prisma.user.findUnique({ where: { id: session.user.id }, select: { role: true } }),
  ]);

  const isYard = me?.role === "reclamation_yard";

  return (
    <div>
      <h2 className="text-2xl font-semibold text-amber-950">Prop Yard dashboard</h2>
      <p className="mt-2 text-sm text-zinc-600">
        Track your hire requests as a shopper, and jump to yard tools when you supply props.
      </p>

      <div className="mt-6 grid gap-4 md:grid-cols-3">
        <div className="rounded-xl border border-zinc-200 bg-white p-4">
          <p className="text-xs uppercase tracking-wide text-zinc-500">Basket</p>
          <p className="mt-1 text-2xl font-semibold text-zinc-900">{basketCount}</p>
          <Link href="/prop-yard/basket" className="mt-2 inline-block text-sm text-amber-900 underline">
            Open basket
          </Link>
        </div>
        <div className="rounded-xl border border-zinc-200 bg-white p-4">
          <p className="text-xs uppercase tracking-wide text-zinc-500">My requests</p>
          <p className="mt-1 text-2xl font-semibold text-zinc-900">{myRequests.length}</p>
          <Link href="/prop-yard/search" className="mt-2 inline-block text-sm text-amber-900 underline">
            Find props
          </Link>
        </div>
        <div className="rounded-xl border border-zinc-200 bg-white p-4">
          <p className="text-xs uppercase tracking-wide text-zinc-500">My yard offers</p>
          <p className="mt-1 text-2xl font-semibold text-zinc-900">{asYardOffers}</p>
          {isYard ? (
            <Link href="/dashboard/prop-yard" className="mt-2 inline-block text-sm text-amber-900 underline">
              Open yard controls
            </Link>
          ) : (
            <span className="mt-2 inline-block text-xs text-zinc-500">Yard account required</span>
          )}
        </div>
      </div>

      <section className="mt-8 rounded-xl border border-zinc-200 bg-white p-5">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-zinc-500">Recent hire requests</h3>
        {myRequests.length === 0 ? (
          <p className="mt-3 text-sm text-zinc-600">No hire requests sent yet.</p>
        ) : (
          <ul className="mt-3 divide-y divide-zinc-100">
            {myRequests.map((r) => (
              <li key={r.id} className="py-3 text-sm">
                <p className="font-medium text-zinc-900">{r.offer.listing.title}</p>
                <p className="text-zinc-600">
                  {r.hireStart.toLocaleDateString("en-GB")} → {r.hireEnd.toLocaleDateString("en-GB")} ·{" "}
                  {r.status.toLowerCase()} · £{(r.totalHirePence / 100).toFixed(2)}
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

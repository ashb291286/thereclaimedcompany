import { auth } from "@/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/db";

export default async function OrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ session_id?: string; collected?: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect("/auth/signin");
  const { session_id, collected } = await searchParams;

  const orders = await prisma.order.findMany({
    where: { buyerId: session.user.id, status: "paid" },
    orderBy: { createdAt: "desc" },
    take: 40,
    include: { listing: { select: { id: true, title: true, status: true } } },
  });

  const totalCarbonKg = orders.reduce((s, o) => s + (o.purchaseCarbonSavedKg ?? 0), 0);
  const totalWasteKg = orders.reduce((s, o) => s + (o.purchaseWasteDivertedKg ?? 0), 0);
  const showImpact = totalCarbonKg > 0 || totalWasteKg > 0;

  return (
    <div>
      <h1 className="text-2xl font-semibold text-zinc-900">Orders</h1>

      {session_id ? (
        <p className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50/90 px-4 py-3 text-sm text-emerald-950">
          Thank you for your purchase. Your payment was received — the seller will be in touch about collection or
          delivery.
        </p>
      ) : null}
      {collected === "1" ? (
        <p className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50/90 px-4 py-3 text-sm text-emerald-950">
          Collection confirmed. Enjoy your reclaimed item.
        </p>
      ) : null}

      {showImpact ? (
        <div className="mt-6 rounded-2xl border border-emerald-200/80 bg-gradient-to-br from-emerald-50 via-white to-teal-50/90 p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-emerald-800/90">Your impact (purchases)</p>
          <p className="mt-2 text-sm text-zinc-800">
            <strong>{totalCarbonKg.toLocaleString(undefined, { maximumFractionDigits: 1 })} kg</strong> CO₂e estimated
            avoided vs new production
            {totalWasteKg > 0 ? (
              <>
                {" "}
                · <strong>{totalWasteKg.toLocaleString(undefined, { maximumFractionDigits: 1 })} kg</strong> mass kept
                in use
              </>
            ) : null}
          </p>
          <Link
            href="/dashboard/certificate"
            className="mt-3 inline-block text-sm font-medium text-emerald-800 underline hover:text-emerald-950"
          >
            View printable certificate
          </Link>
        </div>
      ) : null}

      <h2 className="mt-8 text-sm font-semibold uppercase tracking-wide text-zinc-500">Recent purchases</h2>
      {orders.length === 0 ? (
        <p className="mt-3 text-sm text-zinc-600">
          No completed orders yet.{" "}
          <Link href="/search" className="font-medium text-brand hover:underline">
            Browse listings
          </Link>
        </p>
      ) : (
        <ul className="mt-3 space-y-3">
          {orders.map((o) => (
            <li
              key={o.id}
              className="flex flex-wrap items-start justify-between gap-2 rounded-xl border border-zinc-200 bg-white p-4"
            >
              <div>
                {o.listing.status === "active" ? (
                  <Link
                    href={`/listings/${o.listing.id}`}
                    className="font-medium text-zinc-900 hover:underline"
                  >
                    {o.listing.title}
                  </Link>
                ) : (
                  <span className="font-medium text-zinc-900">{o.listing.title}</span>
                )}
                <p className="text-xs text-zinc-500">
                  {o.createdAt.toLocaleDateString("en-GB", { dateStyle: "medium" })}
                  {o.quantity > 1 ? ` · ×${o.quantity}` : ""}
                  {o.amount > 0 ? ` · £${(o.amount / 100).toFixed(2)}` : " · Free collection"}
                </p>
                {o.purchaseCarbonSavedKg != null && o.purchaseCarbonSavedKg > 0 ? (
                  <p className="mt-1 text-xs text-emerald-800">
                    ~{o.purchaseCarbonSavedKg.toLocaleString(undefined, { maximumFractionDigits: 1 })} kg CO₂e saved
                    (estimate)
                  </p>
                ) : null}
              </div>
            </li>
          ))}
        </ul>
      )}

      <Link href="/" className="mt-8 inline-block text-sm font-medium text-brand hover:underline">
        Continue shopping
      </Link>
    </div>
  );
}

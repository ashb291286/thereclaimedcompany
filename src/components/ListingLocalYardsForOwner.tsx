import Link from "next/link";
import { prisma } from "@/lib/db";
import { formatMiles } from "@/lib/geo";

export async function ListingLocalYardsForOwner({
  listingId,
  notifyLocalYards,
}: {
  listingId: string;
  notifyLocalYards: boolean;
}) {
  if (!notifyLocalYards) return null;

  const alerts = await prisma.listingLocalYardAlert.findMany({
    where: { listingId },
    include: {
      yardUser: {
        include: {
          sellerProfile: { select: { displayName: true, businessName: true } },
        },
      },
      linkedOffer: { select: { id: true, offeredPrice: true, status: true } },
    },
    orderBy: { createdAt: "asc" },
  });

  if (alerts.length === 0) {
    return (
      <section className="rounded-2xl border border-emerald-200/80 bg-emerald-50/40 p-5 shadow-sm sm:p-6">
        <h2 className="text-sm font-semibold text-zinc-900">Local reclamation yards</h2>
        <p className="mt-2 text-sm text-zinc-600">
          You opted in to notify yards within 50 miles. None with a location on file are in range yet — try
          again after more yards join, or check back when you update the item postcode.
        </p>
      </section>
    );
  }

  function yardLabel(a: (typeof alerts)[0]): string {
    const sp = a.yardUser.sellerProfile;
    return sp?.businessName?.trim() || sp?.displayName || a.yardUser.name || a.yardUser.email || "Yard";
  }

  return (
    <section className="rounded-2xl border border-emerald-200/80 bg-emerald-50/40 p-5 shadow-sm sm:p-6">
      <h2 className="text-sm font-semibold text-zinc-900">Local reclamation yards (50 mi)</h2>
      <p className="mt-1 text-xs text-zinc-600">
        Only you see this. Yards were pinged when you published with &quot;Offer to local reclamation
        yards&quot; on.
      </p>

      <ul className="mt-4 space-y-3">
        {alerts.map((a) => {
          const label = yardLabel(a);
          const dist =
            a.distanceMiles != null ? (
              <span className="text-zinc-500"> · {formatMiles(a.distanceMiles)}</span>
            ) : null;

          if (a.status === "DECLINED") {
            return (
              <li
                key={a.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-zinc-200 bg-white/90 px-3 py-2 text-sm"
              >
                <span className="font-medium text-zinc-800">
                  {label}
                  {dist}
                </span>
                <span className="rounded-full bg-zinc-200 px-2 py-0.5 text-xs font-medium text-zinc-700">
                  Passed
                </span>
              </li>
            );
          }

          if (a.linkedOffer) {
            const o = a.linkedOffer;
            return (
              <li
                key={a.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-zinc-200 bg-white/90 px-3 py-2 text-sm"
              >
                <span className="font-medium text-zinc-800">
                  {label}
                  {dist}
                </span>
                <span className="text-zinc-700">
                  Offer £{(o.offeredPrice / 100).toFixed(2)} —{" "}
                  <span className="font-medium capitalize">{o.status}</span>
                </span>
              </li>
            );
          }

          return (
            <li
              key={a.id}
              className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-amber-200/90 bg-amber-50/80 px-3 py-2 text-sm"
            >
              <span className="flex items-center gap-2 font-medium text-zinc-800">
                <span
                  className="inline-flex h-2 w-2 shrink-0 rounded-full bg-amber-500 animate-pulse"
                  aria-hidden
                />
                {label}
                {dist}
              </span>
              <span className="text-xs font-medium text-amber-900">Waiting for response</span>
            </li>
          );
        })}
      </ul>

      <p className="mt-4 text-xs text-zinc-500">
        Manage incoming offers in{" "}
        <Link href="/dashboard/offers" className="font-medium text-brand hover:underline">
          Dashboard → Offers
        </Link>
        .
      </p>
    </section>
  );
}

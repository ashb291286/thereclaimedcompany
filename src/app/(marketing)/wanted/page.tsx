import { prisma } from "@/lib/db";
import Link from "next/link";

export default async function WantedListPage() {
  const ads = await prisma.wantedAd.findMany({
    where: { status: "active" },
    orderBy: { createdAt: "desc" },
    take: 50,
    include: { category: true },
  });

  return (
    <div className="pb-12">
      <h1 className="text-2xl font-semibold text-zinc-900">Wanted</h1>
      <p className="mt-2 max-w-2xl text-sm text-zinc-600">
        Buyers post what they need. Sellers and yards get notified so they can list matching stock with a price.
      </p>
      <p className="mt-4 text-sm">
        <Link href="/dashboard/wanted/new" className="font-medium text-amber-700 hover:underline">
          Post a wanted ad
        </Link>
        <span className="text-zinc-500"> (sign in)</span>
      </p>
      {ads.length === 0 ? (
        <p className="mt-8 text-zinc-500">No active wanted ads yet.</p>
      ) : (
        <ul className="mt-8 space-y-3">
          {ads.map((w) => (
            <li key={w.id}>
              <Link
                href={`/wanted/${w.id}`}
                className="block rounded-xl border border-zinc-200 bg-white p-4 transition-colors hover:border-amber-300"
              >
                <p className="font-medium text-zinc-900">{w.title}</p>
                <p className="mt-1 line-clamp-2 text-sm text-zinc-600">{w.description}</p>
                <p className="mt-2 text-xs text-zinc-500">
                  {w.category?.name ?? "Any category"}
                  {w.budgetMaxPence != null && ` · up to £${(w.budgetMaxPence / 100).toFixed(2)}`}
                  {w.postcode && ` · ${w.postcode}`}
                </p>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

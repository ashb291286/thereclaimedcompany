import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { redirect } from "next/navigation";
import Link from "next/link";

export default async function DashboardListingsPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/auth/signin");

  const listings = await prisma.listing.findMany({
    where: { sellerId: session.user.id },
    orderBy: { updatedAt: "desc" },
    take: 120,
    include: { category: { select: { name: true } } },
  });

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold text-zinc-900">My listings</h1>
        <Link
          href="/dashboard/sell"
          className="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-hover"
        >
          New listing
        </Link>
      </div>
      {listings.length === 0 ? (
        <p className="mt-6 text-sm text-zinc-500">You have not added any listings yet.</p>
      ) : (
        <ul className="mt-6 space-y-3">
          {listings.map((l) => (
            <li
              key={l.id}
              className="flex flex-wrap items-start justify-between gap-3 rounded-xl border border-zinc-200 bg-white p-4"
            >
              <div>
                <Link href={`/listings/${l.id}`} className="font-medium text-zinc-900 hover:underline">
                  {l.title}
                </Link>
                <p className="text-sm text-zinc-600">
                  {l.category.name} · {l.status} · {l.visibleOnMarketplace ? "Visible" : "Hidden"}
                </p>
                <p className="mt-1 text-xs text-zinc-500">
                  Updated {l.updatedAt.toLocaleDateString("en-GB", { dateStyle: "medium" })}
                </p>
              </div>
              <div className="flex gap-2">
                <Link
                  href={`/listings/${l.id}`}
                  className="rounded-lg border border-zinc-300 px-3 py-1.5 text-sm font-medium text-zinc-800 hover:bg-zinc-50"
                >
                  View
                </Link>
                <Link
                  href={`/dashboard/listings/${l.id}/edit`}
                  className="rounded-lg border border-zinc-300 px-3 py-1.5 text-sm font-medium text-zinc-800 hover:bg-zinc-50"
                >
                  Edit
                </Link>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

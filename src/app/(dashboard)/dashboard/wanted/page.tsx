import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { redirect } from "next/navigation";
import Link from "next/link";

export default async function DashboardWantedPage({
  searchParams,
}: {
  searchParams: Promise<{ created?: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect("/auth/signin");
  const { created } = await searchParams;

  const mine = await prisma.wantedAd.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "desc" },
    include: { category: true },
  });

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold text-zinc-900">Your wanted ads</h1>
        <Link
          href="/dashboard/wanted/new"
          className="rounded-lg bg-amber-600 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-700"
        >
          New wanted ad
        </Link>
      </div>
      {created && (
        <p className="mt-4 rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-800">
          Wanted ad published. Relevant sellers have been notified.
        </p>
      )}
      <p className="mt-2 text-sm text-zinc-600">
        <Link href="/wanted" className="text-amber-700 hover:underline">
          Browse all public wanted ads
        </Link>
      </p>
      {mine.length === 0 ? (
        <p className="mt-8 text-sm text-zinc-500">You haven’t posted a wanted ad yet.</p>
      ) : (
        <ul className="mt-6 space-y-3">
          {mine.map((w) => (
            <li
              key={w.id}
              className="flex items-start justify-between gap-4 rounded-xl border border-zinc-200 bg-white p-4"
            >
              <div>
                <Link href={`/wanted/${w.id}`} className="font-medium text-zinc-900 hover:underline">
                  {w.title}
                </Link>
                <p className="text-sm text-zinc-500">
                  {w.status} · {w.category?.name ?? "Any category"}
                </p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

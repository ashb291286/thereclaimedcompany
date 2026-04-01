import { prisma } from "@/lib/db";
import { notFound } from "next/navigation";
import Link from "next/link";

export default async function WantedDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const w = await prisma.wantedAd.findFirst({
    where: { id, status: "active" },
    include: { category: true },
  });
  if (!w) notFound();

  return (
    <div className="pb-12">
      <Link href="/wanted" className="text-sm text-brand hover:underline">
        ← All wanted
      </Link>
      <h1 className="mt-4 text-2xl font-semibold text-zinc-900">{w.title}</h1>
      <p className="mt-2 text-sm text-zinc-600">
        {w.category?.name ?? "Any category"}
        {w.budgetMaxPence != null && ` · Budget up to £${(w.budgetMaxPence / 100).toFixed(2)}`}
        {w.postcode && ` · Near ${w.postcode}`}
      </p>
      <p className="mt-6 whitespace-pre-wrap text-zinc-800">{w.description}</p>
      <div className="mt-8 rounded-xl border border-brand/20 bg-brand-soft p-4 text-sm text-zinc-900">
        <p className="font-medium">Have something that fits?</p>
        <p className="mt-1">
          List it with photos and a price — buyers who post wanted ads are actively looking.
        </p>
        <Link
          href="/dashboard/sell"
          className="mt-3 inline-block font-semibold text-brand hover:underline"
        >
          Create a listing →
        </Link>
      </div>
    </div>
  );
}

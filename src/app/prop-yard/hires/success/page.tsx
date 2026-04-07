import Link from "next/link";

type Props = { searchParams: Promise<{ offerId?: string }> };

export default async function PropHireSuccessPage({ searchParams }: Props) {
  const { offerId } = await searchParams;
  return (
    <div className="mx-auto max-w-lg rounded-2xl border border-amber-900/10 bg-white p-8 text-center shadow-sm">
      <h1 className="text-xl font-semibold text-amber-950">Hire request sent</h1>
      <p className="mt-3 text-sm text-zinc-600">
        The yard will review dates and logistics. You&apos;ll arrange payment, deposit, and the formal hire
        agreement directly with them once they confirm.
      </p>
      <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-center">
        {offerId ? (
          <Link
            href={`/prop-yard/offers/${offerId}`}
            className="rounded-lg border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-800 hover:bg-zinc-50"
          >
            Back to prop
          </Link>
        ) : null}
        <Link
          href="/prop-yard/search"
          className="rounded-lg bg-amber-900 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-950"
        >
          Find more props
        </Link>
      </div>
    </div>
  );
}

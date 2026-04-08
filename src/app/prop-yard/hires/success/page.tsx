import Link from "next/link";

type Props = { searchParams: Promise<{ offerId?: string; sent?: string; yards?: string }> };

export default async function PropHireSuccessPage({ searchParams }: Props) {
  const { offerId, sent, yards } = await searchParams;
  return (
    <div className="mx-auto max-w-lg rounded-2xl border border-driven-warm bg-white p-8 text-center shadow-sm">
      <h1 className="font-[family-name:var(--font-driven-display)] text-xl font-semibold text-driven-ink">
        Hire request sent
      </h1>
      <p className="mt-3 text-sm text-driven-muted">
        The yard will review dates and logistics. You&apos;ll arrange payment, deposit, and the formal hire
        agreement directly with them once they confirm.
      </p>
      {sent ? (
        <p className="mt-2 text-xs text-driven-muted">
          Sent {sent} request{sent === "1" ? "" : "s"} across {yards ?? "1"} yard
          {yards === "1" ? "" : "s"}.
        </p>
      ) : null}
      <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-center">
        {offerId ? (
          <Link
            href={`/prop-yard/offers/${offerId}`}
            className="rounded-lg border border-driven-warm px-4 py-2 text-sm font-medium text-driven-ink hover:bg-driven-accent-light/40"
          >
            Back to prop
          </Link>
        ) : null}
        <Link
          href="/prop-yard/search"
          className="rounded-lg border border-driven-ink bg-driven-ink px-4 py-2 font-[family-name:var(--font-driven-mono)] text-xs font-semibold uppercase tracking-wide text-driven-paper hover:bg-driven-accent"
        >
          Find more props
        </Link>
      </div>
    </div>
  );
}

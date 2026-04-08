import Link from "next/link";

export function PropYardNav({ showManageOffers }: { showManageOffers?: boolean }) {
  const linkClass =
    "hover:text-driven-accent font-[family-name:var(--font-driven-mono)] text-xs uppercase tracking-wide text-driven-ink";

  return (
    <header className="border-b border-driven-warm bg-driven-paper">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-4 py-4 sm:px-6">
        <div className="flex flex-col gap-1">
          <Link
            href="/prop-yard"
            className="font-[family-name:var(--font-driven-display)] text-xl font-semibold tracking-tight text-driven-ink sm:text-2xl"
          >
            The Prop Yard
          </Link>
          <span className="font-[family-name:var(--font-driven-mono)] text-[10px] uppercase tracking-[0.2em] text-driven-muted">
            The Reclaimed Company
          </span>
        </div>
        <nav className="flex flex-wrap items-center gap-x-5 gap-y-2">
          <Link href="/prop-yard" className={linkClass}>
            Home
          </Link>
          <Link href="/prop-yard/search" className={linkClass}>
            Find props
          </Link>
          <Link href="/prop-yard/sets" className={linkClass}>
            My sets
          </Link>
          <Link href="/prop-yard/dashboard" className={linkClass}>
            Prop dashboard
          </Link>
          {showManageOffers ? (
            <Link href="/dashboard/prop-yard" className={linkClass}>
              Manage hire listings
            </Link>
          ) : null}
          <Link href="/driven" className="font-[family-name:var(--font-driven-mono)] text-xs uppercase tracking-wide text-driven-muted hover:text-driven-accent">
            Driven
          </Link>
          <Link href="/" className="font-[family-name:var(--font-driven-mono)] text-xs uppercase tracking-wide text-driven-muted hover:text-driven-accent">
            Marketplace
          </Link>
        </nav>
      </div>
    </header>
  );
}

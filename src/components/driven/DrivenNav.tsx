import Link from "next/link";

export function DrivenNav() {
  return (
    <header className="border-b border-driven-warm bg-driven-paper">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-4 py-4 sm:px-6">
        <div className="flex flex-col gap-1">
          <Link
            href="/driven"
            className="font-[family-name:var(--font-driven-display)] text-xl font-semibold tracking-tight text-driven-ink sm:text-2xl"
          >
            Driven · Reclaimed
          </Link>
          <span className="font-[family-name:var(--font-driven-mono)] text-[10px] uppercase tracking-[0.2em] text-driven-muted">
            The Reclaimed Company
          </span>
        </div>
        <nav className="flex flex-wrap items-center gap-x-5 gap-y-2 font-[family-name:var(--font-driven-mono)] text-xs uppercase tracking-wide text-driven-ink">
          <Link href="/driven" className="hover:text-driven-accent">
            Home
          </Link>
          <Link href="/driven/auctions" className="hover:text-driven-accent">
            Auctions
          </Link>
          <Link href="/driven/garage" className="hover:text-driven-accent">
            Garage
          </Link>
          <Link href="/" className="text-driven-muted hover:text-driven-accent">
            Marketplace
          </Link>
        </nav>
      </div>
    </header>
  );
}

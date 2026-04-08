import Link from "next/link";

const link =
  "text-sm font-medium text-amber-950/80 transition hover:text-amber-950 underline-offset-4 hover:underline";

export function PropYardNav() {
  return (
    <nav className="flex flex-wrap items-center gap-x-6 gap-y-2 border-b border-amber-900/15 pb-4">
      <Link href="/prop-yard" className={link}>
        Overview
      </Link>
      <Link href="/prop-yard/search" className={link}>
        Find props
      </Link>
      <Link href="/prop-yard/basket" className={link}>
        Basket
      </Link>
      <Link href="/prop-yard/dashboard" className={link}>
        Prop dashboard
      </Link>
      <Link href="/dashboard/prop-yard" className={link}>
        Yard dashboard
      </Link>
      <Link href="/" className={link}>
        Marketplace
      </Link>
    </nav>
  );
}

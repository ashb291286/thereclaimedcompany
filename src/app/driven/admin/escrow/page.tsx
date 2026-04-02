import Link from "next/link";

export default function DrivenAdminEscrowPage() {
  return (
    <div>
      <nav className="font-[family-name:var(--font-driven-mono)] text-[10px] uppercase tracking-wide text-driven-muted">
        <Link href="/driven" className="hover:text-driven-ink">
          Driven
        </Link>
        <span className="mx-2">/</span>
        <span className="text-driven-ink">Admin · Escrow</span>
      </nav>
      <h1 className="mt-6 font-[family-name:var(--font-driven-display)] text-3xl italic text-driven-ink">Title escrow</h1>
      <p className="mt-4 max-w-2xl text-sm text-driven-muted">
        This area will list Driven auction settlements, escrow holds, and transfer confirmations. Middleware restricts access to
        addresses in <code className="rounded bg-driven-warm px-1">ADMIN_EMAILS</code>.
      </p>
      <div className="mt-10 border border-driven-warm bg-white p-8 text-sm text-driven-muted">No escrow items yet.</div>
    </div>
  );
}

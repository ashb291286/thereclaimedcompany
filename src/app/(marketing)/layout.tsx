import Link from "next/link";
import { auth } from "@/auth";

export default async function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  return (
    <div className="min-h-screen bg-stone-50 text-zinc-900">
      <header className="border-b border-zinc-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex h-16 w-full max-w-7xl items-center justify-between px-4 sm:px-6">
          <Link href="/" className="flex items-center gap-3">
            <img
              src="https://thereclaimedcompany.com/wp-content/uploads/2022/09/the-reclaimed-company-logo-1-1.webp"
              alt="The Reclaimed Company"
              className="h-10 w-auto"
            />
          </Link>
          <nav className="flex items-center gap-4 sm:gap-6">
            <Link href="/search" className="text-sm font-medium text-zinc-700 hover:text-zinc-900">
              Browse
            </Link>
            <Link href="/search?sellerType=reclamation_yard" className="text-sm font-medium text-zinc-700 hover:text-zinc-900">
              Yards
            </Link>
            {session ? (
              <>
                <Link href="/dashboard" className="text-sm font-medium text-zinc-700 hover:text-zinc-900">
                  Dashboard
                </Link>
                <span className="hidden text-sm text-zinc-500 md:block">{session.user.email}</span>
              </>
            ) : (
              <>
                <Link href="/auth/signin" className="text-sm font-medium text-zinc-700 hover:text-zinc-900">
                  Sign in
                </Link>
                <Link
                  href="/auth/register"
                  className="rounded-full bg-amber-600 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-700"
                >
                  Sell now
                </Link>
              </>
            )}
          </nav>
        </div>
      </header>
      <main>{children}</main>
      <footer className="border-t border-zinc-200 bg-white">
        <div className="mx-auto flex w-full max-w-7xl flex-col items-start justify-between gap-4 px-4 py-8 text-sm text-zinc-600 sm:flex-row sm:items-center sm:px-6">
          <p>Reclaimed Marketplace by The Reclaimed Company</p>
          <div className="flex gap-5">
            <Link href="/search" className="hover:text-zinc-900">
              Browse listings
            </Link>
            <Link href="/auth/register" className="hover:text-zinc-900">
              Become a seller
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}

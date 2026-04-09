"use client";

import Link from "next/link";
import type { Session } from "next-auth";
import { CurrencyProvider } from "@/components/currency/CurrencyProvider";
import { CurrencySwitcher } from "@/components/currency/CurrencySwitcher";

export function MarketingShell({
  session,
  children,
}: {
  session: Session | null;
  children: React.ReactNode;
}) {
  return (
    <CurrencyProvider>
      <div className="min-h-screen bg-stone-50 text-zinc-900">
        <header className="border-b border-zinc-200 bg-white/95 backdrop-blur">
          <div className="mx-auto flex min-h-16 w-full max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-2 sm:px-6 sm:py-0">
            <Link href="/" className="flex items-center gap-3">
              <img
                src="https://thereclaimedcompany.com/wp-content/uploads/2022/09/the-reclaimed-company-logo-1-1.webp"
                alt="The Reclaimed Company"
                className="h-10 w-auto"
              />
            </Link>
            <nav className="flex flex-wrap items-center justify-end gap-x-4 gap-y-2 sm:gap-6">
              <Link href="/search" className="text-sm font-medium text-zinc-700 hover:text-zinc-900">
                Browse
              </Link>
              <Link href="/reclamation-yards" className="text-sm font-medium text-zinc-700 hover:text-zinc-900">
                Yards
              </Link>
              <Link href="/wanted" className="text-sm font-medium text-zinc-700 hover:text-zinc-900">
                Wanted
              </Link>
              <Link href="/demolition-alerts" className="text-sm font-medium text-zinc-700 hover:text-zinc-900">
                Demolition alerts
              </Link>
              <Link
                href="/driven"
                className="text-sm font-medium text-driven-accent hover:text-driven-ink"
              >
                Driven
              </Link>
              <Link href="/prop-yard" className="text-sm font-medium text-amber-900 hover:text-amber-950">
                Prop Yard
              </Link>
              <div className="flex items-center border-l border-zinc-200 pl-3 sm:pl-4">
                <CurrencySwitcher />
              </div>
              {session ? (
                <>
                  <Link href="/dashboard" className="text-sm font-medium text-zinc-700 hover:text-zinc-900">
                    Dashboard
                  </Link>
                  <span className="hidden max-w-[10rem] truncate text-sm text-zinc-500 md:block">
                    {session.user?.email}
                  </span>
                </>
              ) : (
                <>
                  <Link href="/auth/signin" className="text-sm font-medium text-zinc-700 hover:text-zinc-900">
                    Sign in
                  </Link>
                  <Link
                    href="/auth/register"
                    className="rounded-full bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-hover"
                  >
                    Sell now
                  </Link>
                </>
              )}
            </nav>
          </div>
        </header>
        <main>{children}</main>
        <footer className="bg-[#06496b] text-white">
          <div className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 sm:py-8">
            <div className="flex justify-center">
              <Link
                href="/auth/register"
                className="rounded-full border border-white/70 bg-brand px-6 py-2 text-xs font-semibold tracking-wide text-white transition hover:bg-brand-hover"
              >
                Sell Your Item Today
              </Link>
            </div>

            <div className="mt-6 text-center">
              <h2 className="text-3xl font-semibold leading-[1.1] tracking-tight sm:text-5xl">
                Your next salvage is just one click away.
              </h2>
              <p className="mx-auto mt-3 max-w-3xl text-sm leading-relaxed text-white/90 sm:text-lg">
                Find local reclamation yards and treasures like usual only faster, smarter, and completely online.
              </p>
            </div>

            <div className="mt-8 border-t border-b border-white/20 py-8">
              <div className="grid grid-cols-1 gap-8 md:grid-cols-[1.7fr_1fr_1fr_1fr_1fr]">
                <div className="space-y-4">
                  <img
                    src="https://thereclaimedcompany.com/wp-content/uploads/2022/09/the-reclaimed-company-logo-1-1.webp"
                    alt="Reclaimed"
                    className="h-16 w-16 rounded-full border border-white/30 object-cover"
                  />
                  <p className="max-w-[230px] text-xl leading-snug tracking-tight text-white/95 sm:text-2xl">
                    Make this official, join and access the future of reclamation.
                  </p>
                  <p className="text-sm font-semibold text-white/95">Join us</p>
                  <div className="flex gap-2">
                    {["F", "X", "Y", "L", "I"].map((icon) => (
                      <span
                        key={icon}
                        className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-white/40 bg-white/10 text-[10px] font-bold text-white"
                      >
                        {icon}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="space-y-2 text-[15px] leading-relaxed text-white/95">
                  <p className="text-xs font-semibold tracking-widest text-white/80">SALVAGERS</p>
                  <p>Marketplace</p>
                  <p>Free To Collect</p>
                  <p>Wanted</p>
                </div>

                <div className="space-y-2 text-[15px] leading-relaxed text-white/95">
                  <p className="text-xs font-semibold tracking-widest text-white/80">LOCAL RECLAMATION YARDS</p>
                  <p>Marketplace</p>
                  <p>Free To Collect</p>
                  <p>Wanted</p>
                </div>

                <div className="space-y-2 text-[15px] leading-relaxed text-white/95">
                  <p className="text-xs font-semibold tracking-widest text-white/80">RESOURCES</p>
                  <p>Marketplace</p>
                  <p>Antiques Dealers</p>
                  <p>Reclamation Yards</p>
                  <p>Press &amp; Media</p>
                </div>

                <div className="space-y-2 text-[15px] leading-relaxed text-white/95">
                  <p className="text-xs font-semibold tracking-widest text-white/80">COMPANY</p>
                  <p>Safety Tips</p>
                  <p>Terms</p>
                  <p>Privacy Policy</p>
                  <Link href="/intellectual-property" className="hover:text-white">
                    Intellectual Property
                  </Link>
                  <p>Help</p>
                </div>
              </div>

              <div className="mt-8 rounded-xl border border-white/20 bg-white/10 px-5 py-4 sm:flex sm:items-center sm:justify-between">
                <p className="max-w-2xl text-2xl font-semibold leading-tight tracking-tight sm:text-[32px]">
                  Get found fast. Connect with homeowners and salvagers who need reclaimed items all online.
                </p>
                <Link
                  href="/auth/register"
                  className="mt-4 inline-flex rounded-full border border-white/60 bg-brand px-5 py-2 text-sm font-semibold text-white hover:bg-brand-hover sm:mt-0"
                >
                  Add Your Business
                </Link>
              </div>
            </div>

            <div className="mt-5 flex flex-col gap-3 text-xs text-white/70 sm:flex-row sm:items-center sm:justify-between">
              <p>©2025 The Reclaimed Company 05769679 - All Rights Reserved.</p>
              <div className="flex items-center gap-4">
                <p>Privacy Policy</p>
                <p>Terms of use</p>
              </div>
            </div>
          </div>
        </footer>
      </div>
    </CurrencyProvider>
  );
}

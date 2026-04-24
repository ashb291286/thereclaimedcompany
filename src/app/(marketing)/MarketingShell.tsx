"use client";

import Image from "next/image";
import Link from "next/link";
import type { Session } from "next-auth";
import { CurrencyProvider } from "@/components/currency/CurrencyProvider";
import { CurrencySwitcher } from "@/components/currency/CurrencySwitcher";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";

export function MarketingShell({
  session,
  children,
}: {
  session: Session | null;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const isListingPassportRoute = /^\/listings\/[^/]+\/passport$/.test(pathname ?? "");
  const hideMobileHeader = pathname?.startsWith("/search") ?? false;
  const hideFooter = pathname?.startsWith("/search") ?? false;
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    if (!mobileOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [mobileOpen]);

  return (
    <CurrencyProvider>
      <div className="min-h-screen bg-stone-50 text-zinc-900">
        {!isListingPassportRoute ? (
        <header
          className={`relative z-[7000] border-b border-zinc-200 bg-white/95 backdrop-blur ${hideMobileHeader ? "hidden md:block" : ""}`}
        >
          <div className="mx-auto flex min-h-16 w-full max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-2 sm:px-6 sm:py-0">
            <Link href="/" className="flex items-center gap-2" aria-label="The Reclaimed Company — home">
              <Image
                src="/images/the-reclaimed-company-logo.png"
                alt=""
                width={160}
                height={160}
                className="h-10 w-10 object-contain sm:h-11 sm:w-11"
                priority
              />
            </Link>
            <button
              type="button"
              onClick={() => setMobileOpen(true)}
              className="inline-flex h-10 w-10 items-center justify-center rounded-md border border-zinc-300 text-zinc-700 md:hidden"
              aria-label="Open menu"
            >
              <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" aria-hidden>
                <path
                  d="M4 7h16M4 12h16M4 17h16"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
              </svg>
            </button>
            <nav className="hidden flex-wrap items-center justify-end gap-x-4 gap-y-2 md:flex md:gap-6">
              <Link href="/search" className="text-sm font-medium text-zinc-700 hover:text-zinc-900">
                Browse
              </Link>
              <Link href="/dealers" className="text-sm font-medium text-zinc-700 hover:text-zinc-900">
                Dealers
              </Link>
              <Link
                href="/search?sellerType=reclamation_yard#search-filters"
                className="text-sm font-medium text-zinc-700 hover:text-zinc-900"
              >
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
                  <Link
                    href="/dashboard/sell"
                    className="rounded-full bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-hover"
                  >
                    Add Listing
                  </Link>
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
            <div
              className={`fixed inset-0 z-[9000] bg-black/45 transition-opacity duration-200 md:hidden ${
                mobileOpen ? "opacity-100" : "pointer-events-none opacity-0"
              }`}
              onClick={() => setMobileOpen(false)}
              aria-hidden
            />
            <aside
              className={`fixed right-0 top-0 z-[9100] flex h-[100dvh] w-[86vw] max-w-sm flex-col overflow-y-auto bg-white p-4 shadow-2xl transition-transform duration-300 md:hidden ${
                mobileOpen ? "translate-x-0" : "translate-x-full"
              }`}
              aria-label="Mobile menu"
            >
              <div className="mb-4 flex items-center justify-between">
                <span className="text-sm font-semibold text-zinc-900">Menu</span>
                <button
                  type="button"
                  onClick={() => setMobileOpen(false)}
                  className="rounded-md px-2 py-1 text-sm text-zinc-600 hover:bg-zinc-100"
                >
                  Close
                </button>
              </div>

              {session ? (
                <Link
                  href="/dashboard/sell"
                  onClick={() => setMobileOpen(false)}
                  className="mb-3 rounded-full bg-brand px-4 py-2 text-center text-sm font-semibold text-white hover:bg-brand-hover"
                >
                  Add Listing
                </Link>
              ) : (
                <Link
                  href="/auth/register"
                  onClick={() => setMobileOpen(false)}
                  className="mb-3 rounded-full bg-brand px-4 py-2 text-center text-sm font-semibold text-white hover:bg-brand-hover"
                >
                  Sell now
                </Link>
              )}

              <div className="mb-3 rounded-lg border border-zinc-200 p-3">
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-500">Currency</p>
                <CurrencySwitcher />
              </div>

              <div className="flex flex-col gap-1 text-sm">
                <Link href="/search" onClick={() => setMobileOpen(false)} className="rounded-md px-2 py-2 hover:bg-zinc-100">Browse</Link>
                <Link href="/dealers" onClick={() => setMobileOpen(false)} className="rounded-md px-2 py-2 hover:bg-zinc-100">Dealers</Link>
                <Link
                  href="/search?sellerType=reclamation_yard#search-filters"
                  onClick={() => setMobileOpen(false)}
                  className="rounded-md px-2 py-2 hover:bg-zinc-100"
                >
                  Yards
                </Link>
                <Link href="/wanted" onClick={() => setMobileOpen(false)} className="rounded-md px-2 py-2 hover:bg-zinc-100">Wanted</Link>
                <Link href="/demolition-alerts" onClick={() => setMobileOpen(false)} className="rounded-md px-2 py-2 hover:bg-zinc-100">Demolition alerts</Link>
                <Link href="/driven" onClick={() => setMobileOpen(false)} className="rounded-md px-2 py-2 hover:bg-zinc-100">Driven</Link>
                <Link href="/prop-yard" onClick={() => setMobileOpen(false)} className="rounded-md px-2 py-2 hover:bg-zinc-100">Prop Yard</Link>
                <Link href="/legal-hub" onClick={() => setMobileOpen(false)} className="rounded-md px-2 py-2 hover:bg-zinc-100">Legal hub</Link>
                {session ? (
                  <Link href="/dashboard" onClick={() => setMobileOpen(false)} className="rounded-md px-2 py-2 hover:bg-zinc-100">Dashboard</Link>
                ) : (
                  <Link href="/auth/signin" onClick={() => setMobileOpen(false)} className="rounded-md px-2 py-2 hover:bg-zinc-100">Sign in</Link>
                )}
              </div>
            </aside>
          </div>
        </header>
        ) : null}
        <main>{children}</main>
        {!hideFooter && !isListingPassportRoute ? (
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
                    <Image
                      src="/images/the-reclaimed-company-logo.png"
                      alt="The Reclaimed Company"
                      width={200}
                      height={200}
                      className="h-20 w-20 object-contain sm:h-24 sm:w-24"
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
                    <Link href="/search" className="block hover:text-white">
                      Marketplace
                    </Link>
                    <Link href="/search?listingType=free_collect" className="block hover:text-white">
                      Free To Collect
                    </Link>
                    <Link href="/wanted" className="block hover:text-white">
                      Wanted
                    </Link>
                  </div>

                  <div className="space-y-2 text-[15px] leading-relaxed text-white/95">
                    <p className="text-xs font-semibold tracking-widest text-white/80">LOCAL RECLAMATION YARDS</p>
                    <Link href="/search" className="block hover:text-white">
                      Marketplace
                    </Link>
                    <Link href="/auth/register?sellerFlow=yard" className="block hover:text-white">
                      Add Your Yard FREE
                    </Link>
                    <Link href="/search?listingType=free_collect" className="block hover:text-white">
                      Free To Collect
                    </Link>
                    <Link href="/wanted" className="block hover:text-white">
                      Wanted
                    </Link>
                  </div>

                  <div className="space-y-2 text-[15px] leading-relaxed text-white/95">
                    <p className="text-xs font-semibold tracking-widest text-white/80">RESOURCES</p>
                    <Link href="/search" className="block hover:text-white">
                      Marketplace
                    </Link>
                    <Link href="/dealers" className="block hover:text-white">
                      Antiques Dealers
                    </Link>
                    <Link href="/reclamation-yards" className="block hover:text-white">
                      Reclamation Yards
                    </Link>
                    <p>Press &amp; Media</p>
                  </div>

                  <div className="space-y-2 text-[15px] leading-relaxed text-white/95">
                    <p className="text-xs font-semibold tracking-widest text-white/80">COMPANY</p>
                    <p>Safety Tips</p>
                    <Link href="/legal-hub" className="hover:text-white">
                      Legal Hub
                    </Link>
                    <Link href="/legal-hub" className="hover:text-white">
                      Terms &amp; Privacy
                    </Link>
                    <Link href="/intellectual-property" className="hover:text-white">
                      Intellectual Property
                    </Link>
                    <p>Help</p>
                  </div>
                </div>

                <div className="mt-8 rounded-xl border border-white/20 bg-white/10 px-5 py-4 sm:flex sm:items-center sm:justify-between">
                  <div className="max-w-2xl">
                    <p className="text-2xl font-semibold leading-tight tracking-tight sm:text-[32px]">
                      Get Found fast. Sell More. Grow Your Yard.
                    </p>
                    <p className="mt-2 text-sm font-medium text-white/90">
                      The global marketplace for local reclamation. Reclamation without borders, local yards global reach.
                    </p>
                  </div>
                  <Link
                    href="/auth/register?sellerFlow=yard"
                    className="mt-4 inline-flex rounded-full border border-white/60 bg-brand px-5 py-2 text-sm font-semibold text-white hover:bg-brand-hover sm:mt-0"
                  >
                    Add Your Business
                  </Link>
                </div>
              </div>

              <div className="mt-5 flex flex-col gap-3 text-xs text-white/70 sm:flex-row sm:items-center sm:justify-between">
                <p>©2025 The Reclaimed Company 05769679 - All Rights Reserved.</p>
                <div className="flex flex-wrap items-center gap-4">
                  <Link href="/sitemap.xml" className="hover:text-white">
                    Sitemap
                  </Link>
                  <Link href="/legal-hub" className="hover:text-white">
                    Privacy Policy
                  </Link>
                  <Link href="/legal-hub" className="hover:text-white">
                    Terms of use
                  </Link>
                </div>
              </div>
            </div>
          </footer>
        ) : null}
      </div>
    </CurrencyProvider>
  );
}

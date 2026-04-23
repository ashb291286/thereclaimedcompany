"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { DashboardSidebar } from "./DashboardSidebar";
import { dashboardSignOutAction } from "@/lib/actions/dashboard-session";

export function DashboardLayoutShell({
  children,
  unreadCount,
  unreadOutbidCount,
  isYardAccount,
  isDealerAccount,
  dealerDealsAsSellerCount,
  carbonAdmin,
}: {
  children: React.ReactNode;
  unreadCount: number;
  unreadOutbidCount: number;
  isYardAccount: boolean;
  isDealerAccount: boolean;
  /** Threads where this user is the dealer (private buyer enquiries). */
  dealerDealsAsSellerCount: number;
  carbonAdmin: boolean;
}) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    if (!mobileMenuOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [mobileMenuOpen]);

  return (
    <div className="min-h-screen bg-zinc-50">
      <header className="border-b border-zinc-200 bg-white">
        <div className="mx-auto flex h-14 max-w-[1400px] items-center justify-between gap-2 px-4">
          <div className="flex min-w-0 flex-1 items-center gap-2">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(true)}
              className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-zinc-300 text-zinc-700 hover:bg-zinc-50 md:hidden"
              aria-label="Open dashboard menu"
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
            <Link href="/" className="truncate font-semibold text-zinc-900">
              Reclaimed Marketplace
            </Link>
          </div>

          <nav className="hidden flex-wrap items-center gap-4 sm:gap-6 md:flex">
            <Link href="/" className="text-sm text-zinc-600 hover:text-zinc-900">
              Browse
            </Link>
            <Link href="/wanted" className="text-sm text-zinc-600 hover:text-zinc-900">
              Wanted
            </Link>
            <Link href="/dashboard" className="text-sm text-zinc-600 hover:text-zinc-900">
              Dashboard
            </Link>
            <Link href="/dashboard/notifications" className="relative text-sm text-zinc-600 hover:text-zinc-900">
              Notifications
              {unreadCount > 0 && (
                <span className="absolute -right-2 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-brand px-1 text-[10px] font-bold text-white">
                  {unreadCount > 9 ? "9+" : unreadCount}
                </span>
              )}
            </Link>
            <Link
              href="/dashboard/sell"
              className="inline-flex items-center rounded-lg bg-brand px-3 py-1.5 text-sm font-semibold text-white hover:bg-brand-hover"
            >
              Add Listing
            </Link>
            <Link href="/dashboard/account" className="text-sm text-zinc-600 hover:text-zinc-900">
              Account
            </Link>
            <form action={dashboardSignOutAction}>
              <button type="submit" className="text-sm text-brand hover:underline">
                Sign out
              </button>
            </form>
          </nav>

          <div className="flex shrink-0 items-center gap-2 md:hidden">
            <Link
              href="/dashboard/notifications"
              className="relative inline-flex h-10 w-10 items-center justify-center rounded-lg border border-zinc-300 text-sm text-zinc-700 hover:bg-zinc-50"
              aria-label="Notifications"
            >
              <span className="sr-only">Notifications</span>
              <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" aria-hidden>
                <path
                  d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              {unreadCount > 0 && (
                <span className="absolute right-0.5 top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-brand px-1 text-[10px] font-bold text-white">
                  {unreadCount > 9 ? "9+" : unreadCount}
                </span>
              )}
            </Link>
            <Link
              href="/dashboard/sell"
              className="inline-flex items-center rounded-lg bg-brand px-3 py-2 text-xs font-semibold text-white hover:bg-brand-hover"
            >
              Add
            </Link>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-[1400px] px-4 py-8">
        <div className="grid grid-cols-1 gap-6 md:grid-cols-[250px_minmax(0,1fr)]">
          <div className="hidden md:block">
            <DashboardSidebar
              isYardAccount={isYardAccount}
              isDealerAccount={isDealerAccount}
              dealerDealsAsSellerCount={dealerDealsAsSellerCount}
              carbonAdmin={carbonAdmin}
              unreadCount={unreadCount}
              myBidsOutbidUnread={unreadOutbidCount}
            />
          </div>
          <div>{children}</div>
        </div>
      </main>

      {mobileMenuOpen ? (
        <div className="fixed inset-0 z-[7000] md:hidden" role="dialog" aria-modal="true" aria-label="Dashboard menu">
          <button
            type="button"
            className="absolute inset-0 z-0 bg-zinc-900/50"
            aria-label="Close menu"
            onClick={() => setMobileMenuOpen(false)}
          />
          <div className="absolute left-0 top-0 z-10 flex h-full w-[min(100%,320px)] max-w-[90vw] flex-col border-r border-zinc-200 bg-white shadow-2xl">
            <div className="flex shrink-0 items-center justify-between gap-2 border-b border-zinc-200 px-3 py-3 pt-[max(env(safe-area-inset-top),0.75rem)]">
              <span className="text-sm font-semibold text-zinc-900">Menu</span>
              <button
                type="button"
                onClick={() => setMobileMenuOpen(false)}
                className="inline-flex h-10 min-w-10 items-center justify-center rounded-lg border border-zinc-300 text-sm font-semibold text-zinc-800 hover:bg-zinc-50"
                aria-label="Close menu"
              >
                Close
              </button>
            </div>
            <div className="flex flex-col gap-1 border-b border-zinc-100 px-3 py-3 text-sm">
              <Link
                href="/"
                onClick={() => setMobileMenuOpen(false)}
                className="rounded-lg px-2 py-2 font-medium text-zinc-800 hover:bg-zinc-100"
              >
                Browse marketplace
              </Link>
              <Link
                href="/wanted"
                onClick={() => setMobileMenuOpen(false)}
                className="rounded-lg px-2 py-2 font-medium text-zinc-800 hover:bg-zinc-100"
              >
                Wanted
              </Link>
              <Link
                href="/search"
                onClick={() => setMobileMenuOpen(false)}
                className="rounded-lg px-2 py-2 font-medium text-zinc-800 hover:bg-zinc-100"
              >
                Search listings
              </Link>
              <Link
                href="/dashboard"
                onClick={() => setMobileMenuOpen(false)}
                className="rounded-lg px-2 py-2 font-medium text-zinc-800 hover:bg-zinc-100"
              >
                Dashboard home
              </Link>
              <Link
                href="/dashboard/account"
                onClick={() => setMobileMenuOpen(false)}
                className="rounded-lg px-2 py-2 font-medium text-zinc-800 hover:bg-zinc-100"
              >
                Account
              </Link>
              <form action={dashboardSignOutAction} className="pt-1">
                <button
                  type="submit"
                  className="w-full rounded-lg px-2 py-2 text-left text-sm font-medium text-brand hover:bg-zinc-50"
                >
                  Sign out
                </button>
              </form>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto overscroll-y-contain p-2">
              <DashboardSidebar
                isYardAccount={isYardAccount}
                isDealerAccount={isDealerAccount}
                dealerDealsAsSellerCount={dealerDealsAsSellerCount}
                carbonAdmin={carbonAdmin}
                unreadCount={unreadCount}
                myBidsOutbidUnread={unreadOutbidCount}
                onNavigate={() => setMobileMenuOpen(false)}
              />
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

"use client";

import Link from "next/link";
import { useEffect } from "react";

export function SellerOnboardingCompleteModal({ stripeSuccess }: { stripeSuccess: boolean }) {
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-zinc-900/60 backdrop-blur-sm" aria-hidden />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="seller-welcome-heading"
        className="relative z-10 w-full max-w-md rounded-2xl border border-zinc-200 bg-white p-6 shadow-xl sm:p-8"
      >
        <div className="mb-5 flex gap-1.5" aria-hidden>
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-1 flex-1 rounded-full bg-brand" />
          ))}
        </div>
        <h2 id="seller-welcome-heading" className="text-xl font-semibold text-zinc-900">
          You&apos;re ready to list
        </h2>
        <p className="mt-3 text-sm leading-relaxed text-zinc-600">
          {stripeSuccess
            ? "Stripe is connected and your seller profile is saved."
            : "Your seller profile is saved. Connect Stripe from the dashboard whenever you’re ready to receive payouts."}
        </p>
        <p className="mt-3 text-sm text-zinc-600">
          Add photos (you&apos;ll crop each one), set your price, and publish your first reclaimed listing.
        </p>
        <div className="mt-8 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
          <Link
            href="/dashboard/sell?firstListing=1"
            className="inline-flex flex-1 justify-center rounded-lg bg-brand px-4 py-2.5 text-center text-sm font-medium text-white hover:bg-brand-hover"
          >
            List your first item
          </Link>
          <Link
            href="/dashboard"
            className="inline-flex flex-1 justify-center rounded-lg border border-zinc-300 px-4 py-2.5 text-center text-sm font-medium text-zinc-700 hover:bg-zinc-50"
          >
            Go to dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}

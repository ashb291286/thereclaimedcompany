"use client";

import { useState } from "react";
import Link from "next/link";

export function OnboardingStripeStep({ hasStripeAccount }: { hasStripeAccount: boolean }) {
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function go() {
    setLoading(true);
    setErr(null);
    try {
      const res = await fetch("/api/stripe/connect/create-link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ flow: "onboarding" }),
      });
      const data = (await res.json()) as { url?: string; error?: string };
      if (!res.ok) throw new Error(data.error ?? "Failed");
      if (data.url) window.location.href = data.url;
      else throw new Error("No URL returned");
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Something went wrong");
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-lg">
      <div className="mb-6 flex flex-wrap items-center gap-2 text-xs font-medium text-zinc-500">
        <span className="rounded-full bg-zinc-200 px-2.5 py-1 text-zinc-700">1 · Profile</span>
        <span className="text-zinc-400">→</span>
        <span className="rounded-full bg-brand px-2.5 py-1 text-white">2 · Get paid</span>
        <span className="text-zinc-400">→</span>
        <span className="rounded-full bg-zinc-200 px-2.5 py-1 text-zinc-800">3 · List</span>
      </div>
      <h1 className="text-2xl font-semibold text-zinc-900">Connect Stripe to get paid</h1>
      <p className="mt-2 text-sm leading-relaxed text-zinc-600">
        We use Stripe Connect. You&apos;ll confirm a few business details with Stripe; when items sell, payouts go to
        your bank minus our small platform fee.
      </p>
      {hasStripeAccount ? (
        <p className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-900">
          Stripe is already linked. Continue to the last step.
        </p>
      ) : null}
      {err ? <p className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{err}</p> : null}
      <div className="mt-8 flex flex-col gap-3">
        {!hasStripeAccount ? (
          <button
            type="button"
            onClick={() => void go()}
            disabled={loading}
            className="w-full rounded-lg bg-brand px-4 py-2.5 text-sm font-medium text-white hover:bg-brand-hover disabled:opacity-50"
          >
            {loading ? "Opening Stripe…" : "Continue to Stripe"}
          </button>
        ) : null}
        <Link
          href="/dashboard/onboarding?phase=complete"
          className="w-full rounded-lg border border-zinc-300 bg-white px-4 py-2.5 text-center text-sm font-medium text-zinc-800 hover:bg-zinc-50"
        >
          {hasStripeAccount ? "Continue" : "Skip for now — I’ll finish Stripe from the dashboard"}
        </Link>
      </div>
    </div>
  );
}

"use client";

import { saveBuyerHomePostcode, skipBuyerWelcome } from "@/lib/actions/buyer-welcome";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

export function BuyerWelcomeModal({ open }: { open: boolean }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [step, setStep] = useState(0);
  const [postcode, setPostcode] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (!open) {
      setStep(0);
      setPostcode("");
      setErr(null);
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  const clearWelcomeParam = useCallback(() => {
    const next = new URLSearchParams(searchParams.toString());
    next.delete("welcome");
    const q = next.toString();
    router.replace(q ? `/search?${q}` : "/search");
    router.refresh();
  }, [router, searchParams]);

  async function finishWithPostcode(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setBusy(true);
    const r = await saveBuyerHomePostcode(postcode);
    setBusy(false);
    if (!r.ok) {
      setErr(r.error);
      return;
    }
    clearWelcomeParam();
  }

  async function finishSkip() {
    setErr(null);
    setBusy(true);
    const r = await skipBuyerWelcome();
    setBusy(false);
    if (!r.ok) {
      setErr(r.error ?? "Something went wrong.");
      return;
    }
    clearWelcomeParam();
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-zinc-900/60 backdrop-blur-sm" aria-hidden />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="buyer-welcome-heading"
        className="relative z-10 w-full max-w-lg rounded-2xl border border-zinc-200 bg-white p-6 shadow-xl sm:p-8"
      >
        <div className="mb-6 flex gap-1.5" aria-hidden>
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className={`h-1 flex-1 rounded-full ${i <= step ? "bg-brand" : "bg-zinc-200"}`}
            />
          ))}
        </div>

        {step === 0 && (
          <div>
            <h2 id="buyer-welcome-heading" className="text-xl font-semibold text-zinc-900">
              Welcome to the marketplace
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-zinc-600">
              You&apos;re signed in as a buyer. Here you can browse reclaimed materials, auctions, and hire listings
              from sellers and yards across the UK.
            </p>
            <p className="mt-4 text-sm text-zinc-600">
              This short tour takes three quick steps — the last one helps us show how far each listing is from you.
            </p>
            <div className="mt-8 flex justify-end">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="rounded-lg bg-brand px-4 py-2.5 text-sm font-medium text-white hover:bg-brand-hover"
              >
                Next
              </button>
            </div>
          </div>
        )}

        {step === 1 && (
          <div>
            <h2 id="buyer-welcome-heading" className="text-xl font-semibold text-zinc-900">
              Make the most of your account
            </h2>
            <ul className="mt-4 space-y-3 text-sm text-zinc-700">
              <li className="flex gap-2">
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-brand" aria-hidden />
                <span>Use filters on the left to narrow by category, condition, era, materials, and more.</span>
              </li>
              <li className="flex gap-2">
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-brand" aria-hidden />
                <span>Save favourites, make offers on fixed-price items, and track everything from your dashboard.</span>
              </li>
              <li className="flex gap-2">
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-brand" aria-hidden />
                <span>
                  Many listings show environmental context and delivery options — open a listing for full detail.
                </span>
              </li>
            </ul>
            <div className="mt-8 flex flex-wrap justify-between gap-2">
              <button
                type="button"
                onClick={() => setStep(0)}
                className="rounded-lg border border-zinc-300 px-4 py-2.5 text-sm font-medium text-zinc-700 hover:bg-zinc-50"
              >
                Back
              </button>
              <button
                type="button"
                onClick={() => setStep(2)}
                className="rounded-lg bg-brand px-4 py-2.5 text-sm font-medium text-white hover:bg-brand-hover"
              >
                Next
              </button>
            </div>
          </div>
        )}

        {step === 2 && (
          <div>
            <h2 id="buyer-welcome-heading" className="text-xl font-semibold text-zinc-900">
              Where are you based?
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-zinc-600">
              Enter a UK postcode. We&apos;ll save the approximate location on your profile and show distances on
              listings when sellers have added coordinates. You can always search from a different postcode using the
              filters on the left.
            </p>
            {err ? (
              <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">
                {err}
              </p>
            ) : null}
            <form onSubmit={(e) => void finishWithPostcode(e)} className="mt-5 space-y-4">
              <div>
                <label htmlFor="buyer-welcome-postcode" className="block text-sm font-medium text-zinc-700">
                  UK postcode
                </label>
                <input
                  id="buyer-welcome-postcode"
                  value={postcode}
                  onChange={(e) => setPostcode(e.target.value)}
                  autoComplete="postal-code"
                  placeholder="e.g. SW1A 1AA"
                  className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2.5 text-zinc-900 focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
                />
              </div>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => setStep(1)}
                  className="rounded-lg border border-zinc-300 px-4 py-2.5 text-sm font-medium text-zinc-700 hover:bg-zinc-50 disabled:opacity-50"
                >
                  Back
                </button>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => void finishSkip()}
                    className="rounded-lg border border-zinc-300 px-4 py-2.5 text-sm font-medium text-zinc-600 hover:bg-zinc-50 disabled:opacity-50"
                  >
                    Skip for now
                  </button>
                  <button
                    type="submit"
                    disabled={busy}
                    className="rounded-lg bg-brand px-4 py-2.5 text-sm font-medium text-white hover:bg-brand-hover disabled:opacity-50"
                  >
                    {busy ? "Saving…" : "Save & start browsing"}
                  </button>
                </div>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}

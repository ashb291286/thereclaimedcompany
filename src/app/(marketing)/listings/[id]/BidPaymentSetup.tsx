"use client";

import { useEffect, useState } from "react";
import { Elements, PaymentElement, useElements, useStripe } from "@stripe/react-stripe-js";
import { saveBidPaymentMethod } from "@/lib/actions/bid-payment";
import { getStripe } from "@/lib/stripe-client";

function SetupForm({ onSaved }: { onSaved: () => void }) {
  const stripe = useStripe();
  const elements = useElements();
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!stripe || !elements) return;
    setLoading(true);
    setErr(null);
    const { error, setupIntent } = await stripe.confirmSetup({
      elements,
      redirect: "if_required",
    });
    setLoading(false);
    if (error) {
      setErr(error.message ?? "Could not save card");
      return;
    }
    const pm = setupIntent?.payment_method;
    const pmId = typeof pm === "string" ? pm : pm?.id;
    if (!pmId) {
      setErr("No payment method returned");
      return;
    }
    const res = await saveBidPaymentMethod(pmId);
    if (!res.ok) {
      setErr(res.error);
      return;
    }
    onSaved();
  }

  return (
    <form onSubmit={onSubmit} className="space-y-3">
      <PaymentElement />
      <button
        type="submit"
        disabled={!stripe || loading}
        className="w-full rounded-lg bg-zinc-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-zinc-800 disabled:opacity-50"
      >
        {loading ? "Saving…" : "Save card for bidding"}
      </button>
      {err ? <p className="text-sm text-red-600">{err}</p> : null}
    </form>
  );
}

export function BidPaymentSetup({ onSaved }: { onSaved: () => void }) {
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [loadErr, setLoadErr] = useState<string | null>(null);
  const stripePromise = getStripe();

  useEffect(() => {
    if (!stripePromise) {
      setLoadErr("Payments are not configured (missing NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY).");
      return;
    }
    let cancelled = false;
    (async () => {
      const res = await fetch("/api/stripe/bid-payment/setup-intent", { method: "POST" });
      const data = await res.json().catch(() => ({}));
      if (cancelled) return;
      if (!res.ok) {
        setLoadErr(typeof data.error === "string" ? data.error : "Could not start card setup");
        return;
      }
      if (typeof data.clientSecret === "string") {
        setClientSecret(data.clientSecret);
      } else {
        setLoadErr("Invalid response from server");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [stripePromise]);

  if (loadErr) {
    return <p className="text-sm text-red-600">{loadErr}</p>;
  }
  if (!stripePromise || !clientSecret) {
    return <p className="text-sm text-zinc-600">Preparing secure card form…</p>;
  }

  return (
    <Elements
      stripe={stripePromise}
      options={{
        clientSecret,
        appearance: { theme: "stripe", variables: { borderRadius: "8px" } },
      }}
    >
      <SetupForm onSaved={onSaved} />
    </Elements>
  );
}

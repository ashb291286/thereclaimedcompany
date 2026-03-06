import Stripe from "stripe";

const globalForStripe = globalThis as unknown as { stripe: Stripe | null };
let _stripe: Stripe | null = globalForStripe.stripe ?? null;

export const stripe: Stripe = new Proxy({} as Stripe, {
  get(_, prop) {
    if (!_stripe) {
      const key = process.env.STRIPE_SECRET_KEY;
      if (!key) throw new Error("STRIPE_SECRET_KEY is not set");
      _stripe = new Stripe(key, { typescript: true });
      if (process.env.NODE_ENV !== "production") globalForStripe.stripe = _stripe;
    }
    return (_stripe as unknown as Record<string | symbol, unknown>)[prop];
  },
});

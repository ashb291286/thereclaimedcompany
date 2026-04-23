"use client";

import { useActionState } from "react";

type RegisterAction = (formData: FormData) => Promise<{ error?: string } | void>;

export function RegisterForm({
  register,
  accountIntent,
  onAccountIntentChange,
  callbackUrl = "",
  sellerFlow = null,
}: {
  register: RegisterAction;
  accountIntent: "buying" | "selling";
  onAccountIntentChange?: (intent: "buying" | "selling") => void;
  callbackUrl?: string;
  sellerFlow?: "yard" | "dealer" | null;
}) {
  const [state, formAction] = useActionState(
    async (_: { error?: string } | null, formData: FormData) => {
      const result = await register(formData);
      return result ?? null;
    },
    null as { error?: string } | null
  );

  return (
    <form action={formAction} className="space-y-4">
      <input
        type="hidden"
        name="accountIntent"
        value={sellerFlow === "yard" || sellerFlow === "dealer" ? "selling" : accountIntent}
      />
      {sellerFlow ? (
        <input
          type="hidden"
          name="sellerTypePref"
          value={sellerFlow === "yard" ? "reclamation_yard" : "dealer"}
        />
      ) : null}
      {callbackUrl ? <input type="hidden" name="callbackUrl" value={callbackUrl} /> : null}
      {state?.error && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          {state.error}
        </p>
      )}
      {!sellerFlow ? (
        <section className="rounded-xl border border-zinc-200 bg-zinc-50/70 p-4">
          <p className="text-sm font-semibold text-zinc-900">How are you using The Reclaimed Company?</p>
          <p className="mt-1 text-xs text-zinc-600">
            Pick one to personalize your next step.
          </p>
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            <button
              type="button"
              onClick={() => onAccountIntentChange?.("buying")}
              className={`rounded-xl border p-3 text-left transition ${
                accountIntent === "buying"
                  ? "border-brand bg-brand-soft/60 ring-1 ring-brand/25"
                  : "border-zinc-200 bg-white hover:border-zinc-300"
              }`}
            >
              <p className="text-sm font-semibold text-zinc-900">I&apos;m buying</p>
              <p className="mt-1 text-xs text-zinc-600">Browse listings and save favourites.</p>
            </button>
            <button
              type="button"
              onClick={() => onAccountIntentChange?.("selling")}
              className={`rounded-xl border p-3 text-left transition ${
                accountIntent === "selling"
                  ? "border-brand bg-brand-soft/60 ring-1 ring-brand/25"
                  : "border-zinc-200 bg-white hover:border-zinc-300"
              }`}
            >
              <p className="text-sm font-semibold text-zinc-900">I&apos;m selling</p>
              <p className="mt-1 text-xs text-zinc-600">Continue to seller profile setup after sign up.</p>
            </button>
          </div>
        </section>
      ) : (
        <section className="rounded-xl border border-brand/30 bg-brand-soft/40 p-4">
          <p className="text-sm font-semibold text-zinc-900">
            {sellerFlow === "yard" ? "Yard onboarding flow" : "Dealer onboarding flow"}
          </p>
          <p className="mt-1 text-xs text-zinc-600">
            This account will continue into a tailored seller setup after sign up.
          </p>
        </section>
      )}
      {sellerFlow ? (
        <section className="rounded-xl border border-zinc-200 bg-zinc-50/70 p-4">
          <div>
            <label htmlFor="businessNamePrefill" className="block text-sm font-medium text-zinc-700 mb-1">
              {sellerFlow === "yard" ? "Yard name" : "Dealer business name"}
            </label>
            <input
              id="businessNamePrefill"
              name="businessNamePrefill"
              type="text"
              placeholder={sellerFlow === "yard" ? "e.g. Heritage Reclamation Yard" : "e.g. North House Antiques"}
              className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-zinc-900 focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
            />
          </div>
          <div className="mt-3">
            <label htmlFor="yearsTrading" className="block text-sm font-medium text-zinc-700 mb-1">
              How long have you been trading? (years)
            </label>
            <input
              id="yearsTrading"
              name="yearsTrading"
              type="number"
              min={0}
              max={200}
              step={1}
              placeholder="e.g. 12"
              className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-zinc-900 focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
            />
          </div>
        </section>
      ) : null}
      <div>
        <label htmlFor="name" className="block text-sm font-medium text-zinc-700 mb-1">
          Name
        </label>
        <input
          id="name"
          name="name"
          type="text"
          autoComplete="name"
          className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-zinc-900 focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
        />
      </div>
      <div>
        <label htmlFor="email" className="block text-sm font-medium text-zinc-700 mb-1">
          Email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-zinc-900 focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
        />
      </div>
      <div>
        <label htmlFor="password" className="block text-sm font-medium text-zinc-700 mb-1">
          Password
        </label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="new-password"
          required
          minLength={8}
          className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-zinc-900 focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
        />
        <p className="text-xs text-zinc-500 mt-1">At least 8 characters</p>
      </div>
      <label className="flex items-start gap-2 rounded-lg border border-zinc-200 bg-zinc-50/70 p-3 text-sm text-zinc-700">
        <input
          name="agreeLegalHub"
          type="checkbox"
          required
          className="mt-0.5"
        />
        <span>
          I agree to the{" "}
          <a href="/legal-hub" target="_blank" rel="noopener noreferrer" className="font-medium text-brand underline">
            Legal hub documents
          </a>
          .
        </span>
      </label>
      <button
        type="submit"
        className="w-full rounded-lg bg-brand px-4 py-2.5 font-medium text-white hover:bg-brand-hover focus:outline-none focus:ring-2 focus:ring-brand focus:ring-offset-2"
      >
        {sellerFlow
          ? sellerFlow === "yard"
            ? "Sign up and start yard onboarding"
            : "Sign up and start dealer onboarding"
          : accountIntent === "selling"
            ? "Sign up and set up seller profile"
            : "Sign up and start browsing"}
      </button>
    </form>
  );
}

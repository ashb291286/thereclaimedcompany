"use client";

import { useActionState, useState } from "react";

type RegisterAction = (formData: FormData) => Promise<{ error?: string } | void>;

export function RegisterForm({ register }: { register: RegisterAction }) {
  const [accountIntent, setAccountIntent] = useState<"buying" | "selling">("buying");
  const [state, formAction] = useActionState(
    async (_: { error?: string } | null, formData: FormData) => {
      const result = await register(formData);
      return result ?? null;
    },
    null as { error?: string } | null
  );

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="accountIntent" value={accountIntent} />
      {state?.error && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          {state.error}
        </p>
      )}
      <section className="rounded-xl border border-zinc-200 bg-zinc-50/70 p-4">
        <p className="text-sm font-semibold text-zinc-900">How are you using The Reclaimed Company?</p>
        <p className="mt-1 text-xs text-zinc-600">
          Pick one to personalize your next step.
        </p>
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          <button
            type="button"
            onClick={() => setAccountIntent("buying")}
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
            onClick={() => setAccountIntent("selling")}
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
      <button
        type="submit"
        className="w-full rounded-lg bg-brand px-4 py-2.5 font-medium text-white hover:bg-brand-hover focus:outline-none focus:ring-2 focus:ring-brand focus:ring-offset-2"
      >
        {accountIntent === "selling" ? "Sign up and set up seller profile" : "Sign up and start browsing"}
      </button>
    </form>
  );
}

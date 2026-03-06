"use client";

import { useActionState } from "react";

type RegisterAction = (formData: FormData) => Promise<{ error?: string } | void>;

export function RegisterForm({ register }: { register: RegisterAction }) {
  const [state, formAction] = useActionState(
    async (_: { error?: string } | null, formData: FormData) => {
      const result = await register(formData);
      return result ?? null;
    },
    null as { error?: string } | null
  );

  return (
    <form action={formAction} className="space-y-4">
      {state?.error && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          {state.error}
        </p>
      )}
      <div>
        <label htmlFor="name" className="block text-sm font-medium text-zinc-700 mb-1">
          Name
        </label>
        <input
          id="name"
          name="name"
          type="text"
          autoComplete="name"
          className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-zinc-900 focus:border-amber-600 focus:outline-none focus:ring-1 focus:ring-amber-600"
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
          className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-zinc-900 focus:border-amber-600 focus:outline-none focus:ring-1 focus:ring-amber-600"
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
          className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-zinc-900 focus:border-amber-600 focus:outline-none focus:ring-1 focus:ring-amber-600"
        />
        <p className="text-xs text-zinc-500 mt-1">At least 8 characters</p>
      </div>
      <button
        type="submit"
        className="w-full rounded-lg bg-amber-600 px-4 py-2.5 font-medium text-white hover:bg-amber-700 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-2"
      >
        Sign up
      </button>
    </form>
  );
}

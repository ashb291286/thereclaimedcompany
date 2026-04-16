"use client";

import { useActionState } from "react";
import { claimImportedSellerProfileAction, type SellerClaimState } from "@/lib/actions/seller-claim";

const initialState: SellerClaimState = { status: "idle" };

export function ClaimProfileForm({
  sellerProfileId,
  profileLabel,
}: {
  sellerProfileId: string;
  profileLabel: string;
}) {
  const [state, formAction, pending] = useActionState(claimImportedSellerProfileAction, initialState);

  return (
    <form action={formAction} className="mt-4 space-y-4">
      <input type="hidden" name="sellerProfileId" value={sellerProfileId} />
      <p className="text-sm text-zinc-600">
        Enter the one-time claim code supplied by admin for <strong>{profileLabel}</strong>.
      </p>
      <label className="block text-sm">
        <span className="mb-1 block text-xs font-medium text-zinc-700">Claim code</span>
        <input
          name="claimCode"
          required
          autoComplete="one-time-code"
          placeholder="e.g. 9A2B7F1C4D88"
          className="w-full rounded border border-zinc-300 px-3 py-2 font-mono text-sm uppercase tracking-wide"
        />
      </label>
      <button
        type="submit"
        disabled={pending}
        className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-semibold text-white hover:bg-zinc-800 disabled:opacity-50"
      >
        {pending ? "Claiming…" : "Claim profile"}
      </button>
      {state.status === "error" ? (
        <p className="rounded bg-rose-50 px-3 py-2 text-sm text-rose-800">{state.message}</p>
      ) : null}
      {state.status === "success" ? (
        <p className="rounded bg-emerald-50 px-3 py-2 text-sm text-emerald-800">{state.message}</p>
      ) : null}
    </form>
  );
}


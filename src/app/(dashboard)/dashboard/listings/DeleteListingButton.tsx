"use client";

import { useEffect, useState } from "react";
import { sellerDeleteOwnListingAction } from "@/lib/actions/seller-listings";

export function DeleteListingButton({ listingId, title }: { listingId: string; title: string }) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded-lg border border-rose-200 px-3 py-1.5 text-sm font-medium text-rose-700 hover:bg-rose-50"
      >
        Delete
      </button>

      {open ? (
        <div className="fixed inset-0 z-[7200] flex items-center justify-center p-4" role="dialog" aria-modal="true">
          <button
            type="button"
            className="absolute inset-0 bg-black/45"
            aria-label="Close delete confirmation"
            onClick={() => setOpen(false)}
          />
          <div className="relative z-10 w-full max-w-md rounded-xl border border-zinc-200 bg-white p-4 shadow-2xl">
            <h2 className="text-base font-semibold text-zinc-900">Delete listing?</h2>
            <p className="mt-2 text-sm text-zinc-600">
              This will permanently delete <span className="font-medium text-zinc-900">{title}</span>. This action
              cannot be undone.
            </p>
            <div className="mt-4 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-lg border border-zinc-300 px-3 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50"
              >
                Cancel
              </button>
              <form action={sellerDeleteOwnListingAction}>
                <input type="hidden" name="listingId" value={listingId} />
                <button
                  type="submit"
                  className="rounded-lg bg-rose-600 px-3 py-2 text-sm font-semibold text-white hover:bg-rose-700"
                >
                  Yes, delete
                </button>
              </form>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}

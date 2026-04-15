"use client";

import { useEffect, useState } from "react";

export function MobileFiltersDrawer({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  useEffect(() => {
    const onOpen = () => setOpen(true);
    window.addEventListener("open-mobile-filters", onOpen);
    return () => window.removeEventListener("open-mobile-filters", onOpen);
  }, []);

  return (
    <>
      <div
        className={`fixed inset-0 z-[1200] bg-black/45 transition-opacity duration-200 md:hidden ${
          open ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
        onClick={() => setOpen(false)}
        aria-hidden
      />
      <div
        className={`fixed inset-x-0 bottom-0 z-[1300] max-h-[82dvh] overflow-y-auto rounded-t-2xl bg-white p-4 pb-8 shadow-2xl transition-transform duration-300 md:hidden ${
          open ? "translate-y-0" : "translate-y-full"
        }`}
        role="dialog"
        aria-modal="true"
        aria-label="Browse filters"
      >
        <div className="mb-3 flex items-center justify-between">
          <p className="text-sm font-semibold text-zinc-900">Refine listings</p>
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="rounded-md px-2 py-1 text-sm text-zinc-600 hover:bg-zinc-100"
          >
            Close
          </button>
        </div>
        {children}
      </div>
    </>
  );
}

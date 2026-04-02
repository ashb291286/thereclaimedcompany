"use client";

import { useState } from "react";
import { OpeningHoursEditor } from "@/components/OpeningHoursEditor";

export function YardFieldsToggle() {
  const [sellerType, setSellerType] = useState<"individual" | "reclamation_yard">("individual");
  const showYard = sellerType === "reclamation_yard";

  return (
    <>
      <div>
        <label className="block text-sm font-medium text-zinc-700 mb-2">
          I am selling as
        </label>
        <input type="hidden" name="sellerType" value={sellerType} />
        <div className="grid gap-3 sm:grid-cols-2">
          <button
            type="button"
            onClick={() => setSellerType("individual")}
            className={`rounded-xl border p-4 text-left transition ${
              sellerType === "individual"
                ? "border-brand bg-brand-soft/60 ring-1 ring-brand/25"
                : "border-zinc-200 bg-white hover:border-zinc-300"
            }`}
          >
            <p className="text-sm font-semibold text-zinc-900">Individual seller</p>
            <p className="mt-1 text-xs text-zinc-600">Selling your own reclaimed items.</p>
          </button>
          <button
            type="button"
            onClick={() => setSellerType("reclamation_yard")}
            className={`rounded-xl border p-4 text-left transition ${
              sellerType === "reclamation_yard"
                ? "border-brand bg-brand-soft/60 ring-1 ring-brand/25"
                : "border-zinc-200 bg-white hover:border-zinc-300"
            }`}
          >
            <p className="text-sm font-semibold text-zinc-900">Reclamation yard</p>
            <p className="mt-1 text-xs text-zinc-600">Business inventory and yard details.</p>
          </button>
        </div>
      </div>
      {showYard && (
        <div className="space-y-4">
          <div>
            <label htmlFor="businessName" className="block text-sm font-medium text-zinc-700 mb-1">
              Business name
            </label>
            <input
              id="businessName"
              name="businessName"
              type="text"
              placeholder="Your reclamation yard name"
              className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-zinc-900 focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
            />
          </div>
          <OpeningHoursEditor />
        </div>
      )}
    </>
  );
}

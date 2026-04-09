"use client";

import { useState } from "react";
import { OpeningHoursEditor } from "@/components/OpeningHoursEditor";

export function YardFieldsToggle() {
  const [sellerType, setSellerType] = useState<"individual" | "reclamation_yard">("individual");
  const [vatRegistered, setVatRegistered] = useState(false);
  const showYard = sellerType === "reclamation_yard";

  return (
    <>
      <div>
        <label className="block text-sm font-medium text-zinc-700 mb-2">
          I am selling as
        </label>
        <input type="hidden" name="sellerType" value={sellerType} />
        <input type="hidden" name="vatRegistered" value={vatRegistered ? "yes" : "no"} />
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
          <fieldset className="rounded-xl border border-zinc-200 bg-zinc-50/80 p-4">
            <legend className="px-1 text-sm font-semibold text-zinc-900">VAT (UK)</legend>
            <p className="mt-1 text-xs text-zinc-600">
              VAT-registered yards enter prices <strong>excluding</strong> VAT. Buyers pay 20% UK VAT at checkout; we
              show them the total.
            </p>
            <div className="mt-3 space-y-2">
              <label className="flex cursor-pointer gap-3 rounded-lg border border-zinc-200 bg-white p-3 text-sm has-[:checked]:border-brand has-[:checked]:ring-1 has-[:checked]:ring-brand/25">
                <input
                  type="radio"
                  name="vatChoice"
                  className="mt-0.5"
                  checked={!vatRegistered}
                  onChange={() => setVatRegistered(false)}
                />
                <span>
                  <span className="font-medium text-zinc-900">Not VAT registered</span>
                  <span className="mt-0.5 block text-xs text-zinc-600">
                    Prices you enter are the full amount buyers pay.
                  </span>
                </span>
              </label>
              <label className="flex cursor-pointer gap-3 rounded-lg border border-zinc-200 bg-white p-3 text-sm has-[:checked]:border-brand has-[:checked]:ring-1 has-[:checked]:ring-brand/25">
                <input
                  type="radio"
                  name="vatChoice"
                  className="mt-0.5"
                  checked={vatRegistered}
                  onChange={() => setVatRegistered(true)}
                />
                <span>
                  <span className="font-medium text-zinc-900">VAT registered</span>
                  <span className="mt-0.5 block text-xs text-zinc-600">
                    Prices exclude VAT — 20% is added for buyers at checkout.
                  </span>
                </span>
              </label>
            </div>
          </fieldset>
          <OpeningHoursEditor />
        </div>
      )}
    </>
  );
}

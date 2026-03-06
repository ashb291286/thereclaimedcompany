"use client";

import { useState } from "react";

export function YardFieldsToggle() {
  const [sellerType, setSellerType] = useState<"individual" | "reclamation_yard">("individual");
  const showYard = sellerType === "reclamation_yard";

  return (
    <>
      <div>
        <label className="block text-sm font-medium text-zinc-700 mb-2">
          I am selling as
        </label>
        <div className="flex gap-4">
          <label className="flex cursor-pointer items-center gap-2">
            <input
              type="radio"
              name="sellerType"
              value="individual"
              checked={sellerType === "individual"}
              onChange={() => setSellerType("individual")}
              className="h-4 w-4 border-zinc-300 text-amber-600 focus:ring-amber-500"
            />
            <span className="text-zinc-900">Individual</span>
          </label>
          <label className="flex cursor-pointer items-center gap-2">
            <input
              type="radio"
              name="sellerType"
              value="reclamation_yard"
              checked={sellerType === "reclamation_yard"}
              onChange={() => setSellerType("reclamation_yard")}
              className="h-4 w-4 border-zinc-300 text-amber-600 focus:ring-amber-500"
            />
            <span className="text-zinc-900">Reclamation yard</span>
          </label>
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
              className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-zinc-900 focus:border-amber-600 focus:outline-none focus:ring-1 focus:ring-amber-600"
            />
          </div>
          <div>
            <label htmlFor="openingHours" className="block text-sm font-medium text-zinc-700 mb-1">
              Opening hours (optional)
            </label>
            <input
              id="openingHours"
              name="openingHours"
              type="text"
              placeholder="e.g. Mon–Sat 9am–5pm"
              className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-zinc-900 focus:border-amber-600 focus:outline-none focus:ring-1 focus:ring-amber-600"
            />
          </div>
        </div>
      )}
    </>
  );
}

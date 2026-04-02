"use client";

import { useState } from "react";
import { createDrivenVehicleFromGarageAction } from "@/app/driven/actions";
import { useFormStatus } from "react-dom";

function SubmitLabel() {
  const { pending } = useFormStatus();
  return pending ? "Saving…" : "Create vehicle & continue";
}

const ACQUIRED = [
  { value: "Private purchase", label: "Private purchase" },
  { value: "Dealer", label: "Dealer" },
  { value: "Auction", label: "Auction" },
  { value: "Inheritance / gift", label: "Inheritance / gift" },
  { value: "Other", label: "Other" },
] as const;

const SELLING = [
  { value: "yes", label: "Yes — planning to list" },
  { value: "not_yet", label: "Not yet" },
  { value: "no", label: "No — keeping" },
] as const;

export function DrivenAddCarForm({ error }: { error?: string | null }) {
  const [reg, setReg] = useState("");
  const [lookupStatus, setLookupStatus] = useState<string | null>(null);

  async function lookupDvla() {
    if (!reg.trim()) return;
    setLookupStatus("Looking up…");
    try {
      const res = await fetch(`/api/driven/dvla?reg=${encodeURIComponent(reg.trim())}`);
      const data = (await res.json()) as {
        make?: string | null;
        model?: string | null;
        year?: number | null;
        colour?: string | null;
        source?: string;
      };
      const mk = document.getElementById("driven-make") as HTMLInputElement | null;
      const md = document.getElementById("driven-model") as HTMLInputElement | null;
      const yr = document.getElementById("driven-year") as HTMLInputElement | null;
      const cl = document.getElementById("driven-colour") as HTMLInputElement | null;
      if (mk && data.make) mk.value = data.make;
      if (md && data.model) md.value = data.model;
      if (yr && data.year) yr.value = String(data.year);
      if (cl && data.colour) cl.value = data.colour;
      setLookupStatus(data.source === "mock" ? "Filled from demo lookup (set DVLA_API_KEY for live data)." : "Lookup complete.");
    } catch {
      setLookupStatus("Lookup failed — enter details manually.");
    }
  }

  return (
    <form action={createDrivenVehicleFromGarageAction} className="space-y-6 border border-driven-warm bg-white p-6">
      {error ? (
        <p className="font-[family-name:var(--font-driven-mono)] text-xs text-driven-accent">{error}</p>
      ) : null}
      <div>
        <label htmlFor="driven-reg" className="font-[family-name:var(--font-driven-mono)] text-[10px] uppercase tracking-wide text-driven-muted">
          Registration
        </label>
        <div className="mt-2 flex flex-wrap gap-2">
          <input
            id="driven-reg"
            name="registration"
            value={reg}
            onChange={(e) => setReg(e.target.value)}
            required
            className="min-w-[8rem] flex-1 border border-driven-warm bg-driven-paper px-3 py-2 font-[family-name:var(--font-driven-mono)] text-sm uppercase text-driven-ink"
            placeholder="AB12 CDE"
          />
          <button
            type="button"
            onClick={() => void lookupDvla()}
            className="border border-driven-ink px-4 py-2 font-[family-name:var(--font-driven-mono)] text-[10px] uppercase tracking-wide text-driven-ink hover:bg-driven-warm"
          >
            DVLA lookup
          </button>
        </div>
        {lookupStatus ? <p className="mt-2 text-xs text-driven-muted">{lookupStatus}</p> : null}
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="driven-make" className="font-[family-name:var(--font-driven-mono)] text-[10px] uppercase text-driven-muted">
            Make
          </label>
          <input id="driven-make" name="make" required className="mt-1 w-full border border-driven-warm bg-driven-paper px-3 py-2 text-sm" />
        </div>
        <div>
          <label htmlFor="driven-model" className="font-[family-name:var(--font-driven-mono)] text-[10px] uppercase text-driven-muted">
            Model
          </label>
          <input id="driven-model" name="model" required className="mt-1 w-full border border-driven-warm bg-driven-paper px-3 py-2 text-sm" />
        </div>
        <div>
          <label htmlFor="driven-year" className="font-[family-name:var(--font-driven-mono)] text-[10px] uppercase text-driven-muted">
            Year
          </label>
          <input id="driven-year" name="year" type="number" required className="mt-1 w-full border border-driven-warm bg-driven-paper px-3 py-2 text-sm" />
        </div>
        <div>
          <label htmlFor="driven-colour" className="font-[family-name:var(--font-driven-mono)] text-[10px] uppercase text-driven-muted">
            Colour
          </label>
          <input id="driven-colour" name="colour" className="mt-1 w-full border border-driven-warm bg-driven-paper px-3 py-2 text-sm" />
        </div>
        <div className="sm:col-span-2">
          <label htmlFor="driven-mileage" className="font-[family-name:var(--font-driven-mono)] text-[10px] uppercase text-driven-muted">
            Current mileage
          </label>
          <input id="driven-mileage" name="mileage" type="number" className="mt-1 w-full border border-driven-warm bg-driven-paper px-3 py-2 text-sm" />
        </div>
      </div>
      <div>
        <label htmlFor="driven-how" className="font-[family-name:var(--font-driven-mono)] text-[10px] uppercase text-driven-muted">
          How acquired
        </label>
        <select id="driven-how" name="howAcquired" required className="mt-1 w-full border border-driven-warm bg-driven-paper px-3 py-2 text-sm">
          <option value="">Select…</option>
          {ACQUIRED.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </div>
      <div>
        <span className="font-[family-name:var(--font-driven-mono)] text-[10px] uppercase text-driven-muted">Selling intention</span>
        <div className="mt-2 space-y-2">
          {SELLING.map((o) => (
            <label key={o.value} className="flex items-center gap-2 font-[family-name:var(--font-driven-body)] text-sm">
              <input type="radio" name="sellingIntention" value={o.value} required className="border-driven-warm" />
              {o.label}
            </label>
          ))}
        </div>
      </div>
      <button
        type="submit"
        className="w-full border border-driven-ink bg-driven-ink py-3 font-[family-name:var(--font-driven-mono)] text-xs uppercase tracking-wide text-driven-paper disabled:opacity-50"
      >
        <SubmitLabel />
      </button>
    </form>
  );
}

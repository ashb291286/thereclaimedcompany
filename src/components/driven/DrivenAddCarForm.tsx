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

const INSPECT_FIELDS = [
  { name: "inspectBodyPaint" as const, label: "Body & paint" },
  { name: "inspectMechanical" as const, label: "Mechanical" },
  { name: "inspectInterior" as const, label: "Interior" },
  { name: "inspectUnderbody" as const, label: "Underbody" },
  { name: "inspectElectrics" as const, label: "Electrics" },
];

export function DrivenAddCarForm({ error }: { error?: string | null }) {
  const [reg, setReg] = useState("");
  const [lookupStatus, setLookupStatus] = useState<string | null>(null);
  const [imageUrls, setImageUrls] = useState<string[]>([]);
  const [uploadingImages, setUploadingImages] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [selfInspect, setSelfInspect] = useState(false);

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

  async function onPhotosChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    e.target.value = "";
    if (!files?.length) return;
    setUploadError(null);
    setUploadingImages(true);
    try {
      for (const file of Array.from(files)) {
        if (!file.type.startsWith("image/")) {
          setUploadError("Only image files are accepted.");
          continue;
        }
        const formData = new FormData();
        formData.set("file", file);
        formData.set("folder", "driven-vehicle");
        const res = await fetch("/api/upload", { method: "POST", body: formData });
        const data = (await res.json().catch(() => ({}))) as { url?: string; error?: string };
        if (!res.ok) {
          throw new Error(data.error ?? "Upload failed");
        }
        const uploadedUrl = data.url;
        if (uploadedUrl) setImageUrls((prev) => [...prev, uploadedUrl]);
      }
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploadingImages(false);
    }
  }

  function removeImage(url: string) {
    setImageUrls((prev) => prev.filter((u) => u !== url));
  }

  return (
    <form action={createDrivenVehicleFromGarageAction} className="space-y-6 border border-driven-warm bg-white p-6">
      <input type="hidden" name="initialImageUrls" value={imageUrls.join(",")} />

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

      <div>
        <span className="font-[family-name:var(--font-driven-mono)] text-[10px] uppercase tracking-wide text-driven-muted">
          Photos (optional)
        </span>
        <p className="mt-1 text-xs text-driven-muted">Add images of the vehicle; you can add more later from your record.</p>
        <div className="mt-2 flex flex-wrap items-center gap-3">
          <label className="cursor-pointer border border-driven-warm bg-driven-paper px-3 py-2 font-[family-name:var(--font-driven-mono)] text-[10px] uppercase tracking-wide text-driven-ink hover:bg-driven-warm">
            {uploadingImages ? "Uploading…" : "Choose images"}
            <input type="file" accept="image/*" multiple className="sr-only" onChange={(e) => void onPhotosChange(e)} disabled={uploadingImages} />
          </label>
        </div>
        {uploadError ? <p className="mt-2 text-xs text-driven-accent">{uploadError}</p> : null}
        {imageUrls.length > 0 ? (
          <ul className="mt-4 flex flex-wrap gap-2">
            {imageUrls.map((url) => (
              <li key={url} className="relative h-20 w-28 overflow-hidden border border-driven-warm bg-driven-warm">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={url} alt="" className="h-full w-full object-cover" />
                <button
                  type="button"
                  onClick={() => removeImage(url)}
                  className="absolute right-1 top-1 bg-driven-ink/80 px-1.5 py-0.5 font-[family-name:var(--font-driven-mono)] text-[9px] uppercase text-driven-paper"
                >
                  Remove
                </button>
              </li>
            ))}
          </ul>
        ) : null}
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

      <fieldset className="border border-driven-warm bg-driven-paper/30 p-4">
        <legend className="px-1 font-[family-name:var(--font-driven-mono)] text-[10px] uppercase tracking-wide text-driven-muted">
          Personal condition check (optional)
        </legend>
        <p className="mt-2 text-xs leading-relaxed text-driven-muted">
          Scores are your personal opinion only, not a professional inspection. An independent inspection is recommended before
          buying or selling.
        </p>
        <label className="mt-4 flex items-start gap-2 text-sm">
          <input
            type="checkbox"
            name="selfInspect"
            value="on"
            className="mt-1 border-driven-warm"
            checked={selfInspect}
            onChange={(e) => setSelfInspect(e.target.checked)}
          />
          <span>I want to add my own 0–100 scores for body &amp; paint, mechanical, interior, underbody, and electrics.</span>
        </label>

        {selfInspect ? (
          <div className="mt-4 space-y-4 border-t border-driven-warm pt-4">
            <div className="grid gap-3 sm:grid-cols-2">
              {INSPECT_FIELDS.map(({ name, label }) => (
                <div key={name}>
                  <label htmlFor={name} className="font-[family-name:var(--font-driven-mono)] text-[10px] uppercase text-driven-muted">
                    {label} (0–100)
                  </label>
                  <input
                    id={name}
                    name={name}
                    type="number"
                    min={0}
                    max={100}
                    required={selfInspect}
                    className="mt-1 w-full border border-driven-warm bg-white px-3 py-2 text-sm"
                  />
                </div>
              ))}
            </div>
            <label className="flex items-start gap-2 text-sm">
              <input
                type="checkbox"
                name="selfInspectDisclaimer"
                value="on"
                className="mt-1 border-driven-warm"
                required={selfInspect}
              />
              <span>
                I understand these scores reflect my personal view only and that a separate, independent check is recommended.
              </span>
            </label>
          </div>
        ) : null}
      </fieldset>

      <button
        type="submit"
        className="w-full border border-driven-ink bg-driven-ink py-3 font-[family-name:var(--font-driven-mono)] text-xs uppercase tracking-wide text-driven-paper disabled:opacity-50"
      >
        <SubmitLabel />
      </button>
    </form>
  );
}

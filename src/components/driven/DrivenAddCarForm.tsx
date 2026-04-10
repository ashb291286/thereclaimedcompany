"use client";

import { useRef, useState } from "react";
import { createDrivenVehicleFromGarageAction } from "@/app/driven/actions";
import { useFormStatus } from "react-dom";
import { ListingImageCropModal } from "@/app/(dashboard)/dashboard/sell/ListingImageCropModal";
import type { DvlaVehicleEnquiryData } from "@/lib/dvla-vehicle-enquiry";
import {
  DVLA_VES_DISPLAY_ORDER,
  DVLA_VES_LABELS,
  formatDvlaValueForDisplay,
} from "@/lib/dvla-ves-display";

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

type DvlaLookupJson = {
  error?: string;
  registration?: string;
  make?: string | null;
  model?: string | null;
  year?: number | null;
  colour?: string | null;
  source?: string;
  fuelType?: string | null;
  motStatus?: string | null;
  motExpiryDate?: string | null;
  taxStatus?: string | null;
  taxDueDate?: string | null;
  dvla?: DvlaVehicleEnquiryData;
};

export function DrivenAddCarForm({ error }: { error?: string | null }) {
  const [reg, setReg] = useState("");
  const [dvlaSnapshot, setDvlaSnapshot] = useState<DvlaVehicleEnquiryData | null>(null);
  const [lookupStatus, setLookupStatus] = useState<string | null>(null);
  const [imageUrls, setImageUrls] = useState<string[]>([]);
  const [uploadingImages, setUploadingImages] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [selfInspect, setSelfInspect] = useState(false);
  const cropBlobUrlRef = useRef<string | null>(null);
  const [cropState, setCropState] = useState<{ src: string; fileName: string } | null>(null);

  async function lookupDvla() {
    if (!reg.trim()) return;
    setLookupStatus("Looking up…");
    try {
      const res = await fetch(`/api/driven/dvla?reg=${encodeURIComponent(reg.trim())}`);
      const data = (await res.json()) as DvlaLookupJson;
      if (!res.ok) {
        setDvlaSnapshot(null);
        setLookupStatus(data.error ?? "Lookup failed — enter details manually.");
        return;
      }
      if (data.registration) {
        setReg(data.registration);
      }
      if (data.dvla) {
        setDvlaSnapshot(data.dvla);
      } else {
        setDvlaSnapshot(null);
      }
      const mk = document.getElementById("driven-make") as HTMLInputElement | null;
      const md = document.getElementById("driven-model") as HTMLInputElement | null;
      const yr = document.getElementById("driven-year") as HTMLInputElement | null;
      const cl = document.getElementById("driven-colour") as HTMLInputElement | null;
      if (mk && data.make) mk.value = data.make;
      if (md && data.model) md.value = data.model;
      if (yr && data.year != null) yr.value = String(data.year);
      if (cl && data.colour) cl.value = data.colour;
      if (data.source === "mock") {
        setLookupStatus(
          "Demo VES response applied — full field list below. Set DVLA_API_KEY for live DVLA data."
        );
      } else {
        const bits = [data.taxStatus, data.motStatus, data.fuelType].filter(Boolean);
        setLookupStatus(
          bits.length
            ? `DVLA data applied — check the record below. Model is not returned by DVLA; add it manually. (${bits.join(" · ")})`
            : "DVLA data applied — check the record below. Model is not returned by DVLA; add it manually."
        );
      }
    } catch {
      setDvlaSnapshot(null);
      setLookupStatus("Lookup failed — enter details manually.");
    }
  }

  function openCropForFile(file: File) {
    const src = URL.createObjectURL(file);
    cropBlobUrlRef.current = src;
    setCropState({ src, fileName: file.name });
  }

  function closeCrop() {
    if (cropBlobUrlRef.current) {
      URL.revokeObjectURL(cropBlobUrlRef.current);
      cropBlobUrlRef.current = null;
    }
    setCropState(null);
  }

  /** Same pipeline as marketplace listings: crop to JPEG, then POST /api/upload (default listings/ path). */
  async function uploadCroppedFile(file: File) {
    setUploadingImages(true);
    setUploadError(null);
    try {
      const formData = new FormData();
      formData.set("file", file);
      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
        credentials: "same-origin",
      });
      const data = (await res.json().catch(() => ({}))) as { url?: string; error?: string };
      if (!res.ok) {
        throw new Error(data.error ?? "Upload failed");
      }
      if (data.url) {
        setImageUrls((prev) => [...prev, data.url as string]);
      } else {
        throw new Error("Upload did not return a URL.");
      }
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploadingImages(false);
      closeCrop();
    }
  }

  function handlePhotoFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setUploadError("Please choose an image file (JPEG, PNG, WebP, etc.).");
      return;
    }
    setUploadError(null);
    openCropForFile(file);
  }

  function removeImage(url: string) {
    setImageUrls((prev) => prev.filter((u) => u !== url));
  }

  return (
    <form action={createDrivenVehicleFromGarageAction} className="space-y-6 border border-driven-warm bg-white p-6">
      <input type="hidden" name="initialImageUrls" value={imageUrls.join(",")} />
      <input type="hidden" name="dvlaSnapshotJson" value={dvlaSnapshot ? JSON.stringify(dvlaSnapshot) : ""} />

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
            onChange={(e) => {
              const next = e.target.value;
              setReg(next);
              setDvlaSnapshot((prev) => {
                if (!prev) return null;
                const n = next.replace(/\s+/g, "").toUpperCase();
                const p = prev.registrationNumber.replace(/\s+/g, "").toUpperCase();
                return n === p ? prev : null;
              });
            }}
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

        {dvlaSnapshot ? (
          <details className="mt-4 border border-driven-warm bg-driven-paper/50" open>
            <summary className="cursor-pointer select-none px-3 py-2 font-[family-name:var(--font-driven-mono)] text-[10px] uppercase tracking-wide text-driven-ink hover:bg-driven-warm/30">
              DVLA Vehicle Enquiry (reference)
            </summary>
            <p className="border-t border-driven-warm px-3 py-2 text-xs leading-relaxed text-driven-muted">
              Official VES fields for this registration. Tax and MOT can change — confirm before you buy or sell. We
              store this snapshot on your passport when you create the vehicle.
            </p>
            <dl className="grid gap-2 border-t border-driven-warm px-3 py-3 sm:grid-cols-2">
              {DVLA_VES_DISPLAY_ORDER.map((key) => {
                const val = dvlaSnapshot[key];
                if (val === undefined || val === null) return null;
                if (typeof val === "string" && val.trim() === "") return null;
                return (
                  <div key={key} className="min-w-0 border-b border-driven-warm/40 pb-2 sm:border-0 sm:pb-0">
                    <dt className="font-[family-name:var(--font-driven-mono)] text-[9px] uppercase tracking-wider text-driven-muted">
                      {DVLA_VES_LABELS[key] ?? key}
                    </dt>
                    <dd className="mt-0.5 text-sm text-driven-ink">{formatDvlaValueForDisplay(key, val)}</dd>
                  </div>
                );
              })}
            </dl>
          </details>
        ) : null}
      </div>

      <div>
        <span className="font-[family-name:var(--font-driven-mono)] text-[10px] uppercase tracking-wide text-driven-muted">
          Photos (optional)
        </span>
        <p className="mt-1 text-xs text-driven-muted">
          Same flow as marketplace listings: crop each photo, then we upload a JPEG to your storage. Add more from your
          record later.
        </p>
        <div className="mt-3 flex flex-wrap gap-3">
          {imageUrls.map((url) => (
            <div key={url} className="relative">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={url} alt="" className="h-24 w-24 border border-driven-warm object-cover" />
              <button
                type="button"
                onClick={() => removeImage(url)}
                className="absolute -right-2 -top-2 flex h-6 w-6 items-center justify-center rounded-full bg-red-500 text-xs text-white hover:bg-red-600"
                aria-label="Remove photo"
              >
                ×
              </button>
            </div>
          ))}
          <label className="flex h-24 w-24 cursor-pointer items-center justify-center border-2 border-dashed border-driven-warm bg-driven-paper hover:border-driven-ink hover:bg-driven-warm/40">
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handlePhotoFileChange}
              disabled={uploadingImages || !!cropState}
            />
            <span className="font-[family-name:var(--font-driven-mono)] text-xs text-driven-muted">
              {uploadingImages ? "…" : "+"}
            </span>
          </label>
        </div>
        {uploadError ? <p className="mt-2 text-xs text-driven-accent">{uploadError}</p> : null}
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

      {cropState ? (
        <ListingImageCropModal
          imageSrc={cropState.src}
          fileName={cropState.fileName}
          onCancel={closeCrop}
          onComplete={uploadCroppedFile}
        />
      ) : null}
    </form>
  );
}

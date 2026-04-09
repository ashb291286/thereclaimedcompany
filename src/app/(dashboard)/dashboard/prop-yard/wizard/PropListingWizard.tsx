"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import type { Condition } from "@/generated/prisma/client";
import { CONDITION_LABELS } from "@/lib/constants";
import { ListingImageCropModal } from "../../sell/ListingImageCropModal";
import { createPropComprehensiveListingAction } from "@/lib/actions/prop-yard";
import {
  PROP_CATEGORIES,
  PROP_SUBCATEGORIES,
  PROP_ERAS,
  PROP_STYLES,
  PROP_ORIGINS,
  PROP_GENRES,
  PROP_INTERIOR_SETTINGS,
  PROP_EXTERIOR_SETTINGS,
  PROP_STUDIOS,
} from "@/lib/prop-yard-taxonomy";

const STEP_TOTAL = 7;

type Category = { id: string; name: string };
type PropWizardListing = {
  id: string;
  title: string;
  price: number;
  visibleOnMarketplace: boolean;
  images: string[];
  hasPropOffer: boolean;
};

const SUCCESS = "/dashboard/prop-yard?wizard=1";
const ERROR_RETURN = "/dashboard/prop-yard/wizard";
const DRAFT_KEY = "prop-yard-wizard-draft-v1";
const SIMILAR_KEY = "prop-yard-wizard-last-published-v1";

type WizardState = {
  name: string;
  description: string;
  category: string;
  subcategory: string;
  quantityAvailable: string;
  dimensionsH: string;
  dimensionsW: string;
  dimensionsD: string;
  weightKg: string;
  condition: Condition;
  conditionNotes: string;
  eras: string[];
  dateSpecific: string;
  styles: string[];
  geographicOrigin: string;
  genres: string[];
  settingInterior: string[];
  settingExterior: string[];
  flagSuitableCloseup: boolean;
  flagCameraReady: boolean;
  flagPreviouslyUsedOnProduction: boolean;
  flagFragile: boolean;
  flagOutdoorSuitable: boolean;
  flagMultiplesAvailable: boolean;
  flagCanSourceMatching: boolean;
  flagStudioDelivery: boolean;
  productionName: string;
  studios: string[];
  studioOtherText: string;
  hireEnabled: boolean;
  saleEnabled: boolean;
  hirePriceWeekGbp: string;
  hireMinPeriod: string;
  hireDepositPct: string;
  damageWaiverTerms: string;
  salePriceGbp: string;
  saleOffers: boolean;
  reservePriceGbp: string;
  images: string[];
  detailShots: { url: string; label: string }[];
  collectionAddress: string;
  collectionAvailable: boolean;
  collectionOpeningHours: string;
  deliveryAvailable: boolean;
  deliveryRadiusMiles: string;
  deliveryNationwide: boolean;
  deliveryPriceType: string;
  deliveryPriceGbp: string;
  specialistHandling: boolean;
  regularStudioRun: boolean;
  specialistTransportRequired: boolean;
  deliveryLeadTime: string;
};

const initialState: WizardState = {
  name: "",
  description: "",
  category: PROP_CATEGORIES[0],
  subcategory: PROP_SUBCATEGORIES[PROP_CATEGORIES[0]][0],
  quantityAvailable: "1",
  dimensionsH: "",
  dimensionsW: "",
  dimensionsD: "",
  weightKg: "",
  condition: "used",
  conditionNotes: "",
  eras: [],
  dateSpecific: "",
  styles: [],
  geographicOrigin: PROP_ORIGINS[0],
  genres: [],
  settingInterior: [],
  settingExterior: [],
  flagSuitableCloseup: false,
  flagCameraReady: false,
  flagPreviouslyUsedOnProduction: false,
  flagFragile: false,
  flagOutdoorSuitable: false,
  flagMultiplesAvailable: false,
  flagCanSourceMatching: false,
  flagStudioDelivery: false,
  productionName: "",
  studios: [],
  studioOtherText: "",
  hireEnabled: true,
  saleEnabled: false,
  hirePriceWeekGbp: "",
  hireMinPeriod: "ONE_WEEK",
  hireDepositPct: "100",
  damageWaiverTerms: "",
  salePriceGbp: "",
  saleOffers: false,
  reservePriceGbp: "",
  images: [],
  detailShots: [],
  collectionAddress: "",
  collectionAvailable: true,
  collectionOpeningHours: "",
  deliveryAvailable: false,
  deliveryRadiusMiles: "50",
  deliveryNationwide: false,
  deliveryPriceType: "POA",
  deliveryPriceGbp: "",
  specialistHandling: false,
  regularStudioRun: false,
  specialistTransportRequired: false,
  deliveryLeadTime: "2-3 days",
};

function isCondition(v: string): v is Condition {
  return Object.prototype.hasOwnProperty.call(CONDITION_LABELS, v);
}

function normalizeWizardPayload(raw: unknown): WizardState {
  if (!raw || typeof raw !== "object") return { ...initialState };
  const p = raw as Record<string, unknown>;
  const merged = { ...initialState, ...p } as WizardState & Record<string, unknown>;

  if (!merged.description) {
    const short = String(p.descriptionShort ?? "").trim();
    const full = String(p.descriptionFull ?? "").trim();
    if (short || full) merged.description = [short, full].filter(Boolean).join("\n\n");
  }

  const cond = String(p.condition ?? merged.condition ?? "").trim();
  merged.condition = isCondition(cond) ? cond : "used";

  return merged;
}

function FieldGroup({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <fieldset className="rounded-lg border border-zinc-200 bg-white px-3 pb-2.5 pt-1">
      <legend className="px-1 text-xs font-medium text-zinc-600">{label}</legend>
      <div className="pt-1">{children}</div>
    </fieldset>
  );
}

function ToggleRow({
  label,
  sublabel,
  checked,
  onChange,
}: {
  label: string;
  sublabel?: string;
  checked: boolean;
  onChange: (next: boolean) => void;
}) {
  return (
    <div className="flex items-start justify-between gap-4 rounded-lg border border-zinc-100 bg-zinc-50/80 px-3 py-2.5">
      <div className="min-w-0">
        <p className="text-sm font-medium text-zinc-900">{label}</p>
        {sublabel ? <p className="mt-0.5 text-xs text-zinc-500">{sublabel}</p> : null}
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`relative mt-0.5 h-7 w-12 shrink-0 rounded-full transition-colors ${
 checked ? "bg-amber-800" : "bg-zinc-300"
        }`}
      >
        <span
          className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow transition-transform ${
            checked ? "translate-x-6" : "translate-x-1"
          }`}
        />
      </button>
    </div>
  );
}

const FLAG_ROWS: {
  key: keyof Pick<
    WizardState,
    | "flagSuitableCloseup"
    | "flagCameraReady"
    | "flagPreviouslyUsedOnProduction"
    | "flagFragile"
    | "flagOutdoorSuitable"
    | "flagMultiplesAvailable"
    | "flagCanSourceMatching"
    | "flagStudioDelivery"
  >;
  label: string;
  sub?: string;
}[] = [
  { key: "flagSuitableCloseup", label: "Suitable for close-ups", sub: "Reads well in tight foreground shots." },
  { key: "flagCameraReady", label: "Camera ready", sub: "Clean, presentable, ready to shoot." },
  {
    key: "flagPreviouslyUsedOnProduction",
    label: "Previously used on screen",
    sub: "If yes, add the production name below (may require verification).",
  },
  { key: "flagFragile", label: "Fragile", sub: "Needs careful handling / packing." },
  { key: "flagOutdoorSuitable", label: "Outdoor suitable", sub: "Can be used in exterior sets." },
  { key: "flagMultiplesAvailable", label: "Multiples available", sub: "More than one identical or similar unit." },
  { key: "flagCanSourceMatching", label: "Can source matching pairs", sub: "You can supply additional matching items." },
  { key: "flagStudioDelivery", label: "Studio delivery", sub: "You can deliver to studios / stages where applicable." },
];

export function PropListingWizard({
  categories: _categories,
}: {
  listings: PropWizardListing[];
  categories: Category[];
  pctLabel: number;
  initialListingId?: string;
  initialMode?: "link" | "hire_only";
}) {
  void _categories;
  const [step, setStep] = useState(1);
  const [state, setState] = useState<WizardState>(initialState);
  const [errors, setErrors] = useState<string[]>([]);
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved">("idle");
  const [submitIntent, setSubmitIntent] = useState<"publish" | "draft">("publish");
  const [aiSuggestions, setAiSuggestions] = useState<Record<string, string[]>>({});
  const [cropState, setCropState] = useState<{ src: string; fileName: string } | null>(null);
  const cropBlobUrlRef = useRef<string | null>(null);
  const submitRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    const saved = localStorage.getItem(DRAFT_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved) as unknown;
        setState(normalizeWizardPayload(parsed));
      } catch {
        /* ignore */
      }
    }
    fetch("/api/prop-yard/draft")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (d?.draft?.payload) setState((s) => normalizeWizardPayload({ ...s, ...d.draft.payload }));
      })
      .catch(() => {});
    try {
      const similar = new URLSearchParams(window.location.search).get("similar");
      if (similar === "1") {
        const prev = localStorage.getItem(SIMILAR_KEY);
        if (prev) {
          const parsed = normalizeWizardPayload(JSON.parse(prev) as unknown);
          setState((s) => ({
            ...s,
            ...parsed,
            images: [],
            detailShots: [],
            dimensionsH: "",
            dimensionsW: "",
            dimensionsD: "",
            weightKg: "",
            hirePriceWeekGbp: "",
            salePriceGbp: "",
            reservePriceGbp: "",
          }));
        }
      }
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    setSaveState("saving");
    const t = setTimeout(() => {
      localStorage.setItem(DRAFT_KEY, JSON.stringify(state));
      fetch("/api/prop-yard/draft", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ payload: state }),
      }).catch(() => {});
      setSaveState("saved");
    }, 800);
    return () => clearTimeout(t);
  }, [state]);

  function update(patch: Partial<WizardState>) {
    setState((s) => ({ ...s, ...patch }));
  }

  function toggleArray<K extends keyof WizardState>(key: K, value: string) {
    const arr = (state[key] as unknown as string[]) ?? [];
    const next = arr.includes(value) ? arr.filter((x) => x !== value) : [...arr, value];
    update({ [key]: next } as Partial<WizardState>);
  }

  function validateCurrentStep(): boolean {
    const e: string[] = [];
    if (step === 1) {
      if (!state.name.trim()) e.push("Item name is required.");
      if (!state.description.trim()) e.push("Description is required.");
      if (!state.category) e.push("Category is required.");
      if (!state.quantityAvailable || Number(state.quantityAvailable) < 1) e.push("Quantity available is required.");
      if (!isCondition(state.condition)) e.push("Choose a valid condition.");
    } else if (step === 2) {
      if (state.eras.length === 0) e.push("Select at least one period / era.");
      if (state.styles.length === 0) e.push("Select at least one style.");
    } else if (step === 3) {
      if (state.genres.length === 0) e.push("Select at least one genre.");
      if (state.flagPreviouslyUsedOnProduction && !state.productionName.trim()) {
        e.push("Production name is required when “previously used on screen” is on.");
      }
    } else if (step === 4) {
      if (!state.hireEnabled && !state.saleEnabled) e.push("Enable hire and/or sale.");
      if (state.hireEnabled && (!state.hirePriceWeekGbp || Number(state.hirePriceWeekGbp) <= 0)) {
        e.push("Hire price per week is required.");
      }
      if (state.saleEnabled && (!state.salePriceGbp || Number(state.salePriceGbp) <= 0)) {
        e.push("Sale price is required.");
      }
    } else if (step === 5) {
      if (state.images.length < 1) e.push("Add at least one photo.");
    } else if (step === 6) {
      if (!state.collectionAddress.trim()) e.push("Collection location is required.");
      if (state.deliveryAvailable && state.deliveryPriceType === "FIXED" && (!state.deliveryPriceGbp || Number(state.deliveryPriceGbp) < 0)) {
        e.push("Set a fixed delivery price.");
      }
    }
    setErrors(e);
    return e.length === 0;
  }

  function next() {
    if (!validateCurrentStep()) return;
    setStep((s) => Math.min(STEP_TOTAL, s + 1));
  }

  function back() {
    setErrors([]);
    setStep((s) => Math.max(1, s - 1));
  }

  async function uploadCroppedFile(file: File) {
    try {
      const formData = new FormData();
      formData.set("file", file);
      const res = await fetch("/api/upload", { method: "POST", body: formData });
      const data = await res.json();
      if (!res.ok || !data?.url) throw new Error(data?.error ?? "Upload failed");
      update({
        images: [...state.images, data.url],
        detailShots: [...state.detailShots, { url: data.url, label: "Overall" }],
      });
    } finally {
      if (cropBlobUrlRef.current) URL.revokeObjectURL(cropBlobUrlRef.current);
      cropBlobUrlRef.current = null;
      setCropState(null);
    }
  }

  function addPhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    const src = URL.createObjectURL(file);
    cropBlobUrlRef.current = src;
    setCropState({ src, fileName: file.name });
  }

  async function runAiSuggest() {
    const hero = state.images[0];
    if (!hero) return;
    const res = await fetch("/api/prop-yard/ai-tags", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ imageUrl: hero }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data?.suggestions) return;
    const s = data.suggestions as Record<string, string[]>;
    setAiSuggestions({
      eras: Array.isArray(s.eras) ? s.eras : [],
      styles: Array.isArray(s.styles) ? s.styles : [],
      genres: Array.isArray(s.genres) ? s.genres : [],
      settingsInterior: Array.isArray(s.settingsInterior) ? s.settingsInterior : [],
      settingsExterior: Array.isArray(s.settingsExterior) ? s.settingsExterior : [],
    });
  }

  const completion = Math.round((step / STEP_TOTAL) * 100);
  const estimatedIncome = Number(state.hirePriceWeekGbp || "0") * 20;
  const commission = estimatedIncome * 0.12;
  const net = estimatedIncome - commission;
  const subcategoryOptions = PROP_SUBCATEGORIES[state.category] ?? ["Other"];

  return (
    <div className="mx-auto max-w-5xl">
      <div className="rounded-xl border border-zinc-200 bg-white p-4">
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium text-zinc-700">
            Step {step} of {STEP_TOTAL}
          </p>
          <p className="text-xs text-zinc-500">
            {completion}% complete ·{" "}
            {saveState === "saving" ? "Saving..." : saveState === "saved" ? "Saved" : ""}
          </p>
        </div>
        <div className="mt-2 h-2 w-full rounded bg-zinc-100">
          <div className="h-2 rounded bg-amber-700 transition-all" style={{ width: `${completion}%` }} />
        </div>
      </div>

      <div className="mt-4 rounded-xl border border-zinc-200 bg-white p-5">
        {step === 1 && (
          <Step1
            state={state}
            update={update}
            subcategoryOptions={subcategoryOptions}
          />
        )}
        {step === 2 && <Step2 state={state} toggleArray={toggleArray} update={update} />}
        {step === 3 && <Step3 state={state} toggleArray={toggleArray} update={update} />}
        {step === 4 && (
          <Step4Hire
            state={state}
            update={update}
            estimatedIncome={estimatedIncome}
            commission={commission}
            net={net}
          />
        )}
        {step === 5 && (
          <Step5Media state={state} update={update} addPhoto={addPhoto} aiSuggestions={aiSuggestions} runAiSuggest={runAiSuggest} />
        )}
        {step === 6 && <Step6Logistics state={state} update={update} />}
        {step === 7 && <Step7Review state={state} />}
      </div>

      {errors.length > 0 ? (
        <div className="mt-3 rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">{errors.join(" ")}</div>
      ) : null}

      <div className="mt-5 flex flex-wrap gap-3">
        <button
          type="button"
          onClick={back}
          disabled={step === 1}
          className="rounded-lg border border-zinc-300 px-4 py-2 text-sm"
        >
          Back
        </button>
        {step < STEP_TOTAL ? (
          <button
            type="button"
            onClick={next}
            className="rounded-lg bg-amber-900 px-4 py-2 text-sm font-semibold text-white"
          >
            Continue
          </button>
        ) : (
          <>
            <button
              type="button"
              onClick={() => {
                localStorage.setItem(SIMILAR_KEY, JSON.stringify(state));
                setSubmitIntent("publish");
                submitRef.current?.requestSubmit();
              }}
              className="rounded-lg bg-amber-900 px-4 py-2 text-sm font-semibold text-white"
            >
              Publish listing
            </button>
            <button
              type="button"
              onClick={() => {
                setSubmitIntent("draft");
                submitRef.current?.requestSubmit();
              }}
              className="rounded-lg border border-zinc-300 px-4 py-2 text-sm"
            >
              Save as draft
            </button>
            <Link href="/prop-yard/search" className="rounded-lg border border-zinc-300 px-4 py-2 text-sm">
              Preview public listing
            </Link>
          </>
        )}
      </div>

      <form ref={submitRef} action={createPropComprehensiveListingAction} className="hidden">
        <input type="hidden" name="_successReturn" value={SUCCESS} />
        <input type="hidden" name="_errorReturn" value={ERROR_RETURN} />
        <input type="hidden" name="publishIntent" value={submitIntent} />
        <input type="hidden" name="payloadJson" value={JSON.stringify(state)} />
      </form>

      {cropState ? (
        <ListingImageCropModal
          imageSrc={cropState.src}
          fileName={cropState.fileName}
          onCancel={() => setCropState(null)}
          onComplete={uploadCroppedFile}
        />
      ) : null}
    </div>
  );
}

function Step1({
  state,
  update,
  subcategoryOptions,
}: {
  state: WizardState;
  update: (p: Partial<WizardState>) => void;
  subcategoryOptions: string[];
}) {
  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold">Step 1 — Basics</h2>
      <FieldGroup label="Item name">
        <input
          value={state.name}
          onChange={(e) => update({ name: e.target.value })}
          className="w-full border-0 bg-transparent px-0 py-1 text-sm outline-none ring-0"
          placeholder="e.g. Victorian cast iron grate"
        />
      </FieldGroup>
      <FieldGroup label="Description">
        <textarea
          value={state.description}
          onChange={(e) => update({ description: e.target.value })}
          rows={6}
          className="w-full resize-y border-0 bg-transparent px-0 py-1 text-sm outline-none ring-0"
          placeholder="Describe the item, dimensions in copy if helpful, faults, history…"
        />
      </FieldGroup>
      <div className="grid gap-3 sm:grid-cols-2">
        <FieldGroup label="Category">
          <select
            value={state.category}
            onChange={(e) =>
              update({
                category: e.target.value,
                subcategory: (PROP_SUBCATEGORIES[e.target.value] ?? ["Other"])[0],
              })
            }
            className="w-full border-0 bg-transparent py-1 text-sm outline-none"
          >
            {PROP_CATEGORIES.map((x) => (
              <option key={x} value={x}>
                {x}
              </option>
            ))}
          </select>
        </FieldGroup>
        <FieldGroup label="Subcategory">
          <select
            value={state.subcategory}
            onChange={(e) => update({ subcategory: e.target.value })}
            className="w-full border-0 bg-transparent py-1 text-sm outline-none"
          >
            {subcategoryOptions.map((x) => (
              <option key={x} value={x}>
                {x}
              </option>
            ))}
          </select>
        </FieldGroup>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <FieldGroup label="Quantity available">
          <input
            type="number"
            min={1}
            value={state.quantityAvailable}
            onChange={(e) => update({ quantityAvailable: e.target.value })}
            className="w-full border-0 bg-transparent py-1 text-sm outline-none"
          />
        </FieldGroup>
        <FieldGroup label="Height (cm)">
          <input
            value={state.dimensionsH}
            onChange={(e) => update({ dimensionsH: e.target.value })}
            className="w-full border-0 bg-transparent py-1 text-sm outline-none"
            placeholder="Optional"
          />
        </FieldGroup>
        <FieldGroup label="Width (cm)">
          <input
            value={state.dimensionsW}
            onChange={(e) => update({ dimensionsW: e.target.value })}
            className="w-full border-0 bg-transparent py-1 text-sm outline-none"
            placeholder="Optional"
          />
        </FieldGroup>
        <FieldGroup label="Depth (cm)">
          <input
            value={state.dimensionsD}
            onChange={(e) => update({ dimensionsD: e.target.value })}
            className="w-full border-0 bg-transparent py-1 text-sm outline-none"
            placeholder="Optional"
          />
        </FieldGroup>
      </div>
      <FieldGroup label="Weight (kg)">
        <input
          value={state.weightKg}
          onChange={(e) => update({ weightKg: e.target.value })}
          className="w-full border-0 bg-transparent py-1 text-sm outline-none"
          placeholder="Optional"
        />
      </FieldGroup>
      <FieldGroup label="Condition">
        <select
          value={state.condition}
          onChange={(e) => update({ condition: e.target.value as Condition })}
          className="w-full border-0 bg-transparent py-1 text-sm outline-none"
        >
          {(Object.keys(CONDITION_LABELS) as Condition[]).map((c) => (
            <option key={c} value={c}>
              {CONDITION_LABELS[c]}
            </option>
          ))}
        </select>
      </FieldGroup>
      <FieldGroup label="Condition notes (optional)">
        <textarea
          value={state.conditionNotes}
          onChange={(e) => update({ conditionNotes: e.target.value })}
          rows={3}
          className="w-full resize-y border-0 bg-transparent px-0 py-1 text-sm outline-none ring-0"
          placeholder="Known faults, repairs, wear — helps hirers and buyers."
        />
      </FieldGroup>
    </div>
  );
}

function Step2({
  state,
  toggleArray,
  update,
}: {
  state: WizardState;
  toggleArray: (key: keyof WizardState, value: string) => void;
  update: (p: Partial<WizardState>) => void;
}) {
  return (
    <div className="space-y-6">
      <h2 className="text-lg font-semibold">Step 2 — Period, style & origin</h2>
      <section>
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-500">Period / era</p>
        <div className="flex flex-wrap gap-2">
          {PROP_ERAS.map((x) => (
            <button
              type="button"
              key={x}
              onClick={() => toggleArray("eras", x)}
              className={`rounded-full border px-3 py-1 text-xs ${state.eras.includes(x) ? "bg-zinc-900 text-white" : ""}`}
            >
              {x}
            </button>
          ))}
        </div>
      </section>
      <FieldGroup label="Specific date or range (optional)">
        <input
          value={state.dateSpecific}
          onChange={(e) => update({ dateSpecific: e.target.value })}
          className="w-full border-0 bg-transparent py-1 text-sm outline-none"
          placeholder="e.g. c.1887"
        />
      </FieldGroup>
      <section>
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-500">Style</p>
        <div className="flex flex-wrap gap-2">
          {PROP_STYLES.map((x) => (
            <button
              type="button"
              key={x}
              onClick={() => toggleArray("styles", x)}
              className={`rounded-full border px-3 py-1 text-xs ${state.styles.includes(x) ? "bg-zinc-900 text-white" : ""}`}
            >
              {x}
            </button>
          ))}
        </div>
      </section>
      <FieldGroup label="Geographic origin">
        <select
          value={state.geographicOrigin}
          onChange={(e) => update({ geographicOrigin: e.target.value })}
          className="w-full border-0 bg-transparent py-1 text-sm outline-none"
        >
          {PROP_ORIGINS.map((x) => (
            <option key={x} value={x}>
              {x}
            </option>
          ))}
        </select>
      </FieldGroup>
    </div>
  );
}

function Step3({
  state,
  toggleArray,
  update,
}: {
  state: WizardState;
  toggleArray: (key: keyof WizardState, value: string) => void;
  update: (p: Partial<WizardState>) => void;
}) {
  return (
    <div className="space-y-6">
      <h2 className="text-lg font-semibold">Step 3 — Genre, production & suitability</h2>
      <section>
        <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-zinc-500">Genre</p>
        <p className="mb-2 text-xs text-zinc-500">How productions search for this kind of piece (period drama, horror, etc.).</p>
        <div className="flex flex-wrap gap-2">
          {PROP_GENRES.map((x) => (
            <button
              type="button"
              key={x}
              onClick={() => toggleArray("genres", x)}
              className={`rounded-full border px-3 py-1 text-xs ${state.genres.includes(x) ? "bg-zinc-900 text-white" : ""}`}
            >
              {x}
            </button>
          ))}
        </div>
      </section>
      <section>
        <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-zinc-500">Interior settings</p>
        <p className="mb-2 text-xs text-zinc-500">Typical rooms or interior looks this prop suits.</p>
        <div className="flex flex-wrap gap-2">
          {PROP_INTERIOR_SETTINGS.map((x) => (
            <button
              type="button"
              key={x}
              onClick={() => toggleArray("settingInterior", x)}
              className={`rounded-full border px-3 py-1 text-xs ${
                state.settingInterior.includes(x) ? "bg-zinc-900 text-white" : ""
              }`}
            >
              {x}
            </button>
          ))}
        </div>
      </section>
      <section>
        <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-zinc-500">Exterior / location</p>
        <p className="mb-2 text-xs text-zinc-500">Outdoor or location types this prop fits.</p>
        <div className="flex flex-wrap gap-2">
          {PROP_EXTERIOR_SETTINGS.map((x) => (
            <button
              type="button"
              key={x}
              onClick={() => toggleArray("settingExterior", x)}
              className={`rounded-full border px-3 py-1 text-xs ${
                state.settingExterior.includes(x) ? "bg-zinc-900 text-white" : ""
              }`}
            >
              {x}
            </button>
          ))}
        </div>
      </section>
      <section className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Suitability & options</p>
        <p className="text-xs text-zinc-500">Toggle on anything that applies — these power production-facing filters.</p>
        <div className="space-y-2">
          {FLAG_ROWS.map((row) => (
            <ToggleRow
              key={row.key}
              label={row.label}
              sublabel={row.sub}
              checked={state[row.key]}
              onChange={(next) => update({ [row.key]: next } as Partial<WizardState>)}
            />
          ))}
        </div>
      </section>
      <section className="space-y-3">
        <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Production</p>
        {state.flagPreviouslyUsedOnProduction ? (
          <FieldGroup label="Production title or working title">
            <input
              value={state.productionName}
              onChange={(e) => update({ productionName: e.target.value })}
              className="w-full border-0 bg-transparent py-1 text-sm outline-none"
              placeholder="As it may appear on call sheets or credits"
            />
          </FieldGroup>
        ) : (
          <p className="text-xs text-zinc-500">Turn on “Previously used on screen” above to name the production.</p>
        )}
        {state.flagStudioDelivery ? (
          <>
            <p className="text-xs text-zinc-500">Studios or facilities you regularly run to:</p>
            <div className="flex flex-wrap gap-2">
              {PROP_STUDIOS.map((x) => (
                <button
                  type="button"
                  key={x}
                  onClick={() => toggleArray("studios", x)}
                  className={`rounded-full border px-3 py-1 text-xs ${
                    state.studios.includes(x) ? "bg-zinc-900 text-white" : ""
                  }`}
                >
                  {x}
                </button>
              ))}
            </div>
            {state.studios.includes("Other") ? (
              <FieldGroup label="Other studio / facility">
                <input
                  value={state.studioOtherText}
                  onChange={(e) => update({ studioOtherText: e.target.value })}
                  className="w-full border-0 bg-transparent py-1 text-sm outline-none"
                />
              </FieldGroup>
            ) : null}
          </>
        ) : null}
      </section>
    </div>
  );
}

function Step4Hire({
  state,
  update,
  estimatedIncome,
  commission,
  net,
}: {
  state: WizardState;
  update: (p: Partial<WizardState>) => void;
  estimatedIncome: number;
  commission: number;
  net: number;
}) {
  return (
    <div className="space-y-6">
      <h2 className="text-lg font-semibold">Step 4 — Hire &amp; pricing</h2>
      <section className="space-y-3">
        <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Availability</p>
        <div className="flex flex-wrap gap-6">
          <label className="inline-flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={state.hireEnabled}
              onChange={(e) => update({ hireEnabled: e.target.checked })}
            />
            Available for hire
          </label>
          <label className="inline-flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={state.saleEnabled}
              onChange={(e) => update({ saleEnabled: e.target.checked })}
            />
            Available for sale
          </label>
        </div>
      </section>
      {state.hireEnabled ? (
        <section className="space-y-3 rounded-lg border border-zinc-100 bg-zinc-50/60 p-4">
          <p className="text-sm font-semibold text-zinc-900">Hire terms</p>
          <div className="grid gap-3 sm:grid-cols-2">
            <FieldGroup label="Hire price per week (£)">
              <input
                value={state.hirePriceWeekGbp}
                onChange={(e) => update({ hirePriceWeekGbp: e.target.value })}
                className="w-full border-0 bg-transparent py-1 text-sm outline-none"
              />
            </FieldGroup>
            <FieldGroup label="Minimum hire period">
              <select
                value={state.hireMinPeriod}
                onChange={(e) => update({ hireMinPeriod: e.target.value })}
                className="w-full border-0 bg-transparent py-1 text-sm outline-none"
              >
                <option value="ONE_DAY">1 day</option>
                <option value="THREE_DAYS">3 days</option>
                <option value="ONE_WEEK">1 week</option>
                <option value="TWO_WEEKS">2 weeks</option>
                <option value="ONE_MONTH">1 month</option>
              </select>
            </FieldGroup>
            <FieldGroup label="Deposit (%)">
              <input
                value={state.hireDepositPct}
                onChange={(e) => update({ hireDepositPct: e.target.value })}
                className="w-full border-0 bg-transparent py-1 text-sm outline-none"
              />
            </FieldGroup>
          </div>
          <FieldGroup label="Damage waiver / hire terms notes">
            <textarea
              value={state.damageWaiverTerms}
              onChange={(e) => update({ damageWaiverTerms: e.target.value })}
              rows={3}
              className="w-full resize-y border-0 bg-transparent py-1 text-sm outline-none sm:col-span-2"
            />
          </FieldGroup>
        </section>
      ) : null}
      {state.saleEnabled ? (
        <section className="space-y-3 rounded-lg border border-zinc-100 bg-zinc-50/60 p-4">
          <p className="text-sm font-semibold text-zinc-900">Sale</p>
          <div className="grid gap-3 sm:grid-cols-2">
            <FieldGroup label="Sale price (£)">
              <input
                value={state.salePriceGbp}
                onChange={(e) => update({ salePriceGbp: e.target.value })}
                className="w-full border-0 bg-transparent py-1 text-sm outline-none"
              />
            </FieldGroup>
            <FieldGroup label="Reserve price (£, optional)">
              <input
                value={state.reservePriceGbp}
                onChange={(e) => update({ reservePriceGbp: e.target.value })}
                className="w-full border-0 bg-transparent py-1 text-sm outline-none"
              />
            </FieldGroup>
          </div>
          <label className="inline-flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={state.saleOffers}
              onChange={(e) => update({ saleOffers: e.target.checked })}
            />
            Would consider offers
          </label>
        </section>
      ) : null}
      <section className="rounded-lg border border-zinc-200 bg-white p-4 text-sm">
        <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Illustrative hire estimate</p>
        <p className="mt-2">Estimated annual hire income (example): £{estimatedIncome.toFixed(2)}</p>
        <p>Platform commission (12%): £{commission.toFixed(2)}</p>
        <p>Estimated net after commission: £{net.toFixed(2)}</p>
      </section>
    </div>
  );
}

function Step5Media({
  state,
  update,
  addPhoto,
  aiSuggestions,
  runAiSuggest,
}: {
  state: WizardState;
  update: (p: Partial<WizardState>) => void;
  addPhoto: (e: React.ChangeEvent<HTMLInputElement>) => void;
  aiSuggestions: Record<string, string[]>;
  runAiSuggest: () => void;
}) {
  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold">Step 5 — Photos &amp; media</h2>
      <p className="text-sm text-zinc-600">
        At least one photo is required. Shoot against a plain background where possible; add detail shots if you can.
      </p>
      <div className="flex flex-wrap gap-2">
        {state.images.map((url: string, i: number) => (
          <div key={`${url}-${i}`} className="relative">
            <img src={url} alt="" className="h-24 w-24 rounded border object-cover" />
            <button
              type="button"
              onClick={() =>
                update({
                  images: state.images.filter((x: string) => x !== url),
                  detailShots: state.detailShots.filter((d) => d.url !== url),
                })
              }
              className="absolute -right-2 -top-2 h-6 w-6 rounded-full bg-rose-600 text-xs text-white"
            >
              ×
            </button>
          </div>
        ))}
        <label className="flex h-24 w-24 cursor-pointer items-center justify-center rounded border-2 border-dashed border-zinc-300">
          <input type="file" accept="image/*" className="hidden" onChange={addPhoto} />
          <span className="text-zinc-500">+</span>
        </label>
      </div>
      <button
        type="button"
        onClick={runAiSuggest}
        className="rounded border border-zinc-300 px-3 py-1.5 text-xs"
      >
        Suggest tags with AI
      </button>
      {Object.keys(aiSuggestions).length ? (
        <div className="rounded border bg-zinc-50 p-3 text-xs">
          {Object.entries(aiSuggestions).map(([k, vals]) =>
            Array.isArray(vals) && vals.length > 0 ? (
              <div key={k} className="mb-2">
                <p className="mb-1 font-semibold capitalize">{k.replace(/([A-Z])/g, " $1")}</p>
                <div className="flex flex-wrap gap-1">
                  {vals.map((v: string) => (
                    <button
                      key={`${k}-${v}`}
                      type="button"
                      onClick={() => {
                        if (k === "eras") update({ eras: [...new Set([...state.eras, v])] });
                        if (k === "styles") update({ styles: [...new Set([...state.styles, v])] });
                        if (k === "genres") update({ genres: [...new Set([...state.genres, v])] });
                        if (k === "settingsInterior")
                          update({ settingInterior: [...new Set([...state.settingInterior, v])] });
                        if (k === "settingsExterior")
                          update({ settingExterior: [...new Set([...state.settingExterior, v])] });
                      }}
                      className="rounded-full border px-2 py-0.5"
                    >
                      {v}
                    </button>
                  ))}
                </div>
              </div>
            ) : null
          )}
        </div>
      ) : null}
      <div className="space-y-2">
        {state.detailShots.map((shot, idx) => (
          <div key={`${shot.url}-${idx}`} className="grid gap-2 sm:grid-cols-[1fr_auto]">
            <FieldGroup label="Shot label">
              <input
                value={shot.label}
                onChange={(e) =>
                  update({
                    detailShots: state.detailShots.map((x, i) =>
                      i === idx ? { ...x, label: e.target.value } : x
                    ),
                  })
                }
                className="w-full border-0 bg-transparent py-1 text-sm outline-none"
              />
            </FieldGroup>
          </div>
        ))}
      </div>
    </div>
  );
}

function Step6Logistics({
  state,
  update,
}: {
  state: WizardState;
  update: (p: Partial<WizardState>) => void;
}) {
  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold">Step 6 — Logistics</h2>
      <FieldGroup label="Collection location / postcode">
        <input
          value={state.collectionAddress}
          onChange={(e) => update({ collectionAddress: e.target.value })}
          className="w-full border-0 bg-transparent py-1 text-sm outline-none"
        />
      </FieldGroup>
      <label className="inline-flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={state.collectionAvailable}
          onChange={(e) => update({ collectionAvailable: e.target.checked })}
        />
        Collection available
      </label>
      <FieldGroup label="Collection opening hours">
        <input
          value={state.collectionOpeningHours}
          onChange={(e) => update({ collectionOpeningHours: e.target.value })}
          className="w-full border-0 bg-transparent py-1 text-sm outline-none"
        />
      </FieldGroup>
      <label className="inline-flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={state.deliveryAvailable}
          onChange={(e) => update({ deliveryAvailable: e.target.checked })}
        />
        Delivery available
      </label>
      {state.deliveryAvailable ? (
        <div className="grid gap-3 sm:grid-cols-2">
          <FieldGroup label="Delivery radius (miles)">
            <input
              value={state.deliveryRadiusMiles}
              onChange={(e) => update({ deliveryRadiusMiles: e.target.value })}
              className="w-full border-0 bg-transparent py-1 text-sm outline-none"
            />
          </FieldGroup>
          <label className="mt-6 inline-flex items-center gap-2 text-sm sm:mt-8">
            <input
              type="checkbox"
              checked={state.deliveryNationwide}
              onChange={(e) => update({ deliveryNationwide: e.target.checked })}
            />
            Nationwide
          </label>
          <FieldGroup label="Delivery pricing">
            <select
              value={state.deliveryPriceType}
              onChange={(e) => update({ deliveryPriceType: e.target.value })}
              className="w-full border-0 bg-transparent py-1 text-sm outline-none"
            >
              <option value="FREE">Free</option>
              <option value="FIXED">Fixed price</option>
              <option value="POA">POA</option>
              <option value="DISTANCE">Calculated by distance</option>
            </select>
          </FieldGroup>
          <FieldGroup label="Fixed delivery price (£)">
            <input
              value={state.deliveryPriceGbp}
              onChange={(e) => update({ deliveryPriceGbp: e.target.value })}
              className="w-full border-0 bg-transparent py-1 text-sm outline-none"
            />
          </FieldGroup>
        </div>
      ) : null}
      <div className="grid gap-2 sm:grid-cols-2">
        <label className="inline-flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={state.specialistHandling}
            onChange={(e) => update({ specialistHandling: e.target.checked })}
          />
          Specialist handling / crating
        </label>
        <label className="inline-flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={state.regularStudioRun}
            onChange={(e) => update({ regularStudioRun: e.target.checked })}
          />
          Regular studio run
        </label>
        <label className="inline-flex items-center gap-2 text-sm sm:col-span-2">
          <input
            type="checkbox"
            checked={state.specialistTransportRequired}
            onChange={(e) => update({ specialistTransportRequired: e.target.checked })}
          />
          Specialist transport required
        </label>
      </div>
      <FieldGroup label="Typical delivery lead time">
        <select
          value={state.deliveryLeadTime}
          onChange={(e) => update({ deliveryLeadTime: e.target.value })}
          className="w-full border-0 bg-transparent py-1 text-sm outline-none"
        >
          <option>Same day</option>
          <option>Next day</option>
          <option>2-3 days</option>
          <option>1 week</option>
          <option>POA</option>
        </select>
      </FieldGroup>
    </div>
  );
}

function Step7Review({ state }: { state: WizardState }) {
  const checklist = [
    { ok: state.images.length >= 1, label: "At least one photo uploaded" },
    { ok: state.eras.length > 0, label: "Period / era tagged" },
    {
      ok: (state.hireEnabled && Number(state.hirePriceWeekGbp) > 0) || (state.saleEnabled && Number(state.salePriceGbp) > 0),
      label: "Hire or sale price set",
    },
    { ok: isCondition(state.condition), label: "Condition selected" },
    { ok: state.genres.length > 0, label: "At least one genre tag" },
    { ok: !!state.collectionAddress.trim(), label: "Collection location set" },
  ];
  return (
    <div className="space-y-3">
      <h2 className="text-lg font-semibold">Step 7 — Review &amp; publish</h2>
      <div className="rounded border bg-zinc-50 p-3 text-sm">
        <p className="font-medium">{state.name || "Untitled item"}</p>
        <p className="mt-1 line-clamp-4 text-zinc-600">{state.description || "No description yet."}</p>
        <p className="mt-1 text-zinc-600">
          Category: {state.category} · {state.subcategory}
        </p>
        <p className="mt-1 text-zinc-600">Condition: {CONDITION_LABELS[state.condition]}</p>
      </div>
      <ul className="space-y-1 text-sm">
        {checklist.map((c) => (
          <li key={c.label} className={c.ok ? "text-emerald-700" : "text-rose-700"}>
            {c.ok ? "✓" : "✗"} {c.label}
          </li>
        ))}
      </ul>
    </div>
  );
}

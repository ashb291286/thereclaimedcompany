"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { ListingImageCropModal } from "../../sell/ListingImageCropModal";
import { createPropComprehensiveListingAction } from "@/lib/actions/prop-yard";
import {
  PROP_CATEGORIES,
  PROP_SUBCATEGORIES,
  PROP_MATERIALS,
  PROP_ERAS,
  PROP_STYLES,
  PROP_ORIGINS,
  PROP_GENRES,
  PROP_INTERIOR_SETTINGS,
  PROP_EXTERIOR_SETTINGS,
  PROP_STUDIOS,
} from "@/lib/prop-yard-taxonomy";

type Category = { id: string; name: string };
type PropWizardListing = { id: string; title: string; price: number; visibleOnMarketplace: boolean; images: string[]; hasPropOffer: boolean };

const SUCCESS = "/dashboard/prop-yard?wizard=1";
const ERROR_RETURN = "/dashboard/prop-yard/wizard";
const DRAFT_KEY = "prop-yard-wizard-draft-v1";
const SIMILAR_KEY = "prop-yard-wizard-last-published-v1";

type WizardState = {
  name: string;
  descriptionShort: string;
  descriptionFull: string;
  category: string;
  subcategory: string;
  quantityAvailable: string;
  dimensionsH: string;
  dimensionsW: string;
  dimensionsD: string;
  weightKg: string;
  materials: string[];
  colourHex: string;
  colourName: string;
  conditionGrade: "A" | "B" | "C" | "";
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
  provenanceBuilding: string;
  provenanceDateText: string;
  provenanceRegion: string;
  authenticityVerifiedBy: string;
  restorationNotes: string;
  conditionNotes: string;
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
  videoUrl: string;
  view360Url: string;
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
  descriptionShort: "",
  descriptionFull: "",
  category: PROP_CATEGORIES[0],
  subcategory: PROP_SUBCATEGORIES[PROP_CATEGORIES[0]][0],
  quantityAvailable: "1",
  dimensionsH: "",
  dimensionsW: "",
  dimensionsD: "",
  weightKg: "",
  materials: [],
  colourHex: "#8b7355",
  colourName: "",
  conditionGrade: "",
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
  provenanceBuilding: "",
  provenanceDateText: "",
  provenanceRegion: "",
  authenticityVerifiedBy: "UNVERIFIED",
  restorationNotes: "",
  conditionNotes: "",
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
  videoUrl: "",
  view360Url: "",
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

export function PropListingWizard({ categories }: { listings: PropWizardListing[]; categories: Category[]; pctLabel: number; initialListingId?: string; initialMode?: "link" | "hire_only" }) {
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
        const parsed = JSON.parse(saved) as WizardState;
        setState({ ...initialState, ...parsed });
      } catch {}
    }
    fetch("/api/prop-yard/draft")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (d?.draft?.payload) setState((s) => ({ ...s, ...(d.draft.payload as WizardState) }));
      })
      .catch(() => {});
    try {
      const similar = new URLSearchParams(window.location.search).get("similar");
      if (similar === "1") {
        const prev = localStorage.getItem(SIMILAR_KEY);
        if (prev) {
          const parsed = JSON.parse(prev) as WizardState;
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
    } catch {}
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
      if (!state.descriptionShort.trim() || state.descriptionShort.trim().length > 300) e.push("Short description is required (max 300 chars).");
      if (!state.descriptionFull.trim()) e.push("Full description is required.");
      if (!state.category) e.push("Category is required.");
      if (!state.quantityAvailable || Number(state.quantityAvailable) < 1) e.push("Quantity available is required.");
      if (!state.conditionGrade) e.push("Condition grade is required.");
    } else if (step === 2) {
      if (state.eras.length === 0) e.push("Select at least one era.");
      if (state.styles.length === 0) e.push("Select at least one style.");
    } else if (step === 3) {
      if (state.genres.length === 0) e.push("Select at least one genre.");
      if (state.flagPreviouslyUsedOnProduction && !state.productionName.trim()) e.push("Production name is required when previously used is enabled.");
    } else if (step === 4) {
      if (!state.conditionNotes.trim()) e.push("Condition notes are required for transparency.");
    } else if (step === 5) {
      if (!state.hireEnabled && !state.saleEnabled) e.push("Enable hire and/or sale.");
      if (state.hireEnabled && (!state.hirePriceWeekGbp || Number(state.hirePriceWeekGbp) <= 0)) e.push("Hire price per week is required.");
      if (state.saleEnabled && (!state.salePriceGbp || Number(state.salePriceGbp) <= 0)) e.push("Sale price is required.");
    } else if (step === 6) {
      if (state.images.length < 4) e.push("At least 4 photos are required.");
    } else if (step === 7) {
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
    setStep((s) => Math.min(8, s + 1));
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
      update({ images: [...state.images, data.url], detailShots: [...state.detailShots, { url: data.url, label: "Overall" }] });
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
      materials: Array.isArray(s.materials) ? s.materials : [],
      genres: Array.isArray(s.genres) ? s.genres : [],
      settingsInterior: Array.isArray(s.settingsInterior) ? s.settingsInterior : [],
      settingsExterior: Array.isArray(s.settingsExterior) ? s.settingsExterior : [],
    });
  }

  const completion = Math.round((step / 8) * 100);
  const estimatedIncome = Number(state.hirePriceWeekGbp || "0") * 20;
  const commission = estimatedIncome * 0.12;
  const net = estimatedIncome - commission;
  const subcategoryOptions = PROP_SUBCATEGORIES[state.category] ?? ["Other"];

  return (
    <div className="mx-auto max-w-5xl">
      <div className="rounded-xl border border-zinc-200 bg-white p-4">
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium text-zinc-700">Step {step} of 8</p>
          <p className="text-xs text-zinc-500">{completion}% complete · {saveState === "saving" ? "Saving..." : saveState === "saved" ? "Saved" : ""}</p>
        </div>
        <div className="mt-2 h-2 w-full rounded bg-zinc-100">
          <div className="h-2 rounded bg-amber-700 transition-all" style={{ width: `${completion}%` }} />
        </div>
      </div>

      <div className="mt-4 rounded-xl border border-zinc-200 bg-white p-5">
        {step === 1 && <Step1 state={state} update={update} toggleArray={toggleArray} subcategoryOptions={subcategoryOptions} />}
        {step === 2 && <Step2 state={state} toggleArray={toggleArray} update={update} />}
        {step === 3 && <Step3 state={state} toggleArray={toggleArray} update={update} />}
        {step === 4 && <Step4 state={state} update={update} />}
        {step === 5 && <Step5 state={state} update={update} estimatedIncome={estimatedIncome} commission={commission} net={net} />}
        {step === 6 && <Step6 state={state} update={update} addPhoto={addPhoto} toggleArray={toggleArray} aiSuggestions={aiSuggestions} runAiSuggest={runAiSuggest} />}
        {step === 7 && <Step7 state={state} update={update} />}
        {step === 8 && <Step8 state={state} />}
      </div>

      {errors.length > 0 ? <div className="mt-3 rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">{errors.join(" ")}</div> : null}

      <div className="mt-5 flex flex-wrap gap-3">
        <button type="button" onClick={back} disabled={step === 1} className="rounded-lg border border-zinc-300 px-4 py-2 text-sm">Back</button>
        {step < 8 ? (
          <button type="button" onClick={next} className="rounded-lg bg-amber-900 px-4 py-2 text-sm font-semibold text-white">Continue</button>
        ) : (
          <>
            <button type="button" onClick={() => { localStorage.setItem(SIMILAR_KEY, JSON.stringify(state)); setSubmitIntent("publish"); submitRef.current?.requestSubmit(); }} className="rounded-lg bg-amber-900 px-4 py-2 text-sm font-semibold text-white">Publish listing</button>
            <button type="button" onClick={() => { setSubmitIntent("draft"); submitRef.current?.requestSubmit(); }} className="rounded-lg border border-zinc-300 px-4 py-2 text-sm">Save as draft</button>
            <Link href="/prop-yard/search" className="rounded-lg border border-zinc-300 px-4 py-2 text-sm">Preview public listing</Link>
          </>
        )}
      </div>

      <form ref={submitRef} action={createPropComprehensiveListingAction} className="hidden">
        <input type="hidden" name="_successReturn" value={SUCCESS} />
        <input type="hidden" name="_errorReturn" value={ERROR_RETURN} />
        <input type="hidden" name="publishIntent" value={submitIntent} />
        <input type="hidden" name="payloadJson" value={JSON.stringify(state)} />
      </form>

      {cropState ? <ListingImageCropModal imageSrc={cropState.src} fileName={cropState.fileName} onCancel={() => setCropState(null)} onComplete={uploadCroppedFile} /> : null}
    </div>
  );
}

function Step1({ state, update, toggleArray, subcategoryOptions }: any) { return <div className="space-y-3"><h2 className="text-lg font-semibold">Step 1 - Basics</h2><input value={state.name} onChange={(e) => update({ name: e.target.value })} placeholder="Item name" className="w-full rounded border px-3 py-2" /><textarea value={state.descriptionShort} onChange={(e) => update({ descriptionShort: e.target.value.slice(0, 300) })} placeholder="Short description (max 300 chars)" className="w-full rounded border px-3 py-2" /><textarea value={state.descriptionFull} onChange={(e) => update({ descriptionFull: e.target.value })} placeholder="Full description (markdown supported)" rows={6} className="w-full rounded border px-3 py-2" /><div className="grid gap-3 sm:grid-cols-2"><select value={state.category} onChange={(e) => update({ category: e.target.value, subcategory: (PROP_SUBCATEGORIES[e.target.value] ?? ["Other"])[0] })} className="rounded border px-3 py-2">{PROP_CATEGORIES.map((x) => <option key={x}>{x}</option>)}</select><select value={state.subcategory} onChange={(e) => update({ subcategory: e.target.value })} className="rounded border px-3 py-2">{subcategoryOptions.map((x: string) => <option key={x}>{x}</option>)}</select></div><div className="grid gap-3 sm:grid-cols-4"><input value={state.quantityAvailable} onChange={(e) => update({ quantityAvailable: e.target.value })} placeholder="Qty" className="rounded border px-3 py-2" /><input value={state.dimensionsH} onChange={(e) => update({ dimensionsH: e.target.value })} placeholder="H cm" className="rounded border px-3 py-2" /><input value={state.dimensionsW} onChange={(e) => update({ dimensionsW: e.target.value })} placeholder="W cm" className="rounded border px-3 py-2" /><input value={state.dimensionsD} onChange={(e) => update({ dimensionsD: e.target.value })} placeholder="D cm" className="rounded border px-3 py-2" /></div><input value={state.weightKg} onChange={(e) => update({ weightKg: e.target.value })} placeholder="Weight kg" className="w-full rounded border px-3 py-2" /><div className="flex flex-wrap gap-2">{PROP_MATERIALS.map((x) => <button type="button" key={x} onClick={() => toggleArray("materials", x)} className={`rounded-full border px-3 py-1 text-xs ${state.materials.includes(x) ? "bg-zinc-900 text-white" : ""}`}>{x}</button>)}</div><div className="grid gap-3 sm:grid-cols-2"><input type="color" value={state.colourHex} onChange={(e) => update({ colourHex: e.target.value })} className="h-10 w-full rounded border" /><input value={state.colourName} onChange={(e) => update({ colourName: e.target.value })} placeholder="Colour name" className="rounded border px-3 py-2" /></div><div className="flex gap-3">{["A", "B", "C"].map((grade) => <label key={grade} className="inline-flex items-center gap-2"><input type="radio" checked={state.conditionGrade === grade} onChange={() => update({ conditionGrade: grade })} />{grade}</label>)}</div></div>; }
function Step2({ state, toggleArray, update }: any) { return <div className="space-y-3"><h2 className="text-lg font-semibold">Step 2 - Period & Style</h2><div className="flex flex-wrap gap-2">{PROP_ERAS.map((x) => <button type="button" key={x} onClick={() => toggleArray("eras", x)} className={`rounded-full border px-3 py-1 text-xs ${state.eras.includes(x) ? "bg-zinc-900 text-white" : ""}`}>{x}</button>)}</div><input value={state.dateSpecific} onChange={(e) => update({ dateSpecific: e.target.value })} placeholder="Specific date or range (e.g. c.1887)" className="w-full rounded border px-3 py-2" /><div className="flex flex-wrap gap-2">{PROP_STYLES.map((x) => <button type="button" key={x} onClick={() => toggleArray("styles", x)} className={`rounded-full border px-3 py-1 text-xs ${state.styles.includes(x) ? "bg-zinc-900 text-white" : ""}`}>{x}</button>)}</div><select value={state.geographicOrigin} onChange={(e) => update({ geographicOrigin: e.target.value })} className="w-full rounded border px-3 py-2">{PROP_ORIGINS.map((x) => <option key={x}>{x}</option>)}</select></div>; }
function Step3({ state, toggleArray, update }: any) { return <div className="space-y-3"><h2 className="text-lg font-semibold">Step 3 - Production & Genre</h2><p className="text-sm text-zinc-600">These filters help film, TV and theatre professionals find your item for the right production.</p><div className="flex flex-wrap gap-2">{PROP_GENRES.map((x) => <button type="button" key={x} onClick={() => toggleArray("genres", x)} className={`rounded-full border px-3 py-1 text-xs ${state.genres.includes(x) ? "bg-zinc-900 text-white" : ""}`}>{x}</button>)}</div><div className="flex flex-wrap gap-2">{PROP_INTERIOR_SETTINGS.map((x) => <button type="button" key={x} onClick={() => toggleArray("settingInterior", x)} className={`rounded-full border px-3 py-1 text-xs ${state.settingInterior.includes(x) ? "bg-zinc-900 text-white" : ""}`}>{x}</button>)}</div><div className="flex flex-wrap gap-2">{PROP_EXTERIOR_SETTINGS.map((x) => <button type="button" key={x} onClick={() => toggleArray("settingExterior", x)} className={`rounded-full border px-3 py-1 text-xs ${state.settingExterior.includes(x) ? "bg-zinc-900 text-white" : ""}`}>{x}</button>)}</div><div className="grid gap-2 sm:grid-cols-2">{["flagSuitableCloseup","flagCameraReady","flagPreviouslyUsedOnProduction","flagFragile","flagOutdoorSuitable","flagMultiplesAvailable","flagCanSourceMatching","flagStudioDelivery"].map((k) => <label key={k} className="inline-flex items-center gap-2 text-sm"><input type="checkbox" checked={state[k]} onChange={(e) => update({ [k]: e.target.checked })} />{k}</label>)}</div>{state.flagPreviouslyUsedOnProduction ? <input value={state.productionName} onChange={(e) => update({ productionName: e.target.value })} placeholder="Production name" className="w-full rounded border px-3 py-2" /> : null}{state.flagStudioDelivery ? <><div className="flex flex-wrap gap-2">{PROP_STUDIOS.map((x) => <button type="button" key={x} onClick={() => toggleArray("studios", x)} className={`rounded-full border px-3 py-1 text-xs ${state.studios.includes(x) ? "bg-zinc-900 text-white" : ""}`}>{x}</button>)}</div>{state.studios.includes("Other") ? <input value={state.studioOtherText} onChange={(e) => update({ studioOtherText: e.target.value })} placeholder="Other studio" className="w-full rounded border px-3 py-2" /> : null}</> : null}</div>; }
function Step4({ state, update }: any) { return <div className="space-y-3"><h2 className="text-lg font-semibold">Step 4 - Provenance</h2><input value={state.provenanceBuilding} onChange={(e) => update({ provenanceBuilding: e.target.value })} placeholder="Known building or estate of origin" className="w-full rounded border px-3 py-2" /><input value={state.provenanceDateText} onChange={(e) => update({ provenanceDateText: e.target.value })} placeholder="Demolition or salvage date/year" className="w-full rounded border px-3 py-2" /><input value={state.provenanceRegion} onChange={(e) => update({ provenanceRegion: e.target.value })} placeholder="Region salvaged from" className="w-full rounded border px-3 py-2" /><select value={state.authenticityVerifiedBy} onChange={(e) => update({ authenticityVerifiedBy: e.target.value })} className="w-full rounded border px-3 py-2"><option value="YARD_OWNER_KNOWLEDGE">Yard owner knowledge</option><option value="INDEPENDENT_EXPERT">Independent expert</option><option value="SALVO_MEMBER">SALVO member</option><option value="LAPADA_MEMBER">LAPADA member</option><option value="UNVERIFIED">Unverified</option></select><textarea value={state.restorationNotes} onChange={(e) => update({ restorationNotes: e.target.value })} placeholder="Restoration or conservation work carried out" className="w-full rounded border px-3 py-2" /><textarea value={state.conditionNotes} onChange={(e) => update({ conditionNotes: e.target.value })} placeholder="Condition notes and known faults" className="w-full rounded border px-3 py-2" /></div>; }
function Step5({ state, update, estimatedIncome, commission, net }: any) { return <div className="space-y-3"><h2 className="text-lg font-semibold">Step 5 - Hire & Pricing</h2><div className="flex gap-4"><label className="inline-flex items-center gap-2"><input type="checkbox" checked={state.hireEnabled} onChange={(e) => update({ hireEnabled: e.target.checked })} />Available for hire</label><label className="inline-flex items-center gap-2"><input type="checkbox" checked={state.saleEnabled} onChange={(e) => update({ saleEnabled: e.target.checked })} />Available for sale</label></div>{state.hireEnabled ? <div className="grid gap-3 sm:grid-cols-2"><input value={state.hirePriceWeekGbp} onChange={(e) => update({ hirePriceWeekGbp: e.target.value })} placeholder="Hire price per week £" className="rounded border px-3 py-2" /><select value={state.hireMinPeriod} onChange={(e) => update({ hireMinPeriod: e.target.value })} className="rounded border px-3 py-2"><option value="ONE_DAY">1 day</option><option value="THREE_DAYS">3 days</option><option value="ONE_WEEK">1 week</option><option value="TWO_WEEKS">2 weeks</option><option value="ONE_MONTH">1 month</option></select><input value={state.hireDepositPct} onChange={(e) => update({ hireDepositPct: e.target.value })} placeholder="Deposit %" className="rounded border px-3 py-2" /><textarea value={state.damageWaiverTerms} onChange={(e) => update({ damageWaiverTerms: e.target.value })} placeholder="Damage waiver terms" className="rounded border px-3 py-2 sm:col-span-2" /></div> : null}{state.saleEnabled ? <div className="grid gap-3 sm:grid-cols-2"><input value={state.salePriceGbp} onChange={(e) => update({ salePriceGbp: e.target.value })} placeholder="Sale price £" className="rounded border px-3 py-2" /><label className="inline-flex items-center gap-2"><input type="checkbox" checked={state.saleOffers} onChange={(e) => update({ saleOffers: e.target.checked })} />Would consider offers</label><input value={state.reservePriceGbp} onChange={(e) => update({ reservePriceGbp: e.target.value })} placeholder="Reserve price £ (optional)" className="rounded border px-3 py-2" /></div> : null}<div className="rounded border bg-zinc-50 p-3 text-sm"><p>Estimated annual hire income: £{estimatedIncome.toFixed(2)}</p><p>Platform commission (12%): £{commission.toFixed(2)}</p><p>Estimated annual net: £{net.toFixed(2)}</p></div></div>; }
function Step6({ state, update, addPhoto, aiSuggestions, runAiSuggest }: any) { return <div className="space-y-3"><h2 className="text-lg font-semibold">Step 6 - Photos & Media</h2><p className="text-sm text-zinc-600">Shoot against a plain background where possible. Include detail shots and any maker's marks.</p><div className="flex flex-wrap gap-2">{state.images.map((url: string, i: number) => <div key={`${url}-${i}`} className="relative"><img src={url} alt="" className="h-24 w-24 rounded border object-cover" /><button type="button" onClick={() => update({ images: state.images.filter((x: string) => x !== url), detailShots: state.detailShots.filter((d: any) => d.url !== url) })} className="absolute -right-2 -top-2 h-6 w-6 rounded-full bg-rose-600 text-white">x</button></div>)}<label className="flex h-24 w-24 cursor-pointer items-center justify-center rounded border-2 border-dashed"><input type="file" accept="image/*" className="hidden" onChange={addPhoto} />+</label></div><button type="button" onClick={runAiSuggest} className="rounded border border-zinc-300 px-3 py-1.5 text-xs">Suggest tags with AI</button>{Object.keys(aiSuggestions).length ? <div className="rounded border bg-zinc-50 p-3 text-xs">{Object.entries(aiSuggestions).map(([k, vals]) => Array.isArray(vals) && vals.length > 0 ? <div key={k} className="mb-2"><p className="mb-1 font-semibold capitalize">{k}</p><div className="flex flex-wrap gap-1">{vals.map((v: string) => <button key={`${k}-${v}`} type="button" onClick={() => { if (k === "eras") update({ eras: [...new Set([...state.eras, v])] }); if (k === "styles") update({ styles: [...new Set([...state.styles, v])] }); if (k === "materials") update({ materials: [...new Set([...state.materials, v])] }); if (k === "genres") update({ genres: [...new Set([...state.genres, v])] }); if (k === "settingsInterior") update({ settingInterior: [...new Set([...state.settingInterior, v])] }); if (k === "settingsExterior") update({ settingExterior: [...new Set([...state.settingExterior, v])] }); }} className="rounded-full border px-2 py-0.5">{v}</button>)}</div></div> : null)}</div> : null}<div className="space-y-2">{state.detailShots.map((shot: any, idx: number) => <div key={`${shot.url}-${idx}`} className="grid gap-2 sm:grid-cols-[1fr_auto]"><input value={shot.label} onChange={(e) => update({ detailShots: state.detailShots.map((x: any, i: number) => i === idx ? { ...x, label: e.target.value } : x) })} className="rounded border px-3 py-2" /><span className="text-xs text-zinc-500 self-center">Label</span></div>)}</div><input value={state.videoUrl} onChange={(e) => update({ videoUrl: e.target.value })} placeholder="Video URL (optional, max 60s)" className="w-full rounded border px-3 py-2" /><input value={state.view360Url} onChange={(e) => update({ view360Url: e.target.value })} placeholder="360 view URL (optional)" className="w-full rounded border px-3 py-2" /></div>; }
function Step7({ state, update }: any) { return <div className="space-y-3"><h2 className="text-lg font-semibold">Step 7 - Logistics</h2><input value={state.collectionAddress} onChange={(e) => update({ collectionAddress: e.target.value })} placeholder="Collection location / postcode" className="w-full rounded border px-3 py-2" /><label className="inline-flex items-center gap-2"><input type="checkbox" checked={state.collectionAvailable} onChange={(e) => update({ collectionAvailable: e.target.checked })} />Collection available</label><input value={state.collectionOpeningHours} onChange={(e) => update({ collectionOpeningHours: e.target.value })} placeholder="Collection opening hours" className="w-full rounded border px-3 py-2" /><label className="inline-flex items-center gap-2"><input type="checkbox" checked={state.deliveryAvailable} onChange={(e) => update({ deliveryAvailable: e.target.checked })} />Delivery available</label>{state.deliveryAvailable ? <div className="grid gap-3 sm:grid-cols-2"><input value={state.deliveryRadiusMiles} onChange={(e) => update({ deliveryRadiusMiles: e.target.value })} placeholder="Delivery radius miles" className="rounded border px-3 py-2" /><label className="inline-flex items-center gap-2"><input type="checkbox" checked={state.deliveryNationwide} onChange={(e) => update({ deliveryNationwide: e.target.checked })} />Nationwide</label><select value={state.deliveryPriceType} onChange={(e) => update({ deliveryPriceType: e.target.value })} className="rounded border px-3 py-2"><option value="FREE">Free</option><option value="FIXED">Fixed price</option><option value="POA">POA</option><option value="DISTANCE">Calculated by distance</option></select><input value={state.deliveryPriceGbp} onChange={(e) => update({ deliveryPriceGbp: e.target.value })} placeholder="Fixed delivery price £" className="rounded border px-3 py-2" /></div> : null}<div className="grid gap-2 sm:grid-cols-2"><label className="inline-flex items-center gap-2"><input type="checkbox" checked={state.specialistHandling} onChange={(e) => update({ specialistHandling: e.target.checked })} />Specialist handling/crating</label><label className="inline-flex items-center gap-2"><input type="checkbox" checked={state.regularStudioRun} onChange={(e) => update({ regularStudioRun: e.target.checked })} />Regular studio run</label><label className="inline-flex items-center gap-2"><input type="checkbox" checked={state.specialistTransportRequired} onChange={(e) => update({ specialistTransportRequired: e.target.checked })} />Specialist transport required</label></div><select value={state.deliveryLeadTime} onChange={(e) => update({ deliveryLeadTime: e.target.value })} className="w-full rounded border px-3 py-2"><option>Same day</option><option>Next day</option><option>2-3 days</option><option>1 week</option><option>POA</option></select></div>; }
function Step8({ state }: any) { const checklist = [{ ok: state.images.length >= 4, label: "Minimum 4 photos uploaded" }, { ok: state.eras.length > 0, label: "Period / era tagged" }, { ok: (state.hireEnabled && Number(state.hirePriceWeekGbp) > 0) || (state.saleEnabled && Number(state.salePriceGbp) > 0), label: "Hire or sale price set" }, { ok: !!state.conditionGrade, label: "Condition grade selected" }, { ok: state.genres.length > 0, label: "At least one genre tag selected" }, { ok: !!state.collectionAddress.trim(), label: "Location set" }]; return <div className="space-y-3"><h2 className="text-lg font-semibold">Step 8 - Review & Publish</h2><div className="rounded border bg-zinc-50 p-3 text-sm"><p className="font-medium">{state.name || "Untitled item"}</p><p className="mt-1 text-zinc-600">{state.descriptionShort || "No short description yet."}</p><p className="mt-1 text-zinc-600">Category: {state.category} · {state.subcategory}</p></div><ul className="space-y-1 text-sm">{checklist.map((c) => <li key={c.label} className={c.ok ? "text-emerald-700" : "text-rose-700"}>{c.ok ? "✓" : "✗"} {c.label}</li>)}</ul></div>; }

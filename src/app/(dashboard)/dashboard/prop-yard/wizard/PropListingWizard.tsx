"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { createPropOnlyListingAndOfferAction, createPropRentalOfferAction } from "@/lib/actions/prop-yard";
import { CONDITION_LABELS } from "@/lib/constants";
import { PROP_YARD_TERMS_VERSION, suggestedWeeklyHirePence } from "@/lib/prop-yard";
import { ListingImageCropModal } from "../../sell/ListingImageCropModal";
import { ListingLivePreview } from "../../sell/ListingLivePreview";

export type PropWizardListing = {
  id: string;
  title: string;
  price: number;
  visibleOnMarketplace: boolean;
  images: string[];
  hasPropOffer: boolean;
};

type Category = { id: string; name: string };

const SUCCESS = "/dashboard/prop-yard?wizard=1";
const ERROR_RETURN = "/dashboard/prop-yard/wizard";

export function PropListingWizard({
  listings,
  categories,
  pctLabel,
  initialListingId,
  initialMode,
}: {
  listings: PropWizardListing[];
  categories: Category[];
  pctLabel: number;
  initialListingId?: string;
  initialMode?: "link" | "hire_only";
}) {
  const linkFormRef = useRef<HTMLFormElement>(null);
  const hireFormRef = useRef<HTMLFormElement>(null);
  const cropBlobUrlRef = useRef<string | null>(null);

  const linkable = useMemo(() => listings.filter((l) => !l.hasPropOffer), [listings]);

  const resolvedInitial =
    initialListingId && linkable.some((l) => l.id === initialListingId) ? initialListingId : undefined;
  const bootListing = resolvedInitial ? linkable.find((l) => l.id === resolvedInitial)! : linkable[0];
  const bootWeekly = bootListing
    ? (suggestedWeeklyHirePence(bootListing.price) / 100).toFixed(2)
    : (suggestedWeeklyHirePence(0) / 100).toFixed(2);

  const initialResolvedMode: "link" | "hire_only" | null =
    initialMode === "hire_only" ? "hire_only" : resolvedInitial ? "link" : null;
  const [step, setStep] = useState(initialResolvedMode ? 1 : 0);
  const [mode, setMode] = useState<"link" | "hire_only" | null>(initialResolvedMode);

  const [listingId, setListingId] = useState(bootListing?.id ?? "");

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [condition, setCondition] = useState<keyof typeof CONDITION_LABELS>("used");
  const [categoryId, setCategoryId] = useState(categories[0]?.id ?? "");
  const [newCategoryName, setNewCategoryName] = useState("");
  const [postcode, setPostcode] = useState("");
  const [imageUrls, setImageUrls] = useState<string[]>([]);
  const [listPriceGbp, setListPriceGbp] = useState("");
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [cropState, setCropState] = useState<{ src: string; fileName: string } | null>(null);

  const selectedListing = useMemo(
    () => linkable.find((l) => l.id === listingId),
    [linkable, listingId]
  );

  const suggestedWeekly = useMemo(() => {
    const pence =
      mode === "link" && selectedListing
        ? suggestedWeeklyHirePence(selectedListing.price)
        : suggestedWeeklyHirePence(Math.round(parseFloat(listPriceGbp || "0") * 100) || 0);
    return (pence / 100).toFixed(2);
  }, [mode, selectedListing, listPriceGbp]);

  const [weeklyHireGbp, setWeeklyHireGbp] = useState(bootWeekly);
  const [minimumHireWeeks, setMinimumHireWeeks] = useState("1");
  const [yardHireNotes, setYardHireNotes] = useState("");
  const [offersDelivery, setOffersDelivery] = useState(false);
  const [deliveryNotes, setDeliveryNotes] = useState("");
  const [termsOk, setTermsOk] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);

  useEffect(() => {
    return () => {
      if (cropBlobUrlRef.current) {
        URL.revokeObjectURL(cropBlobUrlRef.current);
        cropBlobUrlRef.current = null;
      }
    };
  }, []);

  function openCropForFile(file: File) {
    if (cropBlobUrlRef.current) {
      URL.revokeObjectURL(cropBlobUrlRef.current);
    }
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

  async function uploadCroppedFile(file: File) {
    setUploading(true);
    setUploadError(null);
    try {
      const formData = new FormData();
      formData.set("file", file);
      const res = await fetch("/api/upload", { method: "POST", body: formData });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Upload failed");
      }
      const data = await res.json();
      if (data.url) setImageUrls((prev) => [...prev, data.url]);
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
      closeCrop();
    }
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setUploadError("Please choose an image file.");
      return;
    }
    setUploadError(null);
    openCropForFile(file);
  }

  function removeImage(url: string) {
    setImageUrls((prev) => prev.filter((u) => u !== url));
  }

  function syncWeeklyFromSuggestion() {
    setWeeklyHireGbp(suggestedWeekly);
  }

  function chooseMode(m: "link" | "hire_only") {
    setMode(m);
    setStep(1);
    if (m === "link" && linkable[0]) {
      setListingId(linkable[0].id);
      const w = suggestedWeeklyHirePence(linkable[0].price);
      setWeeklyHireGbp((w / 100).toFixed(2));
    } else if (m === "hire_only") {
      const w = suggestedWeeklyHirePence(Math.round(parseFloat(listPriceGbp || "0") * 100) || 0);
      setWeeklyHireGbp((w / 100).toFixed(2));
    }
  }

  function back() {
    if (step <= 0) return;
    if (step === 1) {
      setStep(0);
      setMode(null);
      return;
    }
    setStep((s) => s - 1);
  }

  function nextFromStep1() {
    if (mode === "link") {
      if (!listingId) return;
      const w = suggestedWeeklyHirePence(selectedListing?.price ?? 0);
      setWeeklyHireGbp((w / 100).toFixed(2));
    } else {
      if (!title.trim() || !description.trim() || !postcode.trim() || imageUrls.length === 0 || !listPriceGbp) return;
    }
    setStep(2);
  }

  function nextFromStep2() {
    const w = parseFloat(weeklyHireGbp);
    const mw = parseInt(minimumHireWeeks, 10);
    if (!Number.isFinite(w) || w < 1 || !Number.isFinite(mw) || mw < 1 || mw > 52) return;
    setStep(3);
  }

  function publish() {
    if (!termsOk) return;
    if (mode === "link") {
      linkFormRef.current?.requestSubmit();
    } else if (mode === "hire_only") {
      hireFormRef.current?.requestSubmit();
    }
  }

  const linkErrorReturn =
    listingId.length > 0
      ? `${ERROR_RETURN}?listingId=${encodeURIComponent(listingId)}`
      : ERROR_RETURN;

  const maxStep = 3;
  const previewCategoryName = categories.find((c) => c.id === categoryId)?.name ?? "";
  const listPriceNumber = parseFloat(listPriceGbp);
  const listPriceLine =
    Number.isFinite(listPriceNumber) && listPriceNumber > 0
      ? `Reference list price £${listPriceNumber.toFixed(2)}`
      : "Reference list price not set";
  const previewTitle = mode === "link" ? selectedListing?.title ?? "" : title;
  const previewImages = mode === "link" ? selectedListing?.images ?? [] : imageUrls;
  const previewPriceLine =
    mode === "link"
      ? `List price £${(((selectedListing?.price ?? 0) / 100) as number).toFixed(2)} · Hire from £${weeklyHireGbp || "0.00"}/wk`
      : `${listPriceLine} · Hire from £${weeklyHireGbp || "0.00"}/wk`;

  return (
    <div className="mx-auto max-w-6xl">
      <div className="flex flex-col gap-8 lg:flex-row lg:items-start">
        <div className="w-full max-w-2xl">
      <div className="mb-8 flex items-center gap-2 text-xs font-medium text-zinc-500">
        {[0, 1, 2, 3].map((i) => (
          <span key={i} className="flex items-center gap-2">
            {i > 0 ? <span className="text-zinc-300">/</span> : null}
            <span
              className={
                step === i
                  ? "rounded-full bg-amber-900 px-2 py-0.5 text-white"
                  : step > i
                    ? "text-amber-800"
                    : ""
              }
            >
              {i === 0 ? "Start" : i === 1 ? "Item" : i === 2 ? "Hire price" : "Delivery & terms"}
            </span>
          </span>
        ))}
      </div>

      {step === 0 ? (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-zinc-900">What are you adding?</h2>
          <p className="text-sm text-zinc-600">
            Re-use a marketplace listing so you don&apos;t enter the same item twice — we only add hire pricing and
            logistics. Or create a hire-only prop that stays off the marketplace.
          </p>
          <div className="grid gap-4 sm:grid-cols-2">
            <button
              type="button"
              disabled={linkable.length === 0}
              onClick={() => chooseMode("link")}
              className="rounded-xl border border-zinc-200 bg-white p-5 text-left shadow-sm transition hover:border-amber-700 hover:shadow disabled:cursor-not-allowed disabled:opacity-50"
            >
              <p className="font-semibold text-zinc-900">Already on the marketplace</p>
              <p className="mt-2 text-sm text-zinc-600">
                Pick a live listing and set weekly hire, minimum weeks, and how you deliver / collect.
              </p>
              {linkable.length === 0 ? (
                <p className="mt-3 text-xs text-amber-800">All your listings already have a Prop Yard offer, or you need an active listing first.</p>
              ) : null}
            </button>
            <button
              type="button"
              onClick={() => chooseMode("hire_only")}
              className="rounded-xl border border-zinc-200 bg-white p-5 text-left shadow-sm transition hover:border-amber-700 hover:shadow"
            >
              <p className="font-semibold text-zinc-900">Hire-only prop</p>
              <p className="mt-2 text-sm text-zinc-600">
                Prop Yard only — not shown in marketplace search. Same wizard: pricing, availability calendar, and hire
                notes.
              </p>
            </button>
          </div>
          {linkable.length === 0 ? (
            <p className="text-sm text-zinc-600">
              <Link href="/dashboard/sell" className="font-medium text-brand underline">
                Create a marketplace listing
              </Link>{" "}
              first if you want the item for sale and hire, or use hire-only above.
            </p>
          ) : null}
        </div>
      ) : null}

      {step === 1 && mode === "link" ? (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-zinc-900">Choose listing</h2>
          <label className="block text-xs font-medium text-zinc-700">Active fixed-price listing</label>
          <select
            value={listingId}
            onChange={(e) => {
              setListingId(e.target.value);
              const l = linkable.find((x) => x.id === e.target.value);
              if (l) {
                const w = suggestedWeeklyHirePence(l.price);
                setWeeklyHireGbp((w / 100).toFixed(2));
              }
            }}
            className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
          >
            {linkable.map((l) => (
              <option key={l.id} value={l.id}>
                {l.title} · £{(l.price / 100).toFixed(2)}
                {!l.visibleOnMarketplace ? " (hire-only listing)" : ""}
              </option>
            ))}
          </select>
          {selectedListing ? (
            <div className="flex gap-4 rounded-xl border border-zinc-200 bg-zinc-50 p-4">
              <div className="relative h-24 w-32 shrink-0 overflow-hidden rounded-lg bg-zinc-200">
                {selectedListing.images[0] ? (
                  <Image src={selectedListing.images[0]} alt="" fill className="object-cover" unoptimized />
                ) : (
                  <div className="flex h-full items-center justify-center text-xs text-zinc-500">No image</div>
                )}
              </div>
              <div className="min-w-0 text-sm">
                <p className="font-medium text-zinc-900">{selectedListing.title}</p>
                <p className="mt-1 text-zinc-600">
                  List price £{(selectedListing.price / 100).toFixed(2)} · suggested hire ≈ {pctLabel}%/week — editable
                  next step.
                </p>
              </div>
            </div>
          ) : null}
        </div>
      ) : null}

      {step === 1 && mode === "hire_only" ? (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-zinc-900">Prop details</h2>
          <p className="text-sm text-zinc-600">
            Reference list price is used for hire suggestions only; this item won&apos;t appear as a buy-now on the
            marketplace.
          </p>
          <div>
            <label className="block text-xs font-medium text-zinc-700">Title</label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-zinc-700">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              required
              rows={4}
              className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-zinc-700">Condition</label>
            <select
              value={condition}
              onChange={(e) => setCondition(e.target.value as keyof typeof CONDITION_LABELS)}
              className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
            >
              {Object.entries(CONDITION_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-zinc-700">Category</label>
            <select
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
            >
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
            <p className="mt-1 text-xs text-zinc-500">Or suggest a new category:</p>
            <input
              value={newCategoryName}
              onChange={(e) => setNewCategoryName(e.target.value)}
              placeholder="Optional new category name"
              className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-zinc-700">Item postcode (UK)</label>
            <input
              value={postcode}
              onChange={(e) => setPostcode(e.target.value)}
              required
              placeholder="e.g. NG1 6FQ"
              className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-zinc-700">Photos</label>
            <div className="mt-2 flex flex-wrap gap-3">
              {imageUrls.map((url) => (
                <div key={url} className="relative">
                  <img src={url} alt="" className="h-24 w-24 rounded-lg border border-zinc-200 object-cover" />
                  <button
                    type="button"
                    onClick={() => removeImage(url)}
                    className="absolute -right-2 -top-2 flex h-6 w-6 items-center justify-center rounded-full bg-red-500 text-xs text-white hover:bg-red-600"
                  >
                    x
                  </button>
                </div>
              ))}
              <label className="flex h-24 w-24 cursor-pointer items-center justify-center rounded-lg border-2 border-dashed border-zinc-300 hover:border-amber-700 hover:bg-amber-50">
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleFileChange}
                  disabled={uploading || !!cropState}
                />
                {uploading ? "..." : "+"}
              </label>
            </div>
            <p className="mt-2 text-xs text-zinc-500">At least one photo is required.</p>
            {uploadError ? <p className="mt-1 text-xs text-red-700">{uploadError}</p> : null}
          </div>
          <div>
            <label className="block text-xs font-medium text-zinc-700">Reference list price (£)</label>
            <input
              value={listPriceGbp}
              onChange={(e) => {
                setListPriceGbp(e.target.value);
                const p = Math.round(parseFloat(e.target.value || "0") * 100);
                const w = suggestedWeeklyHirePence(Number.isFinite(p) ? p : 0);
                setWeeklyHireGbp((w / 100).toFixed(2));
              }}
              type="number"
              step="0.01"
              min="0.5"
              required
              className="mt-1 w-full max-w-xs rounded-lg border border-zinc-300 px-3 py-2 text-sm"
            />
          </div>
        </div>
      ) : null}

      {step === 2 ? (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-zinc-900">Hire pricing</h2>
          <p className="text-sm text-zinc-600">
            Default is about <strong>{pctLabel}%</strong> of list price per week — adjust to match your yard.
          </p>
          <button
            type="button"
            onClick={syncWeeklyFromSuggestion}
            className="text-sm font-medium text-brand underline hover:text-amber-900"
          >
            Reset weekly rate to suggestion (£{suggestedWeekly})
          </button>
          <div>
            <label className="block text-xs font-medium text-zinc-700">Weekly hire (£)</label>
            <input
              value={weeklyHireGbp}
              onChange={(e) => setWeeklyHireGbp(e.target.value)}
              type="number"
              step="0.01"
              min="1"
              required
              className="mt-1 w-full max-w-xs rounded-lg border border-zinc-300 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-zinc-700">Minimum hire (weeks)</label>
            <input
              value={minimumHireWeeks}
              onChange={(e) => setMinimumHireWeeks(e.target.value)}
              type="number"
              min={1}
              max={52}
              required
              className="mt-1 w-full max-w-xs rounded-lg border border-zinc-300 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-zinc-700">Notes for hirers (optional)</label>
            <textarea
              value={yardHireNotes}
              onChange={(e) => setYardHireNotes(e.target.value)}
              rows={3}
              placeholder="Deposit, condition, collection hours, return expectations…"
              className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
            />
          </div>
        </div>
      ) : null}

      {step === 3 ? (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-zinc-900">Delivery, return & terms</h2>
          <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-zinc-200 bg-white p-4">
            <input
              type="checkbox"
              checked={offersDelivery}
              onChange={(e) => setOffersDelivery(e.target.checked)}
              className="mt-1"
            />
            <span>
              <span className="font-medium text-zinc-900">I can offer delivery / courier for hires</span>
              <span className="mt-1 block text-sm text-zinc-600">
                You&apos;ll still agree exact logistics with the production; this flag shows on the listing.
              </span>
            </span>
          </label>
          <div>
            <label className="block text-xs font-medium text-zinc-700">Delivery & return notes (optional)</label>
            <textarea
              value={deliveryNotes}
              onChange={(e) => setDeliveryNotes(e.target.value)}
              rows={3}
              placeholder="Areas covered, lead times, return condition, pallet policy…"
              className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
            />
          </div>
          <p className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-950">
            When a hire is marked <strong>Out on hire</strong> in your calendar, a listing that was live on the
            marketplace is hidden from browse until it&apos;s returned — so you don&apos;t double-book sale and hire.
          </p>
          <label className="flex cursor-pointer items-start gap-3">
            <input type="checkbox" checked={termsOk} onChange={(e) => setTermsOk(e.target.checked)} className="mt-1" />
            <span className="text-sm text-zinc-700">
              I confirm our hire process follows Prop Yard expectations and hirers will see hire terms (v
              {PROP_YARD_TERMS_VERSION}) when they send requests.{" "}
              <Link href="/prop-yard#hire-terms" className="font-medium text-brand underline">
                Read summary
              </Link>
            </span>
          </label>
        </div>
      ) : null}

      {step > 0 ? (
        <div className="mt-10 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={back}
            className="rounded-lg border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-800 hover:bg-zinc-50"
          >
            Back
          </button>
          {step < maxStep ? (
            <button
              type="button"
              onClick={() => {
                if (step === 1) nextFromStep1();
                else if (step === 2) nextFromStep2();
              }}
              className="rounded-lg bg-amber-900 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-950"
            >
              Continue
            </button>
          ) : (
            <button
              type="button"
              disabled={!termsOk}
              onClick={publish}
              className="rounded-lg bg-amber-900 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-950 disabled:opacity-50"
            >
              Publish to Prop Yard
            </button>
          )}
        </div>
      ) : null}
        </div>

        <aside className="hidden w-full max-w-sm shrink-0 lg:block lg:sticky lg:top-24">
          <ListingLivePreview
            images={previewImages}
            title={previewTitle}
            description={mode === "hire_only" ? description : ""}
            categoryName={mode === "hire_only" ? previewCategoryName : "Marketplace listing"}
            conditionLabel={mode === "hire_only" ? CONDITION_LABELS[condition] : "Used"}
            listingKind="sell"
            freeToCollector={false}
            priceLine={previewPriceLine}
            locationLine={postcode.trim() || "Add postcode"}
            auctionEndsLine={null}
            collectionLine={
              offersDelivery
                ? "Collection or delivery by arrangement with the yard."
                : "Collection and return by arrangement with the yard."
            }
            deliveryLines={offersDelivery ? ["Delivery available by arrangement"] : []}
            extraDeliveryNotes={deliveryNotes}
          />
        </aside>
      </div>

      <button
        type="button"
        onClick={() => setPreviewOpen(true)}
        className="fixed bottom-6 right-6 z-40 rounded-full bg-amber-900 px-4 py-3 text-sm font-semibold text-white shadow-lg hover:bg-amber-950 lg:hidden"
      >
        Preview
      </button>

      {previewOpen ? (
        <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true">
          <button
            type="button"
            className="absolute inset-0 bg-zinc-900/50"
            aria-label="Close preview"
            onClick={() => setPreviewOpen(false)}
          />
          <div className="absolute right-0 top-0 flex h-full w-[min(100%,380px)] max-w-full flex-col border-l border-zinc-200 bg-white shadow-2xl">
            <div className="flex shrink-0 items-center justify-between border-b border-zinc-200 px-4 py-3">
              <h2 className="text-sm font-semibold text-zinc-900">Prop preview</h2>
              <button
                type="button"
                onClick={() => setPreviewOpen(false)}
                className="rounded-lg p-2 text-zinc-500 hover:bg-zinc-100 hover:text-zinc-800"
                aria-label="Close"
              >
                <span className="text-xl leading-none">x</span>
              </button>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto p-3">
              <ListingLivePreview
                images={previewImages}
                title={previewTitle}
                description={mode === "hire_only" ? description : ""}
                categoryName={mode === "hire_only" ? previewCategoryName : "Marketplace listing"}
                conditionLabel={mode === "hire_only" ? CONDITION_LABELS[condition] : "Used"}
                listingKind="sell"
                freeToCollector={false}
                priceLine={previewPriceLine}
                locationLine={postcode.trim() || "Add postcode"}
                auctionEndsLine={null}
                collectionLine={
                  offersDelivery
                    ? "Collection or delivery by arrangement with the yard."
                    : "Collection and return by arrangement with the yard."
                }
                deliveryLines={offersDelivery ? ["Delivery available by arrangement"] : []}
                extraDeliveryNotes={deliveryNotes}
              />
            </div>
          </div>
        </div>
      ) : null}

      {/* Off-screen forms so server actions handle redirect */}
      <form
        ref={linkFormRef}
        action={createPropRentalOfferAction}
        className="pointer-events-none fixed left-0 top-0 h-0 w-0 overflow-hidden opacity-0"
        aria-hidden
      >
        <input type="hidden" name="_successReturn" value={SUCCESS} />
        <input type="hidden" name="_errorReturn" value={linkErrorReturn} />
        <input type="hidden" name="listingId" value={listingId} />
        <input type="hidden" name="weeklyHireGbp" value={weeklyHireGbp} />
        <input type="hidden" name="minimumHireWeeks" value={minimumHireWeeks} />
        <input type="hidden" name="yardHireNotes" value={yardHireNotes} />
        <input type="hidden" name="deliveryNotes" value={deliveryNotes} />
        {offersDelivery ? <input type="hidden" name="offersDelivery" value="on" /> : null}
      </form>

      <form
        ref={hireFormRef}
        action={createPropOnlyListingAndOfferAction}
        className="pointer-events-none fixed left-0 top-0 h-0 w-0 overflow-hidden opacity-0"
        aria-hidden
      >
        <input type="hidden" name="_successReturn" value={SUCCESS} />
        <input type="hidden" name="_errorReturn" value={ERROR_RETURN} />
        <input type="hidden" name="title" value={title} />
        <input type="hidden" name="description" value={description} />
        <input type="hidden" name="condition" value={condition} />
        <input type="hidden" name="categoryId" value={newCategoryName.trim() ? "" : categoryId} />
        <input type="hidden" name="newCategoryName" value={newCategoryName} />
        <input type="hidden" name="postcode" value={postcode} />
        <input type="hidden" name="images" value={imageUrls.join(",")} />
        <input type="hidden" name="listPriceGbp" value={listPriceGbp} />
        <input type="hidden" name="weeklyHireGbp" value={weeklyHireGbp} />
        <input type="hidden" name="minimumHireWeeks" value={minimumHireWeeks} />
        <input type="hidden" name="yardHireNotes" value={yardHireNotes} />
        <input type="hidden" name="deliveryNotes" value={deliveryNotes} />
        {offersDelivery ? <input type="hidden" name="offersDelivery" value="on" /> : null}
      </form>
      {cropState ? (
        <ListingImageCropModal
          imageSrc={cropState.src}
          fileName={cropState.fileName}
          onCancel={closeCrop}
          onComplete={uploadCroppedFile}
        />
      ) : null}
    </div>
  );
}

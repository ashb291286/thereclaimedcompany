"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createListing } from "@/lib/actions/listings";
import {
  Condition,
  ListingPricingMode,
  type ListingKind,
} from "@/generated/prisma/client";
import {
  suggestCategoryFromTitle,
  type CategorySuggestionResult,
} from "@/lib/category-suggest";
import type { Prisma } from "@/generated/prisma/client";
import { ListingImageCropModal } from "./ListingImageCropModal";
import { ListingLivePreview } from "./ListingLivePreview";
import { PostcodeLookupField } from "@/components/PostcodeLookupField";
import {
  DELIVERY_CARRIER_PRESETS,
  formatDeliveryOptionLine,
  hydrateCarrierForm,
  serializeCarrierForm,
  type DeliveryCarrierId,
  type CarrierFormRow,
} from "@/lib/delivery-carriers";
import { MATERIAL_FORM_OPTIONS_FALLBACK } from "@/lib/carbon/material-defaults";

type Category = Prisma.CategoryGetPayload<object>;
type ListingWithCategory = Prisma.ListingGetPayload<{ include: { category: true } }>;

const CONDITION_LABELS: Record<Condition, string> = {
  like_new: "Like new",
  used: "Used",
  worn: "Worn",
  parts_not_working: "Parts / not working",
  refurbished: "Refurbished",
  upcycled: "Upcycled",
  collectable: "Collectable",
};

const AUCTION_DAY_CHOICES = [3, 5, 7] as const;
type AuctionDayPreset = (typeof AUCTION_DAY_CHOICES)[number];
type AuctionDurationMode = AuctionDayPreset | "custom";

function toDatetimeLocalValue(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function defaultDatetimeLocalDaysFromNow(days: number): string {
  return toDatetimeLocalValue(new Date(Date.now() + days * 24 * 60 * 60 * 1000));
}

function auctionPreviewEndAt(mode: AuctionDurationMode, customStr: string): Date | null {
  if (mode === "custom") {
    if (!customStr.trim()) return null;
    const d = new Date(customStr);
    return Number.isNaN(d.getTime()) ? null : d;
  }
  return new Date(Date.now() + mode * 24 * 60 * 60 * 1000);
}

const LISTING_KIND_OPTIONS: {
  kind: ListingKind;
  title: string;
  description: string;
}[] = [
  {
    kind: "sell",
    title: "Fixed price",
    description: "Set a price. Buyers can pay now or send offers.",
  },
  {
    kind: "auction",
    title: "Auction",
    description: "Set a start price and how long it runs (3–7 days or a custom end). Highest bid wins.",
  },
];

function FormSection({
  step,
  title,
  description,
  children,
}: {
  step: number;
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm sm:p-6">
      <div className="mb-4 flex flex-wrap items-start gap-3 border-b border-zinc-100 pb-4">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand text-sm font-bold text-white">
          {step}
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="text-lg font-semibold text-zinc-900">{title}</h2>
          {description ? <p className="mt-1 text-sm text-zinc-600">{description}</p> : null}
        </div>
      </div>
      <div className="space-y-4">{children}</div>
    </section>
  );
}

export type MaterialOption = { materialType: string; label: string };

export function ListingForm({
  categories,
  defaultPostcode,
  listing,
  sellerDisplayName,
  materialOptions,
}: {
  categories: Category[];
  defaultPostcode: string;
  listing?: ListingWithCategory;
  sellerDisplayName?: string;
  materialOptions: MaterialOption[];
}) {
  const [imageUrls, setImageUrls] = useState<string[]>(listing?.images ?? []);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [listingKind, setListingKind] = useState<ListingKind>(listing?.listingKind ?? "sell");
  const [freeToCollector, setFreeToCollector] = useState(listing?.freeToCollector ?? false);
  const [notifyLocalYards, setNotifyLocalYards] = useState(listing?.notifyLocalYards ?? false);
  const [fulfillmentMode, setFulfillmentMode] = useState<"collection_only" | "collect_or_deliver">(
    listing?.offersDelivery ? "collect_or_deliver" : "collection_only"
  );
  const [carrierForm, setCarrierForm] = useState<Record<DeliveryCarrierId, CarrierFormRow>>(() =>
    hydrateCarrierForm(listing?.deliveryOptions)
  );
  const [cropState, setCropState] = useState<{ src: string; fileName: string } | null>(null);
  const cropBlobUrlRef = useRef<string | null>(null);
  const isEdit = !!listing;

  const [title, setTitle] = useState(listing?.title ?? "");
  const [description, setDescription] = useState(listing?.description ?? "");
  const [categoryId, setCategoryId] = useState(
    () => listing?.categoryId ?? categories[0]?.id ?? ""
  );
  const [condition, setCondition] = useState<Condition>(listing?.condition ?? "like_new");
  const [priceStr, setPriceStr] = useState(() => {
    if (!listing) return "";
    if (listing.freeToCollector) return "0";
    return (listing.price / 100).toFixed(2);
  });
  const [auctionDuration, setAuctionDuration] = useState<AuctionDurationMode>(() => {
    if (listing?.listingKind === "auction" && listing.auctionEndsAt) return "custom";
    return 7;
  });
  const [auctionCustomEndsStr, setAuctionCustomEndsStr] = useState(() =>
    listing?.auctionEndsAt != null ? toDatetimeLocalValue(new Date(listing.auctionEndsAt)) : ""
  );
  const [auctionReserveStr, setAuctionReserveStr] = useState(() =>
    listing?.auctionReservePence != null ? (listing.auctionReservePence / 100).toFixed(2) : ""
  );
  const [deliveryNotes, setDeliveryNotes] = useState(listing?.deliveryNotes ?? "");
  const [postcodePreview, setPostcodePreview] = useState(
    () => listing?.postcode?.trim() || defaultPostcode.trim() || ""
  );
  const [previewOpen, setPreviewOpen] = useState(false);
  const [materialType, setMaterialType] = useState(listing?.materialType ?? "");
  const [materialQtyStr, setMaterialQtyStr] = useState(
    listing?.materialQuantity != null ? String(listing.materialQuantity) : ""
  );
  const [materialUnit, setMaterialUnit] = useState(listing?.materialUnit ?? "kg");
  const [pricingModeUi, setPricingModeUi] = useState<ListingPricingMode>(
    () => listing?.pricingMode ?? ListingPricingMode.LOT
  );
  const [unitsAvailableStr, setUnitsAvailableStr] = useState(() =>
    listing?.unitsAvailable != null ? String(listing.unitsAvailable) : ""
  );
  const [categoryHint, setCategoryHint] = useState<CategorySuggestionResult | null>(null);

  const materialSelectOptions =
    materialOptions.length > 0 ? materialOptions : MATERIAL_FORM_OPTIONS_FALLBACK;

  useEffect(() => {
    if (freeToCollector) setFulfillmentMode("collection_only");
  }, [freeToCollector]);

  useEffect(() => {
    if (freeToCollector || listingKind !== "sell") setNotifyLocalYards(false);
  }, [freeToCollector, listingKind]);

  useEffect(() => {
    if (listingKind === "sell" && freeToCollector) setPriceStr("0");
  }, [listingKind, freeToCollector]);

  useEffect(() => {
    if (listingKind === "auction" || freeToCollector) {
      setPricingModeUi(ListingPricingMode.LOT);
    }
  }, [listingKind, freeToCollector]);

  useEffect(() => {
    const id = window.setTimeout(() => {
      if (title.trim().length < 3) {
        setCategoryHint(null);
        return;
      }
      setCategoryHint(suggestCategoryFromTitle(title, categories));
    }, 450);
    return () => clearTimeout(id);
  }, [title, categories]);

  useEffect(() => {
    if (!previewOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [previewOpen]);

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
    setError(null);
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
      setError(err instanceof Error ? err.message : "Upload failed");
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
      setError("Please choose an image file.");
      return;
    }
    setError(null);
    openCropForFile(file);
  }

  function removeImage(url: string) {
    setImageUrls((prev) => prev.filter((u) => u !== url));
  }

  const priceRequired = listingKind === "auction" || (listingKind === "sell" && !freeToCollector);
  const showDeliverySection = !freeToCollector;

  function setCarrierRow(id: DeliveryCarrierId, patch: Partial<CarrierFormRow>) {
    setCarrierForm((prev) => ({
      ...prev,
      [id]: { ...prev[id], ...patch },
    }));
  }

  const deliveryOptionsJson =
    showDeliverySection && fulfillmentMode === "collect_or_deliver"
      ? JSON.stringify(serializeCarrierForm(carrierForm))
      : "[]";

  const previewProps = useMemo(() => {
    const categoryName = categories.find((c) => c.id === categoryId)?.name ?? "";
    const conditionLabel = CONDITION_LABELS[condition];

    let priceLine: string;
    if (listingKind === "sell" && freeToCollector) {
      priceLine = "Free to collect";
    } else if (listingKind === "auction") {
      const p = parseFloat(priceStr);
      if (priceStr.trim() !== "" && !Number.isNaN(p)) {
        priceLine = `Starting bid £${p.toFixed(2)}`;
      } else {
        priceLine = "Set a starting bid";
      }
    } else {
      const p = parseFloat(priceStr);
      if (priceStr.trim() !== "" && !Number.isNaN(p)) {
        if (pricingModeUi === ListingPricingMode.PER_UNIT) {
          const u = parseInt(unitsAvailableStr, 10);
          const stock =
            Number.isFinite(u) && u >= 1
              ? `${u} unit${u === 1 ? "" : "s"}`
              : "set stock quantity";
          priceLine = `£${p.toFixed(2)} each · ${stock}`;
        } else {
          priceLine = `£${p.toFixed(2)} (whole lot)`;
        }
      } else {
        priceLine = "Set a price";
      }
    }

    let auctionEndsLine: string | null = null;
    if (listingKind === "auction") {
      const endAt = auctionPreviewEndAt(auctionDuration, auctionCustomEndsStr);
      if (endAt) {
        auctionEndsLine = `Ends ${endAt.toLocaleString(undefined, {
          dateStyle: "medium",
          timeStyle: "short",
        })}`;
      }
    }

    const locationLine = postcodePreview.trim() || "Add a postcode";

    let collectionLine: string;
    if (listingKind === "sell" && freeToCollector) {
      collectionLine =
        "Free listing — buyer arranges collection from your area. No paid checkout for the item.";
    } else if (!showDeliverySection || fulfillmentMode === "collection_only") {
      collectionLine = "Buyer collects from the item location (or you agree a handover).";
    } else {
      collectionLine = "Buyer can collect or arrange delivery using the options below.";
    }

    const deliveryLines =
      showDeliverySection && fulfillmentMode === "collect_or_deliver"
        ? serializeCarrierForm(carrierForm).map(formatDeliveryOptionLine)
        : [];

    return {
      images: imageUrls,
      title,
      description,
      categoryName,
      conditionLabel,
      listingKind,
      freeToCollector,
      priceLine,
      locationLine,
      auctionEndsLine,
      collectionLine,
      deliveryLines,
      extraDeliveryNotes: deliveryNotes,
    };
  }, [
    categories,
    categoryId,
    condition,
    listingKind,
    freeToCollector,
    priceStr,
    auctionDuration,
    auctionCustomEndsStr,
    postcodePreview,
    showDeliverySection,
    fulfillmentMode,
    carrierForm,
    imageUrls,
    title,
    description,
    deliveryNotes,
  ]);

  return (
    <>
      <div className="mt-8 flex flex-col gap-10 lg:flex-row lg:items-start lg:gap-8 xl:gap-10">
        <div className="min-w-0 w-full max-w-2xl pb-24 lg:max-w-xl lg:shrink-0 lg:pb-0 xl:-translate-x-1">
          <form
            action={createListing}
            className="space-y-8"
            onSubmit={(e) => {
              const form = e.currentTarget;
              if (listingKind === "sell" && freeToCollector) {
                const p = form.querySelector('[name="price"]') as HTMLInputElement;
                if (p) p.value = "0";
              }
              if (pricingModeUi !== ListingPricingMode.PER_UNIT) {
                const u = form.querySelector("#listing-units-available") as HTMLInputElement | null;
                if (u) u.value = "";
              }
            }}
          >
      <input type="hidden" name="listingKind" value={listingKind} />
      <input type="hidden" name="pricingMode" value={pricingModeUi} />
      {listingKind === "auction" ? (
        <input
          type="hidden"
          name="auctionDuration"
          value={auctionDuration === "custom" ? "custom" : String(auctionDuration)}
        />
      ) : null}
      <input type="hidden" name="images" value={imageUrls.join(",")} />
      <input type="hidden" name="fulfillmentMode" value={fulfillmentMode} />
      <input type="hidden" name="deliveryOptionsJson" value={deliveryOptionsJson} />
      {isEdit && <input type="hidden" name="listingId" value={listing.id} />}
      {error && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
      )}

      <FormSection
        step={1}
        title="How are you selling?"
        description="Choose a format. You can save a draft and come back."
      >
        <div className="grid gap-3 sm:grid-cols-2">
          {LISTING_KIND_OPTIONS.map((opt) => {
            const selected = listingKind === opt.kind;
            return (
              <button
                key={opt.kind}
                type="button"
                onClick={() => {
                  setListingKind(opt.kind);
                  if (opt.kind === "auction") setFreeToCollector(false);
                }}
                className={`rounded-xl border-2 p-4 text-left transition ${
                  selected
                    ? "border-brand bg-brand-soft/60 shadow-sm ring-1 ring-brand/20"
                    : "border-zinc-200 bg-zinc-50/80 hover:border-zinc-300 hover:bg-white"
                }`}
              >
                <span className="block text-base font-semibold text-zinc-900">{opt.title}</span>
                <span className="mt-1 block text-sm text-zinc-600">{opt.description}</span>
              </button>
            );
          })}
        </div>
        {listingKind === "sell" && (
          <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-zinc-200 bg-zinc-50/80 px-4 py-3 text-sm text-zinc-800">
            <input
              type="checkbox"
              name="freeToCollector"
              checked={freeToCollector}
              onChange={(e) => setFreeToCollector(e.target.checked)}
              className="rounded border-zinc-300 text-brand"
            />
            <span>
              <span className="font-medium">Free to collector</span>
              <span className="mt-0.5 block text-xs text-zinc-600">
                No payment — buyer arranges pickup from your location.
              </span>
            </span>
          </label>
        )}
        {listingKind === "sell" && !freeToCollector && (
          <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-emerald-200/80 bg-emerald-50/50 px-4 py-3 text-sm text-zinc-800">
            <input
              type="checkbox"
              name="notifyLocalYards"
              value="on"
              checked={notifyLocalYards}
              onChange={(e) => setNotifyLocalYards(e.target.checked)}
              className="rounded border-zinc-300 text-emerald-700"
            />
            <span>
              <span className="font-medium">Offer to local reclamation yards</span>
              <span className="mt-0.5 block text-xs text-zinc-600">
                When you publish, we notify yards within about 50 miles of this item&apos;s postcode. They can
                pass or send a price offer like any other buyer.
              </span>
            </span>
          </label>
        )}
        {listingKind === "auction" && (
          <div className="space-y-3">
            <div>
              <p className="text-sm font-medium text-zinc-700">Auction length</p>
              <p className="mt-1 text-xs text-zinc-600">
                3, 5, or 7 full days from when you save or publish. Custom lets you pick an exact end
                time.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              {AUCTION_DAY_CHOICES.map((days) => {
                const selected = auctionDuration === days;
                return (
                  <button
                    key={days}
                    type="button"
                    onClick={() => setAuctionDuration(days)}
                    className={`rounded-xl border-2 px-4 py-2.5 text-sm font-semibold transition ${
                      selected
                        ? "border-brand bg-brand-soft/60 shadow-sm ring-1 ring-brand/20"
                        : "border-zinc-200 bg-white hover:border-zinc-300"
                    }`}
                  >
                    {days} days
                  </button>
                );
              })}
              <button
                type="button"
                onClick={() => {
                  setAuctionDuration("custom");
                  setAuctionCustomEndsStr((prev) =>
                    prev.trim() ? prev : defaultDatetimeLocalDaysFromNow(7)
                  );
                }}
                className={`rounded-xl border-2 px-4 py-2.5 text-sm font-semibold transition ${
                  auctionDuration === "custom"
                    ? "border-brand bg-brand-soft/60 shadow-sm ring-1 ring-brand/20"
                    : "border-zinc-200 bg-white hover:border-zinc-300"
                }`}
              >
                Custom…
              </button>
            </div>
            {auctionDuration === "custom" ? (
              <div>
                <label htmlFor="auctionEndsAt" className="mb-1 block text-sm font-medium text-zinc-700">
                  Ends (your local time)
                </label>
                <input
                  id="auctionEndsAt"
                  name="auctionEndsAt"
                  type="datetime-local"
                  required
                  value={auctionCustomEndsStr}
                  onChange={(e) => setAuctionCustomEndsStr(e.target.value)}
                  className="w-full max-w-xs rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-900"
                />
              </div>
            ) : null}
          </div>
        )}
      </FormSection>

      <FormSection
        step={2}
        title="Photos"
        description="Clear shots sell faster. Choose 1:1, 4:3, or 2:1 when you crop each image."
      >
        <div className="flex flex-wrap gap-3">
          {imageUrls.map((url) => (
            <div key={url} className="relative">
              <img
                src={url}
                alt=""
                className="h-24 w-24 rounded-lg border border-zinc-200 object-cover"
              />
              <button
                type="button"
                onClick={() => removeImage(url)}
                className="absolute -right-2 -top-2 flex h-6 w-6 items-center justify-center rounded-full bg-red-500 text-xs text-white hover:bg-red-600"
              >
                ×
              </button>
            </div>
          ))}
          <label className="flex h-24 w-24 cursor-pointer items-center justify-center rounded-lg border-2 border-dashed border-zinc-300 hover:border-brand hover:bg-brand-soft/50">
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleFileChange}
              disabled={uploading || !!cropState}
            />
            {uploading ? "…" : "+"}
          </label>
        </div>
        <p className="text-xs text-zinc-500">At least one photo is required to publish.</p>
      </FormSection>

      <FormSection
        step={3}
        title="Describe the item"
        description="Buyers use this to decide — include size, material, era, and any wear."
      >
        <div>
          <label htmlFor="title" className="mb-1 block text-sm font-medium text-zinc-700">
            Title
          </label>
          <input
            id="title"
            name="title"
            type="text"
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Victorian fireplace surround"
            className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-zinc-900 focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
          />
        </div>
        {title.trim().length > 2 ? (
          <div className="rounded-xl border border-zinc-200 bg-zinc-50/90 px-3 py-3 text-sm text-zinc-700">
            {categoryHint?.bestMatch && categoryHint.score >= 0.65 ? (
              <div className="flex flex-wrap items-center gap-2">
                <span>
                  Suggested category:{" "}
                  <strong className="text-zinc-900">{categoryHint.bestMatch.name}</strong>
                </span>
                <button
                  type="button"
                  onClick={() => setCategoryId(categoryHint.bestMatch!.id)}
                  className="rounded-lg bg-brand px-3 py-1 text-xs font-semibold text-white hover:bg-brand-hover"
                >
                  Use suggestion
                </button>
              </div>
            ) : null}
            {categoryHint?.lowConfidence ? (
              <p className={categoryHint?.bestMatch && categoryHint.score >= 0.65 ? "mt-2" : ""}>
                No strong category match from the title alone — choose below or suggest a new category.
              </p>
            ) : null}
          </div>
        ) : null}
        <div>
          <label htmlFor="description" className="mb-1 block text-sm font-medium text-zinc-700">
            Description
          </label>
          <textarea
            id="description"
            name="description"
            rows={5}
            required
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Dimensions, condition, provenance, what’s included…"
            className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-zinc-900 focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
          />
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="categoryId" className="mb-1 block text-sm font-medium text-zinc-700">
              Category
            </label>
            <select
              id="categoryId"
              name="categoryId"
              required
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-zinc-900 focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
            >
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
            <div className="mt-3">
              <label
                htmlFor="newCategoryName"
                className="mb-1 block text-sm font-medium text-zinc-700"
              >
                Suggest a new category (optional)
              </label>
              <input
                id="newCategoryName"
                name="newCategoryName"
                type="text"
                placeholder="e.g. Cast iron radiators"
                className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-900 focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
              />
              <p className="mt-1 text-xs text-zinc-500">
                If you enter a name here, we&apos;ll add it and use it for this listing instead of the dropdown.
              </p>
            </div>
          </div>
          <div>
            <label htmlFor="condition" className="mb-1 block text-sm font-medium text-zinc-700">
              Condition
            </label>
            <select
              id="condition"
              name="condition"
              required
              value={condition}
              onChange={(e) => setCondition(e.target.value as Condition)}
              className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-zinc-900 focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
            >
              {(Object.entries(CONDITION_LABELS) as [Condition, string][]).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div>
          <label htmlFor="price" className="mb-1 block text-sm font-medium text-zinc-700">
            {listingKind === "auction" ? "Starting bid (£)" : "Price (£)"}
          </label>
          <input
            id="price"
            name="price"
            type="number"
            step="0.01"
            min="0"
            required={priceRequired}
            disabled={listingKind === "sell" && freeToCollector}
            value={priceStr}
            onChange={(e) => setPriceStr(e.target.value)}
            placeholder={listingKind === "auction" ? "Starting bid" : "0.00"}
            className="max-w-xs rounded-lg border border-zinc-300 px-3 py-2 text-zinc-900 focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand disabled:bg-zinc-100 disabled:text-zinc-500"
          />
          {listingKind === "sell" && freeToCollector && (
            <p className="mt-1 text-xs text-zinc-500">£0 — no checkout; buyer confirms collection only.</p>
          )}
        </div>
        {listingKind === "sell" && !freeToCollector && (
          <fieldset className="rounded-xl border border-zinc-200 bg-zinc-50/50 px-3 py-4">
            <legend className="px-1 text-sm font-medium text-zinc-800">How is your price structured?</legend>
            <p className="mb-3 text-xs text-zinc-600">
              <strong>Bulk / lot</strong> — one price for everything. <strong>Per unit</strong> — same price
              for each item; buyers choose how many they want (up to your stock).
            </p>
            <div className="flex flex-col gap-2 sm:flex-row sm:gap-4">
              <label className="flex cursor-pointer items-start gap-2 text-sm text-zinc-800">
                <input
                  type="radio"
                  className="mt-1 border-zinc-300 text-brand"
                  checked={pricingModeUi === ListingPricingMode.LOT}
                  onChange={() => setPricingModeUi(ListingPricingMode.LOT)}
                />
                <span>
                  <span className="font-medium">Bulk / lot</span>
                  <span className="mt-0.5 block text-xs text-zinc-600">One checkout buys the full listing.</span>
                </span>
              </label>
              <label className="flex cursor-pointer items-start gap-2 text-sm text-zinc-800">
                <input
                  type="radio"
                  className="mt-1 border-zinc-300 text-brand"
                  checked={pricingModeUi === ListingPricingMode.PER_UNIT}
                  onChange={() => setPricingModeUi(ListingPricingMode.PER_UNIT)}
                />
                <span>
                  <span className="font-medium">Per unit (individual pricing)</span>
                  <span className="mt-0.5 block text-xs text-zinc-600">
                    Price above is for a single unit; set how many you&apos;re selling.
                  </span>
                </span>
              </label>
            </div>
            {pricingModeUi === ListingPricingMode.PER_UNIT ? (
              <div className="mt-4">
                <label
                  htmlFor="listing-units-available"
                  className="mb-1 block text-sm font-medium text-zinc-700"
                >
                  How many units are for sale?
                </label>
                <input
                  id="listing-units-available"
                  name="unitsAvailable"
                  type="number"
                  min={1}
                  step={1}
                  value={unitsAvailableStr}
                  onChange={(e) => setUnitsAvailableStr(e.target.value)}
                  placeholder="e.g. 24"
                  className="max-w-xs rounded-lg border border-zinc-300 px-3 py-2 text-zinc-900 focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
                />
                <p className="mt-1 text-xs text-zinc-500">
                  Required to publish. Buyers can order any quantity from 1 up to this amount.
                </p>
              </div>
            ) : null}
          </fieldset>
        )}
        {listingKind === "auction" && (
          <div>
            <label htmlFor="auctionReserve" className="mb-1 block text-sm font-medium text-zinc-700">
              Reserve price (£) — optional
            </label>
            <input
              id="auctionReserve"
              name="auctionReserve"
              type="number"
              step="0.01"
              min="0"
              value={auctionReserveStr}
              onChange={(e) => setAuctionReserveStr(e.target.value)}
              placeholder="No reserve"
              className="max-w-xs rounded-lg border border-zinc-300 px-3 py-2 text-zinc-900 focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
            />
            <p className="mt-1 text-xs text-zinc-500">
              If set, it must be at least the starting bid. The item will not sell unless the winning bid
              meets this minimum. Buyers see that a reserve exists, not the amount.
            </p>
          </div>
        )}

        <div className="border-t border-zinc-100 pt-5">
          <p className="text-sm font-medium text-zinc-800">Material &amp; carbon estimate (optional)</p>
          <p className="mt-1 text-xs text-zinc-500">
            ICE-style embodied carbon factors (University of Bath) are used to show buyers an indicative CO₂e
            saving vs new production. Leave blank if you prefer not to show this.
          </p>
          <div className="mt-3 grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label htmlFor="materialType" className="mb-1 block text-sm font-medium text-zinc-700">
                Material type
              </label>
              <select
                id="materialType"
                name="materialType"
                value={materialType}
                onChange={(e) => setMaterialType(e.target.value)}
                className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-900 focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
              >
                <option value="">Not specified</option>
                {materialSelectOptions.map((m) => (
                  <option key={m.materialType} value={m.materialType}>
                    {m.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="materialQuantity" className="mb-1 block text-sm font-medium text-zinc-700">
                Quantity
              </label>
              <input
                id="materialQuantity"
                name="materialQuantity"
                type="number"
                step="any"
                min="0"
                value={materialQtyStr}
                onChange={(e) => setMaterialQtyStr(e.target.value)}
                placeholder="e.g. 120"
                className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-900 focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
              />
            </div>
            <div>
              <label htmlFor="materialUnit" className="mb-1 block text-sm font-medium text-zinc-700">
                Unit
              </label>
              <select
                id="materialUnit"
                name="materialUnit"
                value={materialUnit}
                onChange={(e) => setMaterialUnit(e.target.value)}
                className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-900 focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
              >
                <option value="kg">Kilograms (kg)</option>
                <option value="tonne">Tonnes</option>
                <option value="m3">Cubic metres (m³)</option>
              </select>
            </div>
          </div>
        </div>
      </FormSection>

      <FormSection
        step={4}
        title="Where is it?"
        description="We use this for search distance and to show buyers the area."
      >
        <PostcodeLookupField
          id="postcode"
          name="postcode"
          defaultValue={listing?.postcode ?? defaultPostcode}
          placeholder="e.g. SW1A 1AA"
          onValueChange={setPostcodePreview}
        />
      </FormSection>

      <FormSection
        step={5}
        title="Collection & delivery"
        description={
          freeToCollector
            ? "Free listings are collection-only — no delivery options."
            : "Most reclaimed items are collected. Say if you can also ship or use a courier."
        }
      >
        {!showDeliverySection ? (
          <p className="text-sm text-zinc-600">
            Buyers will collect from the postcode above. Delivery is not offered for free-to-collector
            listings.
          </p>
        ) : (
          <>
            <div className="grid gap-3 sm:grid-cols-2">
              <button
                type="button"
                onClick={() => setFulfillmentMode("collection_only")}
                className={`rounded-xl border-2 p-4 text-left transition ${
                  fulfillmentMode === "collection_only"
                    ? "border-brand bg-brand-soft/60 ring-1 ring-brand/20"
                    : "border-zinc-200 bg-zinc-50/80 hover:border-zinc-300"
                }`}
              >
                <span className="block text-sm font-semibold text-zinc-900">Collection only</span>
                <span className="mt-1 block text-xs text-zinc-600">
                  Buyer picks up from the item location (or you agree a handover). No shipping.
                </span>
              </button>
              <button
                type="button"
                onClick={() => setFulfillmentMode("collect_or_deliver")}
                className={`rounded-xl border-2 p-4 text-left transition ${
                  fulfillmentMode === "collect_or_deliver"
                    ? "border-brand bg-brand-soft/60 ring-1 ring-brand/20"
                    : "border-zinc-200 bg-zinc-50/80 hover:border-zinc-300"
                }`}
              >
                <span className="block text-sm font-semibold text-zinc-900">Collection or delivery</span>
                <span className="mt-1 block text-xs text-zinc-600">
                  Buyer can still collect, or you can arrange delivery — set options below.
                </span>
              </button>
            </div>

            {fulfillmentMode === "collect_or_deliver" && (
              <div className="space-y-4 rounded-xl border border-zinc-200 bg-zinc-50/50 p-4">
                <div>
                  <p className="text-sm font-medium text-zinc-800">Carriers &amp; prices</p>
                  <p className="mt-1 text-xs text-zinc-600">
                    Tick the services you offer. Leave price empty for &ldquo;quote on request&rdquo;. Live
                    carrier APIs need parcel size/weight and merchant accounts — we don&apos;t pull live rates
                    yet.
                  </p>
                  <ul className="mt-3 space-y-3">
                    {DELIVERY_CARRIER_PRESETS.map((p) => {
                      const row = carrierForm[p.id];
                      return (
                        <li
                          key={p.id}
                          className="flex flex-col gap-2 rounded-lg border border-zinc-200 bg-white p-3 sm:flex-row sm:items-center sm:gap-4"
                        >
                          <label className="flex min-w-[200px] cursor-pointer items-center gap-2 text-sm font-medium text-zinc-900">
                            <input
                              type="checkbox"
                              checked={row.enabled}
                              onChange={() =>
                                setCarrierRow(p.id, { enabled: !row.enabled })
                              }
                              className="rounded border-zinc-300 text-brand"
                            />
                            {p.label}
                          </label>
                          {p.id === "other" && row.enabled ? (
                            <input
                              type="text"
                              value={row.customLabel}
                              onChange={(e) =>
                                setCarrierRow(p.id, { customLabel: e.target.value })
                              }
                              placeholder="e.g. Palletline, local van…"
                              className="flex-1 rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-900"
                            />
                          ) : null}
                          {row.enabled ? (
                            <div className="flex flex-1 flex-wrap items-center gap-2 sm:justify-end">
                              <label className="flex items-center gap-1 text-xs text-zinc-600">
                                <span className="whitespace-nowrap">From £</span>
                                <input
                                  type="number"
                                  step="0.01"
                                  min="0"
                                  value={row.priceStr}
                                  onChange={(e) =>
                                    setCarrierRow(p.id, { priceStr: e.target.value })
                                  }
                                  placeholder="Quote"
                                  className="w-28 rounded-lg border border-zinc-300 px-2 py-1.5 text-sm text-zinc-900"
                                />
                              </label>
                            </div>
                          ) : null}
                        </li>
                      );
                    })}
                  </ul>
                </div>
                <div>
                  <label htmlFor="deliveryNotes" className="mb-1 block text-sm font-medium text-zinc-800">
                    Extra details (optional)
                  </label>
                  <textarea
                    id="deliveryNotes"
                    name="deliveryNotes"
                    rows={3}
                    value={deliveryNotes}
                    onChange={(e) => setDeliveryNotes(e.target.value)}
                    placeholder="Cut-off times, packaging, areas you won’t ship to, insurance…"
                    className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-900 focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
                  />
                </div>
                <p className="text-xs text-zinc-500">
                  Checkout covers the item only; delivery is agreed and paid as you arrange with the buyer.
                </p>
              </div>
            )}
          </>
        )}
      </FormSection>

      <div className="flex flex-wrap gap-3 border-t border-zinc-200 pt-6">
        <button
          type="submit"
          name="publish"
          value="false"
          className="rounded-lg border border-zinc-300 px-4 py-2.5 font-medium text-zinc-700 hover:bg-zinc-50"
        >
          Save as draft
        </button>
        <button
          type="submit"
          name="publish"
          value="true"
          className="rounded-lg bg-brand px-4 py-2.5 font-medium text-white hover:bg-brand-hover"
        >
          {isEdit ? "Update & publish" : "Publish listing"}
        </button>
      </div>
    </form>
        </div>

        <aside className="hidden w-full min-w-[280px] max-w-sm shrink-0 lg:block lg:self-start xl:min-w-[300px]">
          <div className="lg:sticky lg:top-24">
            <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
              Live preview
            </p>
            <div className="max-h-[min(80vh,calc(100dvh-8rem))] overflow-y-auto overscroll-y-contain pr-1 [scrollbar-gutter:stable]">
              <ListingLivePreview {...previewProps} sellerDisplayName={sellerDisplayName} />
            </div>
          </div>
        </aside>
      </div>

      <button
        type="button"
        onClick={() => setPreviewOpen(true)}
        className="fixed bottom-6 right-6 z-40 rounded-full bg-brand px-4 py-3 text-sm font-semibold text-white shadow-lg ring-2 ring-white/40 hover:bg-brand-hover lg:hidden"
      >
        Preview
      </button>

      {previewOpen ? (
        <div
          className="fixed inset-0 z-50 lg:hidden"
          role="dialog"
          aria-modal="true"
          aria-labelledby="listing-preview-drawer-title"
        >
          <button
            type="button"
            className="absolute inset-0 bg-zinc-900/50"
            aria-label="Close preview"
            onClick={() => setPreviewOpen(false)}
          />
          <div className="absolute right-0 top-0 flex h-full w-[min(100%,380px)] max-w-full flex-col border-l border-zinc-200 bg-white shadow-2xl">
            <div className="flex shrink-0 items-center justify-between border-b border-zinc-200 px-4 py-3">
              <h2 id="listing-preview-drawer-title" className="text-sm font-semibold text-zinc-900">
                Buyer preview
              </h2>
              <button
                type="button"
                onClick={() => setPreviewOpen(false)}
                className="rounded-lg p-2 text-zinc-500 hover:bg-zinc-100 hover:text-zinc-800"
                aria-label="Close"
              >
                <span className="text-xl leading-none">×</span>
              </button>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto p-3">
              <ListingLivePreview {...previewProps} sellerDisplayName={sellerDisplayName} />
            </div>
          </div>
        </div>
      ) : null}

      {cropState ? (
        <ListingImageCropModal
          imageSrc={cropState.src}
          fileName={cropState.fileName}
          onCancel={closeCrop}
          onComplete={uploadCroppedFile}
        />
      ) : null}
    </>
  );
}

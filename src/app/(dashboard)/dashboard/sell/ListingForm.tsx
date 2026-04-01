"use client";

import { useEffect, useRef, useState } from "react";
import { createListing } from "@/lib/actions/listings";
import { Condition, type ListingKind } from "@/generated/prisma/client";
import type { Prisma } from "@/generated/prisma/client";
import { ListingImageCropModal } from "./ListingImageCropModal";
import { PostcodeLookupField } from "@/components/PostcodeLookupField";

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
    description: "Set a start price and end time. Highest bid wins.",
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

export function ListingForm({
  categories,
  defaultPostcode,
  listing,
}: {
  categories: Category[];
  defaultPostcode: string;
  listing?: ListingWithCategory;
}) {
  const [imageUrls, setImageUrls] = useState<string[]>(listing?.images ?? []);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [listingKind, setListingKind] = useState<ListingKind>(listing?.listingKind ?? "sell");
  const [freeToCollector, setFreeToCollector] = useState(listing?.freeToCollector ?? false);
  const [fulfillmentMode, setFulfillmentMode] = useState<"collection_only" | "collect_or_deliver">(
    listing?.offersDelivery ? "collect_or_deliver" : "collection_only"
  );
  const [deliveryPricing, setDeliveryPricing] = useState<"quote" | "fixed">(
    listing?.deliveryCostPence != null ? "fixed" : "quote"
  );
  const [cropState, setCropState] = useState<{ src: string; fileName: string } | null>(null);
  const cropBlobUrlRef = useRef<string | null>(null);
  const isEdit = !!listing;

  const auctionEndsDefault =
    listing?.auctionEndsAt != null
      ? new Date(listing.auctionEndsAt).toISOString().slice(0, 16)
      : "";

  useEffect(() => {
    if (freeToCollector) setFulfillmentMode("collection_only");
  }, [freeToCollector]);

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

  return (
    <form
      action={createListing}
      className="mt-8 space-y-8"
      onSubmit={(e) => {
        const form = e.currentTarget;
        if (listingKind === "sell" && freeToCollector) {
          const p = form.querySelector('[name="price"]') as HTMLInputElement;
          if (p) p.value = "0";
        }
      }}
    >
      <input type="hidden" name="listingKind" value={listingKind} />
      <input type="hidden" name="images" value={imageUrls.join(",")} />
      <input type="hidden" name="fulfillmentMode" value={fulfillmentMode} />
      <input type="hidden" name="deliveryPricing" value={deliveryPricing} />
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
        {listingKind === "auction" && (
          <div>
            <label htmlFor="auctionEndsAt" className="mb-1 block text-sm font-medium text-zinc-700">
              Auction ends (local time)
            </label>
            <input
              id="auctionEndsAt"
              name="auctionEndsAt"
              type="datetime-local"
              required
              defaultValue={auctionEndsDefault}
              className="w-full max-w-xs rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-900"
            />
          </div>
        )}
      </FormSection>

      <FormSection
        step={2}
        title="Photos"
        description="Clear shots sell faster. Each image is cropped to 4:3 before upload."
      >
        <div className="flex flex-wrap gap-3">
          {imageUrls.map((url) => (
            <div key={url} className="relative">
              <img
                src={url}
                alt=""
                className="h-24 w-32 rounded-lg border border-zinc-200 object-cover"
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
          <label className="flex h-24 w-32 cursor-pointer items-center justify-center rounded-lg border-2 border-dashed border-zinc-300 hover:border-brand hover:bg-brand-soft/50">
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
            defaultValue={listing?.title}
            placeholder="e.g. Victorian fireplace surround"
            className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-zinc-900 focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
          />
        </div>
        <div>
          <label htmlFor="description" className="mb-1 block text-sm font-medium text-zinc-700">
            Description
          </label>
          <textarea
            id="description"
            name="description"
            rows={5}
            required
            defaultValue={listing?.description}
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
              defaultValue={listing?.categoryId}
              className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-zinc-900 focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
            >
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="condition" className="mb-1 block text-sm font-medium text-zinc-700">
              Condition
            </label>
            <select
              id="condition"
              name="condition"
              required
              defaultValue={listing?.condition}
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
            defaultValue={
              listing && !(listingKind === "sell" && freeToCollector)
                ? (listing.price / 100).toFixed(2)
                : listingKind === "sell" && freeToCollector
                  ? "0"
                  : undefined
            }
            placeholder={listingKind === "auction" ? "Starting bid" : "0.00"}
            className="max-w-xs rounded-lg border border-zinc-300 px-3 py-2 text-zinc-900 focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand disabled:bg-zinc-100 disabled:text-zinc-500"
          />
          {listingKind === "sell" && freeToCollector && (
            <p className="mt-1 text-xs text-zinc-500">£0 — no checkout; buyer confirms collection only.</p>
          )}
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
                  <label htmlFor="deliveryNotes" className="mb-1 block text-sm font-medium text-zinc-800">
                    Delivery options
                  </label>
                  <textarea
                    id="deliveryNotes"
                    name="deliveryNotes"
                    rows={4}
                    defaultValue={listing?.deliveryNotes ?? ""}
                    placeholder="e.g. Pallet delivery UK mainland, 5–7 working days; buyer can book their own courier from our yard; I can wrap for £X…"
                    className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-900 focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
                  />
                </div>
                <div>
                  <p className="mb-2 text-sm font-medium text-zinc-800">Delivery cost</p>
                  <div className="grid gap-2 sm:grid-cols-2">
                    <button
                      type="button"
                      onClick={() => setDeliveryPricing("quote")}
                      className={`rounded-lg border-2 px-3 py-2.5 text-left text-sm transition ${
                        deliveryPricing === "quote"
                          ? "border-brand bg-white shadow-sm"
                          : "border-zinc-200 bg-white hover:border-zinc-300"
                      }`}
                    >
                      <span className="font-medium text-zinc-900">Quote on request</span>
                      <span className="mt-0.5 block text-xs text-zinc-600">
                        Price depends on address — you agree after purchase.
                      </span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setDeliveryPricing("fixed")}
                      className={`rounded-lg border-2 px-3 py-2.5 text-left text-sm transition ${
                        deliveryPricing === "fixed"
                          ? "border-brand bg-white shadow-sm"
                          : "border-zinc-200 bg-white hover:border-zinc-300"
                      }`}
                    >
                      <span className="font-medium text-zinc-900">Fixed from (£)</span>
                      <span className="mt-0.5 block text-xs text-zinc-600">
                        Starting price you commit to (e.g. pallet rate). Use 0 for free delivery.
                      </span>
                    </button>
                  </div>
                </div>
                {deliveryPricing === "fixed" && (
                  <div>
                    <label htmlFor="deliveryCost" className="mb-1 block text-sm font-medium text-zinc-700">
                      Delivery from (£)
                    </label>
                    <input
                      id="deliveryCost"
                      name="deliveryCost"
                      type="number"
                      step="0.01"
                      min="0"
                      defaultValue={
                        listing?.deliveryCostPence != null
                          ? (listing.deliveryCostPence / 100).toFixed(2)
                          : ""
                      }
                      placeholder="0.00"
                      className="max-w-[200px] rounded-lg border border-zinc-300 px-3 py-2 text-zinc-900 focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
                    />
                  </div>
                )}
                <p className="text-xs text-zinc-500">
                  Checkout still covers the item price only; delivery is arranged and paid as you describe
                  (e.g. invoice separately or cash on delivery).
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

      {cropState && (
        <ListingImageCropModal
          imageSrc={cropState.src}
          fileName={cropState.fileName}
          onCancel={closeCrop}
          onComplete={uploadCroppedFile}
        />
      )}
    </form>
  );
}

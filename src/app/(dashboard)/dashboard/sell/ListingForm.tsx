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
  const [cropState, setCropState] = useState<{ src: string; fileName: string } | null>(null);
  const cropBlobUrlRef = useRef<string | null>(null);
  const isEdit = !!listing;

  const auctionEndsDefault =
    listing?.auctionEndsAt != null
      ? new Date(listing.auctionEndsAt).toISOString().slice(0, 16)
      : "";

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

  return (
    <form
      action={createListing}
      className="mt-8 space-y-6"
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
      {isEdit && <input type="hidden" name="listingId" value={listing.id} />}
      {error && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
      )}

      <div>
        <h2 className="mb-1 text-sm font-semibold text-zinc-900">How are you listing?</h2>
        <p className="mb-3 text-sm text-zinc-600">Choose one — you can change details below.</p>
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
                    : "border-zinc-200 bg-white hover:border-zinc-300 hover:bg-zinc-50"
                }`}
              >
                <span className="block text-base font-semibold text-zinc-900">{opt.title}</span>
                <span className="mt-1 block text-sm text-zinc-600">{opt.description}</span>
              </button>
            );
          })}
        </div>
        {listingKind === "sell" && (
          <label className="mt-4 flex cursor-pointer items-center gap-2 rounded-lg border border-zinc-200 bg-zinc-50/80 px-3 py-2.5 text-sm text-zinc-700">
            <input
              type="checkbox"
              name="freeToCollector"
              checked={freeToCollector}
              onChange={(e) => setFreeToCollector(e.target.checked)}
              className="rounded border-zinc-300 text-brand"
            />
            Free to collector (no payment — buyer arranges pickup)
          </label>
        )}
        {listingKind === "auction" && (
          <div className="mt-4">
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
      </div>

      <div>
        <label className="mb-2 block text-sm font-medium text-zinc-700">Photos</label>
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
        <p className="mt-1 text-xs text-zinc-500">
          Add one at a time. Each photo opens a crop step (4:3) before upload.
        </p>
      </div>

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
          rows={4}
          required
          defaultValue={listing?.description}
          placeholder="Describe the item, dimensions, any damage..."
          className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-zinc-900 focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
        />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
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
            className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-zinc-900 focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand disabled:bg-zinc-100 disabled:text-zinc-500"
          />
          {listingKind === "sell" && freeToCollector && (
            <p className="mt-1 text-xs text-zinc-500">Price is £0 — no checkout; buyer confirms collection.</p>
          )}
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
        <label htmlFor="postcode" className="mb-1 block text-sm font-medium text-zinc-700">
          Postcode (item location)
        </label>
        <PostcodeLookupField
          id="postcode"
          name="postcode"
          defaultValue={listing?.postcode ?? defaultPostcode}
          placeholder="e.g. SW1A 1AA"
        />
      </div>
      <div className="flex gap-3">
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

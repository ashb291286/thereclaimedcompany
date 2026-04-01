"use client";

import { useState } from "react";
import { createListing } from "@/lib/actions/listings";
import { Condition, type ListingKind } from "@/generated/prisma/client";
import type { Prisma } from "@/generated/prisma/client";

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
  const isEdit = !!listing;

  const auctionEndsDefault =
    listing?.auctionEndsAt != null
      ? new Date(listing.auctionEndsAt).toISOString().slice(0, 16)
      : "";

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (!files?.length) return;
    setUploading(true);
    setError(null);
    try {
      const urls: string[] = [];
      for (let i = 0; i < files.length; i++) {
        const formData = new FormData();
        formData.set("file", files[i]);
        const res = await fetch("/api/upload", { method: "POST", body: formData });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.error ?? "Upload failed");
        }
        const data = await res.json();
        if (data.url) urls.push(data.url);
      }
      setImageUrls((prev) => [...prev, ...urls]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
      e.target.value = "";
    }
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
        <label className="mb-2 block text-sm font-medium text-zinc-700">Photos</label>
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
              multiple
              className="hidden"
              onChange={handleFileChange}
              disabled={uploading}
            />
            {uploading ? "…" : "+"}
          </label>
        </div>
        <p className="mt-1 text-xs text-zinc-500">At least one photo required.</p>
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

      <fieldset className="rounded-xl border border-zinc-200 bg-zinc-50/80 p-4">
        <legend className="px-1 text-sm font-semibold text-zinc-800">How are you selling?</legend>
        <div className="mt-2 flex flex-col gap-3 sm:flex-row sm:gap-6">
          <label className="flex cursor-pointer items-center gap-2 text-sm">
            <input
              type="radio"
              name="listingKindRadio"
              checked={listingKind === "sell"}
              onChange={() => {
                setListingKind("sell");
              }}
              className="text-brand"
            />
            Fixed price (buy now / offers)
          </label>
          <label className="flex cursor-pointer items-center gap-2 text-sm">
            <input
              type="radio"
              name="listingKindRadio"
              checked={listingKind === "auction"}
              onChange={() => {
                setListingKind("auction");
                setFreeToCollector(false);
              }}
              className="text-brand"
            />
            Auction (timed bidding)
          </label>
        </div>
        {listingKind === "sell" && (
          <label className="mt-3 flex cursor-pointer items-center gap-2 text-sm text-zinc-700">
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
          <div className="mt-3">
            <label htmlFor="auctionEndsAt" className="mb-1 block text-xs font-medium text-zinc-600">
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
      </fieldset>

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
        <input
          id="postcode"
          name="postcode"
          type="text"
          defaultValue={listing?.postcode ?? defaultPostcode}
          placeholder="e.g. SW1A 1AA"
          className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-zinc-900 focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
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
    </form>
  );
}

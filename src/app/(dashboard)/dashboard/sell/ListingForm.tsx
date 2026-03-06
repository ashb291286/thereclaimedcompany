"use client";

import { useState } from "react";
import { createListing } from "@/lib/actions/listings";
import { Condition } from "@/generated/prisma/client";
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
  userId,
  listing,
}: {
  categories: Category[];
  defaultPostcode: string;
  userId: string;
  listing?: ListingWithCategory;
}) {
  const [imageUrls, setImageUrls] = useState<string[]>(listing?.images ?? []);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isEdit = !!listing;

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

  return (
    <form action={createListing} className="mt-8 space-y-6">
      <input type="hidden" name="images" value={imageUrls.join(",")} />
      {isEdit && <input type="hidden" name="listingId" value={listing.id} />}
      {error && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
      )}
      <div>
        <label className="block text-sm font-medium text-zinc-700 mb-2">Photos</label>
        <div className="flex flex-wrap gap-3">
          {imageUrls.map((url) => (
            <div key={url} className="relative">
              <img
                src={url}
                alt=""
                className="h-24 w-24 rounded-lg object-cover border border-zinc-200"
              />
              <button
                type="button"
                onClick={() => removeImage(url)}
                className="absolute -top-2 -right-2 h-6 w-6 rounded-full bg-red-500 text-white text-xs flex items-center justify-center hover:bg-red-600"
              >
                ×
              </button>
            </div>
          ))}
          <label className="h-24 w-24 rounded-lg border-2 border-dashed border-zinc-300 flex items-center justify-center cursor-pointer hover:border-amber-500 hover:bg-amber-50/50">
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
        <label htmlFor="title" className="block text-sm font-medium text-zinc-700 mb-1">
          Title
        </label>
        <input
          id="title"
          name="title"
          type="text"
          required
          defaultValue={listing?.title}
          placeholder="e.g. Victorian fireplace surround"
          className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-zinc-900 focus:border-amber-600 focus:outline-none focus:ring-1 focus:ring-amber-600"
        />
      </div>
      <div>
        <label htmlFor="description" className="block text-sm font-medium text-zinc-700 mb-1">
          Description
        </label>
        <textarea
          id="description"
          name="description"
          rows={4}
          required
          defaultValue={listing?.description}
          placeholder="Describe the item, dimensions, any damage..."
          className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-zinc-900 focus:border-amber-600 focus:outline-none focus:ring-1 focus:ring-amber-600"
        />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label htmlFor="price" className="block text-sm font-medium text-zinc-700 mb-1">
            Price (£)
          </label>
          <input
            id="price"
            name="price"
            type="number"
            step="0.01"
            min="0"
            required
            defaultValue={listing ? (listing.price / 100).toFixed(2) : undefined}
            placeholder="0.00"
            className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-zinc-900 focus:border-amber-600 focus:outline-none focus:ring-1 focus:ring-amber-600"
          />
        </div>
        <div>
          <label htmlFor="condition" className="block text-sm font-medium text-zinc-700 mb-1">
            Condition
          </label>
          <select
            id="condition"
            name="condition"
            required
            defaultValue={listing?.condition}
            className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-zinc-900 focus:border-amber-600 focus:outline-none focus:ring-1 focus:ring-amber-600"
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
        <label htmlFor="categoryId" className="block text-sm font-medium text-zinc-700 mb-1">
          Category
        </label>
        <select
          id="categoryId"
          name="categoryId"
          required
          defaultValue={listing?.categoryId}
          className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-zinc-900 focus:border-amber-600 focus:outline-none focus:ring-1 focus:ring-amber-600"
        >
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label htmlFor="postcode" className="block text-sm font-medium text-zinc-700 mb-1">
          Postcode (item location)
        </label>
        <input
          id="postcode"
          name="postcode"
          type="text"
          defaultValue={listing?.postcode ?? defaultPostcode}
          placeholder="e.g. SW1A 1AA"
          className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-zinc-900 focus:border-amber-600 focus:outline-none focus:ring-1 focus:ring-amber-600"
        />
      </div>
      <div className="flex gap-3">
        <button
          type="submit"
          name="publish"
          value="false"
          className="rounded-lg border border-zinc-300 px-4 py-2.5 font-medium text-zinc-700 hover:bg-zinc-50"
        >
          {isEdit ? "Save as draft" : "Save as draft"}
        </button>
        <button
          type="submit"
          name="publish"
          value="true"
          className="rounded-lg bg-amber-600 px-4 py-2.5 font-medium text-white hover:bg-amber-700"
        >
          {isEdit ? "Update & publish" : "Publish listing"}
        </button>
      </div>
    </form>
  );
}

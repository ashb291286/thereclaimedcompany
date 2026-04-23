"use client";

import { useRef, useState } from "react";
import { postDealerDealMessageAction } from "@/lib/actions/dealer-deals";

const MAX_IMAGES = 6;
const MAX_BYTES = 8 * 1024 * 1024;

export function DealerDealMessageForm({
  listingId,
  buyerId,
}: {
  listingId: string;
  buyerId: string;
}) {
  const [imageUrls, setImageUrls] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement | null>(null);

  async function onPickFiles(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    e.target.value = "";
    if (!files?.length) return;
    setError(null);
    setUploading(true);
    try {
      const next = [...imageUrls];
      for (const file of Array.from(files)) {
        if (next.length >= MAX_IMAGES) break;
        if (!file.type.startsWith("image/")) {
          setError("Only image files are allowed.");
          continue;
        }
        if (file.size > MAX_BYTES) {
          setError("Each image must be 8MB or smaller.");
          continue;
        }
        const fd = new FormData();
        fd.set("file", file);
        fd.set("folder", "dealer-deal-message");
        const res = await fetch("/api/upload", { method: "POST", body: fd });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.error ?? "Upload failed");
        }
        const data = (await res.json()) as { url?: string };
        if (data.url) next.push(data.url);
      }
      setImageUrls(next.slice(0, MAX_IMAGES));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  function removeUrl(url: string) {
    setImageUrls((prev) => prev.filter((u) => u !== url));
  }

  return (
    <form
      action={postDealerDealMessageAction}
      className="mt-4 border-t border-zinc-200 pt-4"
      onSubmit={(e) => {
        setError(null);
        const form = e.currentTarget;
        const text = (form.querySelector('textarea[name="message"]') as HTMLTextAreaElement | null)?.value?.trim() ?? "";
        if (!text && imageUrls.length === 0) {
          e.preventDefault();
          setError("Add a message or at least one image.");
        }
      }}
    >
      <input type="hidden" name="listingId" value={listingId} />
      <input type="hidden" name="buyerId" value={buyerId} />
      <input type="hidden" name="imageUrls" value={imageUrls.join(",")} />
      {error ? <p className="mb-2 text-xs text-rose-700">{error}</p> : null}
      <textarea
        name="message"
        rows={3}
        placeholder="Write your message… (optional if you attach images)"
        className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
      />
      {imageUrls.length > 0 ? (
        <ul className="mt-2 flex flex-wrap gap-2">
          {imageUrls.map((url) => (
            <li key={url} className="relative">
              <img src={url} alt="" className="h-16 w-16 rounded-lg border border-zinc-200 object-cover" />
              <button
                type="button"
                onClick={() => removeUrl(url)}
                className="absolute -right-1 -top-1 rounded-full bg-zinc-800 px-1.5 text-[10px] text-white"
                aria-label="Remove image"
              >
                ×
              </button>
            </li>
          ))}
        </ul>
      ) : null}
      <div className="mt-2 flex flex-wrap items-center gap-2">
        <input ref={fileRef} type="file" accept="image/*" multiple className="hidden" onChange={onPickFiles} />
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          disabled={uploading || imageUrls.length >= MAX_IMAGES}
          className="rounded-lg border border-zinc-300 bg-white px-3 py-1.5 text-xs font-medium text-zinc-800 hover:bg-zinc-50 disabled:opacity-50"
        >
          {uploading ? "Uploading…" : "Add images"}
        </button>
        <span className="text-xs text-zinc-500">
          Up to {MAX_IMAGES} images · confirmation photos, condition, etc.
        </span>
      </div>
      <button
        type="submit"
        className="mt-3 rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800"
      >
        Send message
      </button>
    </form>
  );
}

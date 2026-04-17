"use client";

import { type ChangeEvent, useMemo, useRef, useState } from "react";

type Props = {
  name?: string;
  /** Initial URL when editing an existing post */
  defaultUrl?: string | null;
};

export function BlogFeaturedImageField({ name = "featuredImageUrl", defaultUrl = null }: Props) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [imageUrl, setImageUrl] = useState(() => (defaultUrl ?? "").trim());
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const previewUrl = useMemo(() => imageUrl.trim(), [imageUrl]);

  async function onUploadChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    setError(null);
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("folder", "blog-featured");

      const response = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });
      const payload = (await response.json()) as { url?: string; error?: string };
      if (!response.ok || !payload.url) {
        throw new Error(payload.error || "Upload failed");
      }
      setImageUrl(payload.url);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Upload failed";
      setError(message);
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  }

  return (
    <div className="grid gap-3 rounded-lg border border-zinc-200 p-3">
      <label className="text-sm">
        <span className="mb-1 block text-xs font-medium text-zinc-700">Featured image URL (optional)</span>
        <input
          name={name}
          value={imageUrl}
          onChange={(event) => setImageUrl(event.target.value)}
          placeholder="https://..."
          className="w-full rounded border border-zinc-300 px-3 py-2 text-sm"
        />
      </label>

      <div className="flex flex-wrap items-center gap-2">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={onUploadChange}
          disabled={uploading}
          className="block text-xs text-zinc-600 file:mr-2 file:rounded file:border file:border-zinc-300 file:bg-white file:px-2 file:py-1 file:text-xs file:text-zinc-700 hover:file:bg-zinc-50"
        />
        {uploading ? <span className="text-xs text-zinc-500">Uploading...</span> : null}
      </div>

      {error ? <p className="text-xs text-rose-700">{error}</p> : null}
      {previewUrl ? (
        <img
          src={previewUrl}
          alt="Featured preview"
          className="max-h-56 w-full rounded border border-zinc-200 object-cover"
        />
      ) : null}
    </div>
  );
}

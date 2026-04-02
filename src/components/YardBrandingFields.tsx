"use client";

import { useState } from "react";

export function YardBrandingFields({
  initialLogoUrl,
  initialHeaderUrl,
}: {
  initialLogoUrl: string | null;
  initialHeaderUrl: string | null;
}) {
  const [logoUrl, setLogoUrl] = useState(initialLogoUrl ?? "");
  const [headerUrl, setHeaderUrl] = useState(initialHeaderUrl ?? "");
  const [uploading, setUploading] = useState<"logo" | "header" | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function uploadKind(kind: "logo" | "header", file: File) {
    setError(null);
    setUploading(kind);
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("folder", kind === "logo" ? "yard-logo" : "yard-header");
      const res = await fetch("/api/upload", { method: "POST", body: fd });
      const data = (await res.json()) as { url?: string; error?: string };
      if (!res.ok) {
        setError(data.error ?? "Upload failed");
        return;
      }
      if (data.url) {
        if (kind === "logo") setLogoUrl(data.url);
        else setHeaderUrl(data.url);
      }
    } finally {
      setUploading(null);
    }
  }

  return (
    <div className="space-y-4">
      <input type="hidden" name="yardLogoUrl" value={logoUrl} />
      <input type="hidden" name="yardHeaderImageUrl" value={headerUrl} />

      <div>
        <label className="mb-2 block text-sm font-medium text-zinc-700">Yard logo</label>
        <p className="mb-2 text-xs text-zinc-500">Square image works best (shown on your public page and in search snippets).</p>
        <div className="flex flex-wrap items-center gap-3">
          {logoUrl ? (
            <div className="relative h-20 w-20 overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={logoUrl} alt="" className="h-full w-full object-contain p-1" />
            </div>
          ) : (
            <div className="flex h-20 w-20 items-center justify-center rounded-xl border border-dashed border-zinc-300 bg-zinc-50 text-xs text-zinc-400">
              No logo
            </div>
          )}
          <label className="cursor-pointer rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm font-medium text-zinc-800 hover:bg-zinc-50">
            {uploading === "logo" ? "Uploading…" : logoUrl ? "Replace logo" : "Upload logo"}
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              className="sr-only"
              disabled={!!uploading}
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) void uploadKind("logo", f);
                e.target.value = "";
              }}
            />
          </label>
          {logoUrl ? (
            <button
              type="button"
              className="text-sm text-rose-600 hover:underline"
              onClick={() => setLogoUrl("")}
            >
              Remove
            </button>
          ) : null}
        </div>
      </div>

      <div>
        <label className="mb-2 block text-sm font-medium text-zinc-700">Header image</label>
        <p className="mb-2 text-xs text-zinc-500">Wide banner for the top of your yard page (helps Google and social previews).</p>
        <div className="space-y-2">
          {headerUrl ? (
            <div className="relative aspect-[3/1] w-full max-w-xl overflow-hidden rounded-xl border border-zinc-200 bg-zinc-100">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={headerUrl} alt="" className="h-full w-full object-cover" />
            </div>
          ) : (
            <div className="flex aspect-[3/1] w-full max-w-xl items-center justify-center rounded-xl border border-dashed border-zinc-300 bg-zinc-50 text-sm text-zinc-400">
              No header image
            </div>
          )}
          <div className="flex flex-wrap gap-2">
            <label className="cursor-pointer rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm font-medium text-zinc-800 hover:bg-zinc-50">
              {uploading === "header" ? "Uploading…" : headerUrl ? "Replace header" : "Upload header"}
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                className="sr-only"
                disabled={!!uploading}
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) void uploadKind("header", f);
                  e.target.value = "";
                }}
              />
            </label>
            {headerUrl ? (
              <button
                type="button"
                className="rounded-lg px-3 py-2 text-sm text-rose-600 hover:underline"
                onClick={() => setHeaderUrl("")}
              >
                Remove
              </button>
            ) : null}
          </div>
        </div>
      </div>

      {error ? <p className="text-sm text-rose-600">{error}</p> : null}
    </div>
  );
}

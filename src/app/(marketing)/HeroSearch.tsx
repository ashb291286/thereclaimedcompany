"use client";

import { useRouter } from "next/navigation";
import { useCallback, useId, useRef, useState } from "react";

export function HeroSearch() {
  const router = useRouter();
  const formId = useId();
  const searchId = `${formId}-q`;
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [query, setQuery] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submitText = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      setError(null);
      const q = query.trim();
      if (!q) {
        router.push("/search");
        return;
      }
      router.push(`/search?q=${encodeURIComponent(q)}`);
    },
    [query, router]
  );

  const onPickImage = useCallback(async () => {
    fileInputRef.current?.click();
  }, []);

  const onFile = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      e.target.value = "";
      if (!file || !file.type.startsWith("image/")) {
        setError("Please choose an image file (JPEG, PNG, or WebP).");
        return;
      }

      setBusy(true);
      setError(null);

      try {
        const body = new FormData();
        body.set("image", file);

        const res = await fetch("/api/search/image-match", {
          method: "POST",
          body,
        });
        const data = (await res.json()) as {
          listingIds?: string[];
          message?: string;
          error?: string;
        };

        if (!res.ok) {
          setError(data.error ?? "Image search failed. Try again.");
          return;
        }

        const ids = data.listingIds ?? [];
        if (ids.length === 0) {
          setError(data.message ?? "No close visual matches yet. Try keywords or browse all listings.");
          return;
        }

        const qs = new URLSearchParams();
        qs.set("ids", ids.join(","));
        qs.set("fromImage", "1");
        router.push(`/search?${qs.toString()}`);
      } catch {
        setError("Could not reach the server. Check your connection and try again.");
      } finally {
        setBusy(false);
      }
    },
    [router]
  );

  return (
    <div className="mt-8 w-full max-w-2xl">
      <form onSubmit={submitText} className="flex flex-col gap-3 sm:flex-row sm:items-stretch">
        <label htmlFor={searchId} className="sr-only">
          Search listings
        </label>
        <input
          id={searchId}
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search listings — e.g. Victorian tiles, oak beams, cast iron…"
          autoComplete="off"
          className="min-h-12 w-full flex-1 rounded-xl border border-white/25 bg-white/95 px-4 py-3 text-base text-zinc-900 shadow-lg shadow-black/15 placeholder:text-zinc-500 focus:border-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-400/40"
        />
        <button
          type="submit"
          className="inline-flex min-h-12 shrink-0 items-center justify-center rounded-xl bg-amber-600 px-6 text-sm font-semibold text-white shadow-lg shadow-black/20 hover:bg-amber-700 focus:outline-none focus:ring-2 focus:ring-amber-300 focus:ring-offset-2 focus:ring-offset-zinc-900"
        >
          Search
        </button>
      </form>

      <div className="mt-4 rounded-xl border border-white/20 bg-black/25 px-4 py-3 backdrop-blur-sm sm:flex sm:items-center sm:justify-between sm:gap-4">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-white">Match by photo</p>
          <p className="mt-0.5 text-xs leading-relaxed text-zinc-300">
            Upload a reference shot — we compare it to listing photos to surface similar tiles, metals, and finishes.
          </p>
        </div>
        <div className="mt-3 flex shrink-0 items-center gap-2 sm:mt-0">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
            onChange={onFile}
          />
          <button
            type="button"
            disabled={busy}
            onClick={onPickImage}
            className="inline-flex items-center justify-center rounded-lg border border-white/50 bg-white/10 px-4 py-2.5 text-sm font-semibold text-white hover:bg-white/15 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {busy ? "Matching…" : "Upload image"}
          </button>
        </div>
      </div>

      {error ? (
        <p className="mt-3 rounded-lg border border-amber-500/40 bg-amber-950/40 px-3 py-2 text-sm text-amber-50" role="status">
          {error}
        </p>
      ) : null}
    </div>
  );
}

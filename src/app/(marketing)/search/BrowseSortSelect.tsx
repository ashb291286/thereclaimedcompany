"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";

export function BrowseSortSelect({
  value,
  nearestAvailable,
}: {
  value: string;
  nearestAvailable: boolean;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function applySort(next: string) {
    const sp = new URLSearchParams(searchParams.toString());
    if (next) sp.set("sort", next);
    else sp.delete("sort");
    sp.delete("page");
    const qs = sp.toString();
    const base =
      pathname.startsWith("/categories/") && pathname.length > "/categories/".length + 1
        ? pathname
        : "/search";
    router.push(qs ? `${base}?${qs}` : base);
  }

  const nearestDisabled = !nearestAvailable;

  return (
    <label className="flex shrink-0 items-center gap-2 text-sm text-zinc-700">
      <span className="whitespace-nowrap text-zinc-500">Sort by</span>
      <select
        className="max-w-[11rem] rounded-lg border border-zinc-300 bg-white px-2 py-1.5 text-sm text-zinc-900 shadow-sm focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
        value={nearestDisabled && value === "nearest" ? "" : value}
        onChange={(e) => applySort(e.target.value)}
        aria-label="Sort listings"
        title={nearestDisabled ? "Add a search postcode or save a home postcode in your profile to sort by distance." : undefined}
      >
        <option value="">Recommended</option>
        <option value="nearest" disabled={nearestDisabled}>
          Nearest first
        </option>
        <option value="price_asc">Price: low to high</option>
        <option value="price_desc">Price: high to low</option>
        <option value="newest">New arrivals</option>
      </select>
    </label>
  );
}

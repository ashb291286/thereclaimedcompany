"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useRef, useState, type KeyboardEvent } from "react";
import type { Prisma } from "@/generated/prisma/client";
import { PostcodeLookupField } from "@/components/PostcodeLookupField";
import {
  browseRadiusLabel,
  browseRadiusQueryFromSlider,
  browseRadiusSliderFromParam,
} from "@/lib/browse-radius";

type Category = Prisma.CategoryGetPayload<object>;

/** Drop legacy URL params no longer exposed in the browse UI. */
const STRIP_LEGACY_FILTERS: Record<string, string> = {
  condition: "",
  conditionGrade: "",
  era: "",
  genre: "",
  setting: "",
  material: "",
};

function readRadiusQueryFromDom(fallbackSlider: number): string {
  const el = document.querySelector("[data-search-radius]") as HTMLInputElement | null;
  const n = Number(el?.value);
  return browseRadiusQueryFromSlider(Number.isFinite(n) ? n : fallbackSlider);
}

function SearchRadiusSlider({
  defaultRadius,
  isYards,
  updateQuery,
}: {
  defaultRadius: string;
  isYards: boolean;
  updateQuery: (updates: Record<string, string>) => void;
}) {
  const valRef = useRef(browseRadiusSliderFromParam(defaultRadius));
  const [val, setVal] = useState(() => browseRadiusSliderFromParam(defaultRadius));

  useEffect(() => {
    const next = browseRadiusSliderFromParam(defaultRadius);
    valRef.current = next;
    setVal(next);
  }, [defaultRadius]);

  const commit = useCallback(() => {
    const postcode = (document.querySelector("[data-search-postcode]") as HTMLInputElement)?.value?.trim();
    if (!postcode) return;
    const r = browseRadiusQueryFromSlider(valRef.current);
    const patch: Record<string, string> = {
      radius: r,
      postcode,
      ...STRIP_LEGACY_FILTERS,
    };
    if (isYards) patch.sellerType = "reclamation_yard";
    updateQuery(patch);
  }, [isYards, updateQuery]);

  return (
    <div className="min-w-[200px] flex-1 sm:max-w-[240px]">
      <label className="mb-1 block text-xs font-semibold text-zinc-800">Radius</label>
      <input
        type="range"
        min={10}
        max={201}
        step={1}
        value={val}
        aria-valuetext={browseRadiusLabel(val)}
        data-search-radius
        onInput={(e) => {
          const v = Number((e.target as HTMLInputElement).value);
          valRef.current = v;
          setVal(v);
        }}
        onPointerUp={commit}
        className="mt-1 h-2 w-full cursor-pointer appearance-none rounded-full bg-zinc-200 accent-brand"
      />
      <p className="mt-1 text-center text-xs font-semibold text-zinc-800">{browseRadiusLabel(val)}</p>
      <p className="text-center text-[10px] leading-tight text-zinc-500">10–200 mi, or Nationwide</p>
    </div>
  );
}

export function SearchForm({
  id,
  categories,
  defaultQ,
  defaultCategorySlug,
  defaultPostcode,
  defaultRadius,
  defaultSellerType,
  defaultHireOnly,
  defaultAvailableNow,
  defaultListingType,
  yardsBrowseMode,
}: {
  id?: string;
  categories: Category[];
  defaultQ?: string;
  defaultCategoryId?: string;
  defaultPostcode?: string;
  defaultRadius?: string;
  defaultSellerType?: string;
  defaultHireOnly?: boolean;
  defaultAvailableNow?: boolean;
  defaultListingType?: string;
  /** Reclamation-yard browse: postcode-first UI; lock seller type. */
  yardsBrowseMode?: boolean;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const isYards = Boolean(yardsBrowseMode);

  const updateQuery = useCallback(
    (updates: Record<string, string>) => {
      const next = new URLSearchParams(searchParams.toString());
      Object.entries(updates).forEach(([k, v]) => {
        if (v) next.set(k, v);
        else next.delete(k);
      });
      if ("q" in updates) {
        next.delete("ids");
        next.delete("fromImage");
      }
      if ("postcode" in updates && !updates.postcode) {
        next.delete("radius");
      }
      next.delete("page");
      router.push(`/search?${next.toString()}`);
    },
    [router, searchParams]
  );

  const postcodeEnter = useCallback(
    (e: KeyboardEvent<HTMLInputElement>) => {
      if (e.key !== "Enter") return;
      e.preventDefault();
      const v = (e.target as HTMLInputElement).value.trim();
      const fallbackSlider = browseRadiusSliderFromParam(defaultRadius);
      const radiusQ = v ? readRadiusQueryFromDom(fallbackSlider) : "";
      const patch: Record<string, string> = {
        postcode: v,
        ...(v ? { radius: radiusQ } : { radius: "" }),
        ...STRIP_LEGACY_FILTERS,
      };
      if (isYards) {
        patch.sellerType = "reclamation_yard";
      }
      updateQuery(patch);
    },
    [defaultRadius, isYards, updateQuery]
  );

  const defaultRadiusStr = defaultRadius ?? "";

  const locationHighlightClass =
    "mb-4 rounded-xl border-2 border-brand bg-brand-soft/60 p-4";

  return (
    <div
      id={id}
      className={`rounded-xl border p-4 ${
        isYards ? "border-brand/35 bg-white shadow-sm ring-1 ring-brand/15" : "border-zinc-200 bg-white"
      }`}
    >
      {isYards ? (
        <div className={locationHighlightClass}>
          <p className="text-sm font-semibold text-zinc-900">Reclamation yards near you</p>
          <p className="mt-1 text-xs leading-relaxed text-zinc-700">
            Start with your postcode to sort yard stock by distance — the fastest way to find local
            reclamation yards.
          </p>
          <div className="mt-3 flex flex-wrap items-end gap-3">
            <div className="min-w-[160px] flex-1">
              <label className="mb-1 block text-xs font-semibold text-zinc-800">Your postcode</label>
              <PostcodeLookupField
                optional
                defaultValue={defaultPostcode ?? ""}
                placeholder="e.g. YO1 6GA"
                dataSearchPostcode
                showDefaultAssistiveText={false}
                onKeyDown={postcodeEnter}
                className="w-full rounded-lg border-2 border-brand/40 bg-white px-3 py-2.5 text-sm font-medium text-zinc-900 placeholder:text-zinc-400 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/25"
              />
            </div>
            <SearchRadiusSlider defaultRadius={defaultRadiusStr} isYards={isYards} updateQuery={updateQuery} />
          </div>
        </div>
      ) : (
        <div className={locationHighlightClass}>
          <p className="text-sm font-semibold text-zinc-900">Location</p>
          <p className="mt-1 text-xs leading-relaxed text-zinc-700">
            Add a full UK postcode to sort results by distance. Leave blank to browse listings from across
            the UK.
          </p>
          <div className="mt-3 flex flex-wrap items-end gap-3">
            <div className="min-w-[160px] flex-1">
              <label className="mb-1 block text-xs font-semibold text-zinc-800">Postcode</label>
              <PostcodeLookupField
                optional
                defaultValue={defaultPostcode ?? ""}
                placeholder="e.g. SW1A 1AA"
                dataSearchPostcode
                showDefaultAssistiveText={false}
                onKeyDown={postcodeEnter}
                className="w-full rounded-lg border-2 border-brand/40 bg-white px-3 py-2.5 text-sm font-medium text-zinc-900 placeholder:text-zinc-400 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/25"
              />
            </div>
            <SearchRadiusSlider defaultRadius={defaultRadiusStr} isYards={isYards} updateQuery={updateQuery} />
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 gap-4">
        <div>
          <label className="mb-1 block text-xs font-medium text-zinc-500">Search</label>
          <input
            type="search"
            defaultValue={defaultQ}
            placeholder="Keywords..."
            className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                updateQuery({ q: (e.target as HTMLInputElement).value, ...STRIP_LEGACY_FILTERS });
              }
            }}
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-zinc-500">Category</label>
          <select
            key={defaultCategorySlug ?? ""}
            defaultValue={defaultCategorySlug ?? ""}
            onChange={(e) =>
              updateQuery({
                category: e.target.value,
                categoryId: "",
                ...STRIP_LEGACY_FILTERS,
              })
            }
            className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
          >
            <option value="">All</option>
            {categories.map((c) => (
              <option key={c.id} value={c.slug}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-zinc-500">Listing type</label>
          <select
            data-search-listing-type
            defaultValue={defaultListingType ?? ""}
            onChange={(e) =>
              updateQuery({ listingType: e.target.value, ...STRIP_LEGACY_FILTERS })
            }
            className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
          >
            <option value="">All</option>
            <option value="auction">Auction</option>
            <option value="buy_now">Buy now</option>
            <option value="free_collect">Free to collect</option>
          </select>
        </div>
        {!isYards ? (
          <div>
            <label className="mb-1 block text-xs font-medium text-zinc-500">Seller type</label>
            <select
              defaultValue={defaultSellerType ?? ""}
              onChange={(e) =>
                updateQuery({ sellerType: e.target.value, ...STRIP_LEGACY_FILTERS })
              }
              className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
            >
              <option value="">All</option>
              <option value="individual">Individual</option>
              <option value="reclamation_yard">Reclamation yard</option>
            </select>
          </div>
        ) : null}
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-4">
        <label className="inline-flex items-center gap-2 text-sm text-zinc-700">
          <input type="checkbox" data-search-hire-only defaultChecked={defaultHireOnly} />
          Hire only
        </label>
        <label className="inline-flex items-center gap-2 text-sm text-zinc-700">
          <input type="checkbox" data-search-available-now defaultChecked={defaultAvailableNow} />
          Available now
        </label>
        <button
          type="button"
          onClick={() => {
            const q = (document.querySelector('input[type="search"]') as HTMLInputElement)?.value;
            const postcode = (
              document.querySelector("[data-search-postcode]") as HTMLInputElement
            )?.value?.trim();
            const fallbackSlider = browseRadiusSliderFromParam(defaultRadiusStr);
            const radiusQ = postcode ? readRadiusQueryFromDom(fallbackSlider) : "";
            const hireOnly = (document.querySelector("[data-search-hire-only]") as HTMLInputElement)?.checked;
            const availableNow = (document.querySelector("[data-search-available-now]") as HTMLInputElement)
              ?.checked;
            const listingType =
              (document.querySelector("[data-search-listing-type]") as HTMLSelectElement)?.value ?? "";
            const updates: Record<string, string> = {
              q: q ?? "",
              postcode: postcode ?? "",
              ...STRIP_LEGACY_FILTERS,
              hireOnly: hireOnly ? "1" : "",
              availableNow: availableNow ? "1" : "",
              listingType,
              ...(postcode ? { radius: radiusQ } : { radius: "" }),
            };
            if (isYards) {
              updates.sellerType = "reclamation_yard";
            }
            updateQuery(updates);
          }}
          className="rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand-hover"
        >
          Apply
        </button>
      </div>
      <p className="mt-2 text-xs text-zinc-500">
        Start typing a postcode for suggestions. A full UK postcode finds town or city and sorts by road distance;
        use the radius slider (10–200 miles or Nationwide). Partial codes fall back to prefix matching.
      </p>
    </div>
  );
}

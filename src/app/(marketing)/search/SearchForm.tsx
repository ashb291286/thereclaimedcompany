"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, type KeyboardEvent } from "react";
import type { Prisma } from "@/generated/prisma/client";
import { CONDITION_LABELS } from "@/lib/constants";
import type { Condition } from "@/generated/prisma/client";

type Category = Prisma.CategoryGetPayload<object>;

export function SearchForm({
  id,
  categories,
  defaultQ,
  defaultCategoryId,
  defaultCondition,
  defaultPostcode,
  defaultRadius,
  defaultSellerType,
  defaultConditionGrade,
  defaultEra,
  defaultGenre,
  defaultSetting,
  defaultMaterial,
  defaultHireOnly,
  defaultAvailableNow,
  yardsBrowseMode,
}: {
  id?: string;
  categories: Category[];
  defaultQ?: string;
  defaultCategoryId?: string;
  defaultCondition?: string;
  defaultPostcode?: string;
  defaultRadius?: string;
  defaultSellerType?: string;
  defaultConditionGrade?: string;
  defaultEra?: string;
  defaultGenre?: string;
  defaultSetting?: string;
  defaultMaterial?: string;
  defaultHireOnly?: boolean;
  defaultAvailableNow?: boolean;
  /** Reclamation-yard browse: postcode-first UI; hide era/genre/material; lock seller type. */
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
      const radius =
        (document.querySelector("[data-search-radius]") as HTMLSelectElement)?.value ??
        defaultRadius ??
        "50";
      const patch: Record<string, string> = {
        postcode: v,
        ...(v ? { radius } : { radius: "" }),
      };
      if (isYards) {
        patch.sellerType = "reclamation_yard";
        patch.era = "";
        patch.genre = "";
        patch.material = "";
      }
      updateQuery(patch);
    },
    [defaultRadius, isYards, updateQuery]
  );

  return (
    <div
      id={id}
      className={`rounded-xl border p-4 ${
        isYards ? "border-brand/35 bg-white shadow-sm ring-1 ring-brand/15" : "border-zinc-200 bg-white"
      }`}
    >
      {isYards ? (
        <div className="mb-4 rounded-xl border-2 border-brand bg-brand-soft/60 p-4">
          <p className="text-sm font-semibold text-zinc-900">Reclamation yards near you</p>
          <p className="mt-1 text-xs leading-relaxed text-zinc-700">
            Start with your postcode to sort yard stock by distance — the fastest way to find local
            reclamation yards.
          </p>
          <div className="mt-3 flex flex-wrap items-end gap-3">
            <div className="min-w-[160px] flex-1">
              <label className="mb-1 block text-xs font-semibold text-zinc-800">Your postcode</label>
              <input
                type="text"
                defaultValue={defaultPostcode}
                data-search-postcode
                placeholder="e.g. YO1 6GA"
                className="w-full rounded-lg border-2 border-brand/40 bg-white px-3 py-2.5 text-sm font-medium text-zinc-900 placeholder:text-zinc-400 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/25"
                onKeyDown={postcodeEnter}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-zinc-800">Radius</label>
              <select
                defaultValue={defaultRadius ?? "50"}
                data-search-radius
                className="rounded-lg border-2 border-brand/40 bg-white px-3 py-2.5 text-sm font-medium text-zinc-900"
                onChange={(e) => {
                  const postcode = (
                    document.querySelector("[data-search-postcode]") as HTMLInputElement
                  )?.value?.trim();
                  if (!postcode) return;
                  const patch: Record<string, string> = { radius: e.target.value, postcode };
                  if (isYards) {
                    patch.sellerType = "reclamation_yard";
                    patch.era = "";
                    patch.genre = "";
                    patch.material = "";
                  }
                  updateQuery(patch);
                }}
              >
                <option value="10">10 mi</option>
                <option value="25">25 mi</option>
                <option value="50">50 mi</option>
                <option value="100">100 mi</option>
              </select>
            </div>
          </div>
        </div>
      ) : null}

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
                updateQuery({ q: (e.target as HTMLInputElement).value });
              }
            }}
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-zinc-500">Category</label>
          <select
            defaultValue={defaultCategoryId ?? ""}
            onChange={(e) => updateQuery({ categoryId: e.target.value })}
            className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
          >
            <option value="">All</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-zinc-500">Condition</label>
          <select
            defaultValue={defaultCondition ?? ""}
            onChange={(e) => updateQuery({ condition: e.target.value })}
            className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
          >
            <option value="">All</option>
            {(Object.entries(CONDITION_LABELS) as [Condition, string][]).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </div>
        {!isYards ? (
          <div>
            <label className="mb-1 block text-xs font-medium text-zinc-500">Seller type</label>
            <select
              defaultValue={defaultSellerType ?? ""}
              onChange={(e) => updateQuery({ sellerType: e.target.value })}
              className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
            >
              <option value="">All</option>
              <option value="individual">Individual</option>
              <option value="reclamation_yard">Reclamation yard</option>
            </select>
          </div>
        ) : null}
      </div>
      <div className="mt-4 flex flex-wrap items-end gap-2">
        <div>
          <label className="mb-1 block text-xs font-medium text-zinc-500">Condition grade</label>
          <select
            defaultValue={defaultConditionGrade ?? ""}
            className="rounded-lg border border-zinc-300 px-3 py-2 text-sm"
            onChange={(e) => updateQuery({ conditionGrade: e.target.value })}
          >
            <option value="">Any</option>
            <option value="A">A</option>
            <option value="B">B</option>
            <option value="C">C</option>
          </select>
        </div>
        {!isYards ? (
          <>
            <div>
              <label className="mb-1 block text-xs font-medium text-zinc-500">Era tags (comma)</label>
              <input
                defaultValue={defaultEra}
                data-search-era
                className="w-40 rounded-lg border border-zinc-300 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-zinc-500">Genre tags (comma)</label>
              <input
                defaultValue={defaultGenre}
                data-search-genre
                className="w-40 rounded-lg border border-zinc-300 px-3 py-2 text-sm"
              />
            </div>
          </>
        ) : null}
        <div>
          <label className="mb-1 block text-xs font-medium text-zinc-500">Setting tags (comma)</label>
          <input
            defaultValue={defaultSetting}
            data-search-setting
            className="w-40 rounded-lg border border-zinc-300 px-3 py-2 text-sm"
          />
        </div>
        {!isYards ? (
          <div>
            <label className="mb-1 block text-xs font-medium text-zinc-500">Material tags (comma)</label>
            <input
              defaultValue={defaultMaterial}
              data-search-material
              className="w-40 rounded-lg border border-zinc-300 px-3 py-2 text-sm"
            />
          </div>
        ) : null}
        <label className="inline-flex items-center gap-2 text-sm text-zinc-700">
          <input type="checkbox" data-search-hire-only defaultChecked={defaultHireOnly} />
          Hire only
        </label>
        <label className="inline-flex items-center gap-2 text-sm text-zinc-700">
          <input type="checkbox" data-search-available-now defaultChecked={defaultAvailableNow} />
          Available now
        </label>
        {!isYards ? (
          <>
            <div>
              <label className="mb-1 block text-xs font-medium text-zinc-500">Near postcode</label>
              <input
                type="text"
                defaultValue={defaultPostcode}
                data-search-postcode
                placeholder="e.g. SW1A 1AA"
                className="w-36 rounded-lg border border-zinc-300 px-3 py-2 text-sm"
                onKeyDown={postcodeEnter}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-zinc-500">Radius</label>
              <select
                defaultValue={defaultRadius ?? "50"}
                data-search-radius
                className="rounded-lg border border-zinc-300 px-3 py-2 text-sm"
                onChange={(e) => {
                  const postcode = (
                    document.querySelector("[data-search-postcode]") as HTMLInputElement
                  )?.value?.trim();
                  if (postcode) updateQuery({ radius: e.target.value, postcode });
                }}
              >
                <option value="10">10 mi</option>
                <option value="25">25 mi</option>
                <option value="50">50 mi</option>
                <option value="100">100 mi</option>
              </select>
            </div>
          </>
        ) : null}
        <button
          type="button"
          onClick={() => {
            const q = (document.querySelector('input[type="search"]') as HTMLInputElement)?.value;
            const postcode = (
              document.querySelector("[data-search-postcode]") as HTMLInputElement
            )?.value?.trim();
            const radius = (document.querySelector("[data-search-radius]") as HTMLSelectElement)
              ?.value;
            const era = (document.querySelector("[data-search-era]") as HTMLInputElement)?.value?.trim();
            const genre = (document.querySelector("[data-search-genre]") as HTMLInputElement)?.value?.trim();
            const setting = (document.querySelector("[data-search-setting]") as HTMLInputElement)?.value?.trim();
            const material = (document.querySelector("[data-search-material]") as HTMLInputElement)?.value?.trim();
            const hireOnly = (document.querySelector("[data-search-hire-only]") as HTMLInputElement)?.checked;
            const availableNow = (document.querySelector("[data-search-available-now]") as HTMLInputElement)?.checked;
            const updates: Record<string, string> = {
              q: q ?? "",
              postcode: postcode ?? "",
              era: isYards ? "" : era ?? "",
              genre: isYards ? "" : genre ?? "",
              setting: setting ?? "",
              material: isYards ? "" : material ?? "",
              hireOnly: hireOnly ? "1" : "",
              availableNow: availableNow ? "1" : "",
              ...(postcode ? { radius: radius ?? "50" } : { radius: "" }),
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
        Full UK postcode finds town or city and sorts by road distance. Partial codes fall back to prefix matching.
      </p>
    </div>
  );
}

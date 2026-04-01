"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback } from "react";
import type { Prisma } from "@/generated/prisma/client";
import { CONDITION_LABELS } from "@/lib/constants";
import type { Condition } from "@/generated/prisma/client";

type Category = Prisma.CategoryGetPayload<object>;

export function SearchForm({
  categories,
  defaultQ,
  defaultCategoryId,
  defaultCondition,
  defaultPostcode,
  defaultRadius,
  defaultSellerType,
}: {
  categories: Category[];
  defaultQ?: string;
  defaultCategoryId?: string;
  defaultCondition?: string;
  defaultPostcode?: string;
  defaultRadius?: string;
  defaultSellerType?: string;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();

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

  return (
    <div className="mt-6 rounded-xl border border-zinc-200 bg-white p-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="lg:col-span-2">
          <label className="block text-xs font-medium text-zinc-500 mb-1">Search</label>
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
          <label className="block text-xs font-medium text-zinc-500 mb-1">Category</label>
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
          <label className="block text-xs font-medium text-zinc-500 mb-1">Condition</label>
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
        <div>
          <label className="block text-xs font-medium text-zinc-500 mb-1">Seller type</label>
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
      </div>
      <div className="mt-4 flex flex-wrap items-end gap-2">
        <div>
          <label className="mb-1 block text-xs font-medium text-zinc-500">Near postcode</label>
          <input
            type="text"
            defaultValue={defaultPostcode}
            data-search-postcode
            placeholder="e.g. SW1A 1AA"
            className="rounded-lg border border-zinc-300 px-3 py-2 text-sm w-36"
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                const v = (e.target as HTMLInputElement).value.trim();
                const radius =
                  (document.querySelector("[data-search-radius]") as HTMLSelectElement)?.value ??
                  defaultRadius ??
                  "50";
                updateQuery({
                  postcode: v,
                  ...(v ? { radius } : { radius: "" }),
                });
              }
            }}
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
        <button
          type="button"
          onClick={() => {
            const q = (document.querySelector('input[type="search"]') as HTMLInputElement)?.value;
            const postcode = (
              document.querySelector("[data-search-postcode]") as HTMLInputElement
            )?.value?.trim();
            const radius = (document.querySelector("[data-search-radius]") as HTMLSelectElement)
              ?.value;
            updateQuery({
              q: q ?? "",
              postcode: postcode ?? "",
              ...(postcode ? { radius: radius ?? "50" } : { radius: "" }),
            });
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

"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { CONDITION_LABELS } from "@/lib/constants";
import type { Condition } from "@/generated/prisma/client";
import type { PropYardOfferDto, PropYardSearchFilters } from "@/lib/prop-yard-search";
import {
  PROP_CATEGORIES,
  PROP_ERAS,
  PROP_EXTERIOR_SETTINGS,
  PROP_GENRES,
  PROP_INTERIOR_SETTINGS,
  PROP_ORIGINS,
  PROP_STYLES,
} from "@/lib/prop-yard-taxonomy";

type UiFilters = {
  q: string;
  eras: string[];
  genres: string[];
  styles: string[];
  settingInterior: string[];
  settingExterior: string[];
  legacySettingOrTags: string[];
  categories: string[];
  geographicOrigin: string;
  condition: string;
  availableNow: boolean;
};

function filtersToState(f: PropYardSearchFilters): UiFilters {
  return {
    q: f.q,
    eras: f.eraTags,
    genres: f.genreTags,
    styles: f.styleTags,
    settingInterior: f.settingInteriorTags,
    settingExterior: f.settingExteriorTags,
    legacySettingOrTags: f.legacySettingOrTags,
    categories: f.categoryNames,
    geographicOrigin: f.geographicOrigin ?? "",
    condition: f.condition ?? "",
    availableNow: f.availableNow,
  };
}

function stateToSearchParams(f: UiFilters): URLSearchParams {
  const sp = new URLSearchParams();
  if (f.q.trim()) sp.set("q", f.q.trim());
  f.eras.forEach((x) => sp.append("era", x));
  f.genres.forEach((x) => sp.append("genre", x));
  f.styles.forEach((x) => sp.append("style", x));
  f.settingInterior.forEach((x) => sp.append("settingInterior", x));
  f.settingExterior.forEach((x) => sp.append("settingExterior", x));
  f.legacySettingOrTags.forEach((x) => sp.append("setting", x));
  f.categories.forEach((x) => sp.append("category", x));
  if (f.geographicOrigin.trim()) sp.set("geographicOrigin", f.geographicOrigin.trim());
  if (f.condition.trim()) sp.set("condition", f.condition.trim());
  if (f.availableNow) sp.set("availableNow", "1");
  return sp;
}

function toggleList(list: string[], v: string): string[] {
  return list.includes(v) ? list.filter((x) => x !== v) : [...list, v];
}

function ChipGroup({
  label,
  hint,
  options,
  selected,
  onToggle,
}: {
  label: string;
  hint?: string;
  options: readonly string[];
  selected: string[];
  onToggle: (v: string) => void;
}) {
  return (
    <div className="mb-4">
      <p className="mb-0.5 text-[11px] font-semibold uppercase tracking-wide text-driven-muted">{label}</p>
      {hint ? <p className="mb-2 text-[11px] text-driven-muted/90">{hint}</p> : null}
      <div className="max-h-36 overflow-y-auto rounded border border-driven-warm/60 bg-white px-2 py-2 shadow-sm">
        <div className="flex flex-wrap gap-1.5">
          {options.map((opt) => (
            <button
              key={opt}
              type="button"
              onClick={() => onToggle(opt)}
              className={`rounded-full border px-2.5 py-0.5 text-left text-[11px] leading-snug transition-colors ${
                selected.includes(opt)
                  ? "border-driven-ink bg-driven-ink text-driven-paper"
                  : "border-driven-warm bg-driven-paper text-driven-ink hover:border-driven-ink/40"
              }`}
            >
              {opt}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

export function PropYardSearchClient({
  initialFilters,
  initialOffers,
  setId,
  error,
}: {
  initialFilters: PropYardSearchFilters;
  initialOffers: PropYardOfferDto[];
  setId: string;
  error: string;
}) {
  const [filters, setFilters] = useState<UiFilters>(() => filtersToState(initialFilters));
  const [offers, setOffers] = useState<PropYardOfferDto[]>(initialOffers);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const userEdited = useRef(false);
  const offerQuery = setId ? `?setId=${encodeURIComponent(setId)}` : "";

  const markEdited = useCallback(() => {
    userEdited.current = true;
  }, []);

  const filterDeps = useMemo(() => JSON.stringify(filters), [filters]);

  useEffect(() => {
    if (!userEdited.current) return;
    const t = window.setTimeout(async () => {
      setLoading(true);
      setLoadError(null);
      const sp = stateToSearchParams(filters);
      if (setId) sp.set("setId", setId);
      try {
        const res = await fetch(`/api/prop-yard/search?${sp.toString()}`, { method: "GET" });
        const data = (await res.json()) as { offers?: PropYardOfferDto[]; error?: string };
        if (!res.ok) throw new Error(data.error ?? "Search failed");
        setOffers(data.offers ?? []);
        const pathQs = sp.toString();
        window.history.replaceState(null, "", pathQs ? `/prop-yard/search?${pathQs}` : "/prop-yard/search");
      } catch {
        setLoadError("Could not update results. Try again.");
      } finally {
        setLoading(false);
      }
    }, 320);
    return () => window.clearTimeout(t);
  }, [filterDeps, filters, setId]);

  const conditionOptions = Object.keys(CONDITION_LABELS) as Condition[];

  return (
    <div className="relative left-1/2 w-screen max-w-[100vw] -translate-x-1/2 px-[30px] pb-10">
      <h2 className="font-[family-name:var(--font-driven-display)] text-2xl font-semibold text-driven-ink">
        Find props
      </h2>
      <p className="mt-2 max-w-2xl text-sm text-driven-muted">
        Listed by UK reclamation yards for weekly hire. Filters match the Prop Yard listing wizard — results update as you
        change them.
      </p>
      <div className="mt-3 flex flex-wrap items-center gap-3">
        <Link
          href="/prop-yard/sets"
          className="text-sm font-medium text-driven-accent underline hover:text-driven-ink"
        >
          My sets &amp; set builder
        </Link>
        {setId ? (
          <p className="text-xs text-driven-muted">
            Browsing with an active set — offer links will add to that set when you open them.
          </p>
        ) : null}
      </div>

      {error ? (
        <p className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{decodeURIComponent(error)}</p>
      ) : null}
      {loadError ? (
        <p className="mt-4 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-900">{loadError}</p>
      ) : null}

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-[280px_minmax(0,1fr)] lg:items-start">
        <aside className="lg:sticky lg:top-24 lg:max-h-[calc(100vh-6rem)] lg:overflow-y-auto lg:pr-1">
          <div className="rounded-xl border border-driven-warm bg-white p-4 shadow-sm">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-driven-muted">Keywords</p>
            <input
              type="search"
              value={filters.q}
              onChange={(e) => {
                markEdited();
                setFilters((f) => ({ ...f, q: e.target.value }));
              }}
              placeholder="Search title or description…"
              className="mt-2 w-full rounded-lg border border-driven-warm bg-driven-paper px-3 py-2 text-sm text-driven-ink outline-none focus:border-driven-ink"
            />

            <div className="mt-4 space-y-1 border-t border-driven-warm/40 pt-4">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-driven-muted">Listing condition</p>
              <select
                value={filters.condition}
                onChange={(e) => {
                  markEdited();
                  setFilters((f) => ({ ...f, condition: e.target.value }));
                }}
                className="mt-1 w-full rounded-lg border border-driven-warm bg-white px-3 py-2 text-sm text-driven-ink"
              >
                <option value="">Any condition</option>
                {conditionOptions.map((c) => (
                  <option key={c} value={c}>
                    {CONDITION_LABELS[c]}
                  </option>
                ))}
              </select>
            </div>

            <div className="mt-4 space-y-1 border-t border-driven-warm/40 pt-4">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-driven-muted">Geographic origin</p>
              <select
                value={filters.geographicOrigin}
                onChange={(e) => {
                  markEdited();
                  setFilters((f) => ({ ...f, geographicOrigin: e.target.value }));
                }}
                className="mt-1 w-full rounded-lg border border-driven-warm bg-white px-3 py-2 text-sm text-driven-ink"
              >
                <option value="">Any origin</option>
                {PROP_ORIGINS.map((o) => (
                  <option key={o} value={o}>
                    {o}
                  </option>
                ))}
              </select>
            </div>

            <label className="mt-4 flex cursor-pointer items-center gap-2 border-t border-driven-warm/40 pt-4 text-sm text-driven-ink">
              <input
                type="checkbox"
                checked={filters.availableNow}
                onChange={(e) => {
                  markEdited();
                  setFilters((f) => ({ ...f, availableNow: e.target.checked }));
                }}
              />
              Available now (published prop listings)
            </label>

            <ChipGroup
              label="Category"
              hint="Same categories as when you create a Prop Yard listing."
              options={[...PROP_CATEGORIES]}
              selected={filters.categories}
              onToggle={(v) => {
                markEdited();
                setFilters((f) => ({ ...f, categories: toggleList(f.categories, v) }));
              }}
            />

            <ChipGroup
              label="Period / era"
              options={[...PROP_ERAS]}
              selected={filters.eras}
              onToggle={(v) => {
                markEdited();
                setFilters((f) => ({ ...f, eras: toggleList(f.eras, v) }));
              }}
            />

            <ChipGroup
              label="Style"
              options={[...PROP_STYLES]}
              selected={filters.styles}
              onToggle={(v) => {
                markEdited();
                setFilters((f) => ({ ...f, styles: toggleList(f.styles, v) }));
              }}
            />

            <ChipGroup
              label="Genre"
              hint="Typical film, TV, or theatre genres for this prop."
              options={[...PROP_GENRES]}
              selected={filters.genres}
              onToggle={(v) => {
                markEdited();
                setFilters((f) => ({ ...f, genres: toggleList(f.genres, v) }));
              }}
            />

            <ChipGroup
              label="Interior setting"
              options={[...PROP_INTERIOR_SETTINGS]}
              selected={filters.settingInterior}
              onToggle={(v) => {
                markEdited();
                setFilters((f) => ({ ...f, settingInterior: toggleList(f.settingInterior, v) }));
              }}
            />

            <ChipGroup
              label="Exterior / location"
              options={[...PROP_EXTERIOR_SETTINGS]}
              selected={filters.settingExterior}
              onToggle={(v) => {
                markEdited();
                setFilters((f) => ({ ...f, settingExterior: toggleList(f.settingExterior, v) }));
              }}
            />

            <button
              type="button"
              className="mt-2 w-full rounded-lg border border-driven-warm py-2 text-xs font-medium text-driven-ink hover:bg-driven-warm/20"
              onClick={() => {
                userEdited.current = true;
                setFilters({
                  q: "",
                  eras: [],
                  genres: [],
                  styles: [],
                  settingInterior: [],
                  settingExterior: [],
                  legacySettingOrTags: [],
                  categories: [],
                  geographicOrigin: "",
                  condition: "",
                  availableNow: false,
                });
              }}
            >
              Clear all filters
            </button>
          </div>
        </aside>

        <section>
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-sm text-driven-muted">
              {loading ? "Updating…" : `${offers.length} prop${offers.length === 1 ? "" : "s"} found`}
            </p>
          </div>

          {offers.length === 0 && !loading ? (
            <p className="mt-10 text-center text-sm text-driven-muted">
              No props match these filters yet. Try clearing a tag or broadening era / genre.
            </p>
          ) : (
            <ul className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
              {offers.map((o) => {
                const img = o.listing.images[0];
                const yard = o.listing.seller.sellerProfile;
                return (
                  <li
                    key={o.id}
                    className="overflow-hidden rounded-xl border border-driven-warm bg-white shadow-sm transition hover:border-driven-ink/30"
                  >
                    <Link href={`/prop-yard/offers/${o.id}${offerQuery}`} className="block">
                      <div className="relative aspect-[4/3] bg-driven-warm">
                        {img ? (
                          <Image src={img} alt="" fill className="object-cover" unoptimized />
                        ) : (
                          <div className="flex h-full items-center justify-center text-driven-muted">No image</div>
                        )}
                      </div>
                      <div className="p-4">
                        <p className="font-[family-name:var(--font-driven-mono)] text-[10px] font-medium uppercase tracking-wide text-driven-muted">
                          {o.listing.category.name}
                        </p>
                        <h3 className="mt-1 line-clamp-2 font-semibold text-driven-ink">{o.listing.title}</h3>
                        <p className="mt-2 text-sm font-medium text-driven-ink">
                          £{(o.weeklyHirePence / 100).toFixed(2)} / week
                        </p>
                        <p className="mt-1 text-xs text-driven-muted">
                          Min hire {o.minimumHireWeeks} week{o.minimumHireWeeks === 1 ? "" : "s"}
                        </p>
                        {yard ? <p className="mt-1 text-xs text-driven-muted">{yard.displayName}</p> : null}
                      </div>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}

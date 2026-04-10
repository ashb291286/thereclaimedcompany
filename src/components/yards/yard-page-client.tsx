"use client";

import { useFormStatus } from "react-dom";
import Link from "next/link";
import Image from "next/image";
import { useActionState, useMemo, useState } from "react";
import { CONDITION_LABELS } from "@/lib/constants";
import { submitYardEnquiryAction } from "@/lib/actions/yard-enquiry";
import { toggleYardStockAlertAction } from "@/lib/actions/yard-stock-alert";

export type YardListingCard = {
  id: string;
  title: string;
  price: number;
  condition: string;
  categoryId: string;
  categoryName: string;
  image: string | null;
  createdAt: string;
  updatedAt: string;
};

function SubmitButton({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand-hover disabled:opacity-60"
    >
      {pending ? "…" : label}
    </button>
  );
}

export function YardStockIsland({
  listings,
  yardPostcode,
}: {
  listings: YardListingCard[];
  yardPostcode: string;
}) {
  const [cat, setCat] = useState<string>("");
  const [sort, setSort] = useState<"newest" | "price_asc" | "price_desc">("newest");

  const categories = useMemo(() => {
    const m = new Map<string, string>();
    for (const l of listings) m.set(l.categoryId, l.categoryName);
    return Array.from(m.entries()).sort((a, b) => a[1].localeCompare(b[1]));
  }, [listings]);

  const filtered = useMemo(() => {
    let rows = cat ? listings.filter((l) => l.categoryId === cat) : [...listings];
    rows.sort((a, b) => {
      if (sort === "price_asc") return a.price - b.price;
      if (sort === "price_desc") return b.price - a.price;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
    return rows;
  }, [listings, cat, sort]);

  const now = Date.now();
  const isNew = (createdAt: string) => now - new Date(createdAt).getTime() < 48 * 3600 * 1000;

  return (
    <section id="stock" className="scroll-mt-24">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-zinc-900">Live stock</h2>
          <p className="text-sm text-zinc-500">{filtered.length} listing{filtered.length === 1 ? "" : "s"} shown</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <select
            value={cat}
            onChange={(e) => setCat(e.target.value)}
            className="rounded-lg border border-zinc-300 bg-white px-2 py-1.5 text-sm text-zinc-900"
            aria-label="Filter by category"
          >
            <option value="">All categories</option>
            {categories.map(([id, name]) => (
              <option key={id} value={id}>
                {name}
              </option>
            ))}
          </select>
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as typeof sort)}
            className="rounded-lg border border-zinc-300 bg-white px-2 py-1.5 text-sm text-zinc-900"
            aria-label="Sort listings"
          >
            <option value="newest">Newest</option>
            <option value="price_asc">Price: low to high</option>
            <option value="price_desc">Price: high to low</option>
          </select>
        </div>
      </div>
      {filtered.length === 0 ? (
        <p className="mt-4 text-sm text-zinc-500">No listings match this filter.</p>
      ) : (
        <ul className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
          {filtered.map((l) => (
            <li key={l.id}>
              <Link
                href={`/listings/${l.id}`}
                className="group block overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm transition hover:border-brand/40 hover:shadow-md"
              >
                <div className="relative aspect-[4/3] bg-zinc-100">
                  {l.image ? (
                    <Image
                      src={l.image}
                      alt={l.title}
                      fill
                      className="object-cover transition group-hover:scale-[1.02]"
                      sizes="(max-width: 640px) 100vw, 50vw"
                      loading="lazy"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-zinc-400">No image</div>
                  )}
                  {isNew(l.createdAt) ? (
                    <span className="absolute left-2 top-2 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-900">
                      New
                    </span>
                  ) : null}
                </div>
                <div className="p-3">
                  <p className="font-medium text-zinc-900 group-hover:text-brand">{l.title}</p>
                  <p className="mt-1 text-sm text-zinc-500">
                    £{(l.price / 100).toFixed(2)} · {l.categoryName}
                    {l.condition ? ` · ${CONDITION_LABELS[l.condition as keyof typeof CONDITION_LABELS] ?? l.condition}` : ""}
                  </p>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
      <p className="mt-4 text-xs text-zinc-500">
        Prefer map search?{" "}
        <Link
          href={`/search?sellerType=reclamation_yard&postcode=${encodeURIComponent(yardPostcode)}`}
          className="text-brand hover:underline"
        >
          Browse yards near {yardPostcode}
        </Link>
      </p>
    </section>
  );
}

export function YardWhyBuySection({ customLine }: { customLine: string | null }) {
  const points = [
    "Salvage keeps materials out of landfill",
    "Often cheaper than buying new",
    "Character you cannot get from mass-produced stock",
    "Support independent UK yards",
    "Ideal for builds, restorations, and creative projects",
    "See photos and details before you travel",
  ];
  return (
    <section aria-labelledby="why-buy-heading" className="rounded-2xl border border-zinc-200 bg-zinc-50/80 p-6">
      <h2 id="why-buy-heading" className="text-lg font-semibold text-zinc-900">
        Why buy reclaimed?
      </h2>
      <ul className="mt-4 grid gap-2 text-sm text-zinc-700 sm:grid-cols-2">
        {points.map((p) => (
          <li key={p} className="flex gap-2">
            <span className="text-brand">✓</span>
            <span>{p}</span>
          </li>
        ))}
      </ul>
      {customLine?.trim() ? (
        <p className="mt-4 border-t border-zinc-200 pt-4 text-sm font-medium text-zinc-800">{customLine.trim()}</p>
      ) : null}
    </section>
  );
}

export function YardRecentStrip({ listings }: { listings: YardListingCard[] }) {
  const slice = listings.slice(0, 8);
  if (slice.length === 0) return null;
  return (
    <section aria-labelledby="recent-heading" className="mt-10">
      <h2 id="recent-heading" className="text-lg font-semibold text-zinc-900">
        Recent arrivals
      </h2>
      <div className="mt-4 flex gap-3 overflow-x-auto pb-2">
        {slice.map((l) => (
          <Link
            key={l.id}
            href={`/listings/${l.id}`}
            className="w-40 shrink-0 overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm"
          >
            <div className="relative aspect-square bg-zinc-100">
              {l.image ? (
                <Image src={l.image} alt={l.title} fill className="object-cover" sizes="160px" loading="lazy" />
              ) : (
                <div className="flex h-full items-center justify-center text-xs text-zinc-400">No image</div>
              )}
            </div>
            <p className="line-clamp-2 p-2 text-xs font-medium text-zinc-900">{l.title}</p>
          </Link>
        ))}
      </div>
    </section>
  );
}

export function YardEnquiryFormIsland({
  yardUserId,
  yardSlug,
  defaultName,
  defaultEmail,
  responseTimeNote,
}: {
  yardUserId: string;
  yardSlug: string;
  defaultName: string;
  defaultEmail: string;
  responseTimeNote: string | null;
}) {
  const [state, formAction] = useActionState(submitYardEnquiryAction, { ok: false });

  if (state.ok) {
    return (
      <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900">
        Thanks — your message was sent. The yard will get back to you soon.
      </div>
    );
  }

  return (
    <form action={formAction} className="space-y-3 rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
      <h2 id="enquiry" className="text-sm font-semibold text-zinc-900">
        Send an enquiry
      </h2>
      {responseTimeNote?.trim() ? (
        <p className="text-xs text-zinc-500">{responseTimeNote.trim()}</p>
      ) : (
        <p className="text-xs text-zinc-500">Typically yards respond within one business day.</p>
      )}
      <input type="hidden" name="yardUserId" value={yardUserId} />
      <input type="hidden" name="yardSlug" value={yardSlug} />
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-xs font-medium text-zinc-600">Your name</label>
          <input
            name="name"
            required
            defaultValue={defaultName}
            className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-zinc-600">Email</label>
          <input
            name="email"
            type="email"
            required
            defaultValue={defaultEmail}
            className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
          />
        </div>
      </div>
      <div>
        <label className="mb-1 block text-xs font-medium text-zinc-600">Phone (optional)</label>
        <input name="phone" type="tel" className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm" />
      </div>
      <div>
        <label className="mb-1 block text-xs font-medium text-zinc-600">Quantity / reference (optional)</label>
        <input name="quantity" className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm" />
      </div>
      <div>
        <label className="mb-1 block text-xs font-medium text-zinc-600">Message</label>
        <textarea
          name="message"
          required
          rows={4}
          className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
          placeholder="What are you looking for?"
        />
      </div>
      {state.message ? <p className="text-sm text-red-600">{state.message}</p> : null}
      <SubmitButton label="Send enquiry" />
    </form>
  );
}

export function YardStockAlertToggle({
  sellerId,
  yardSlug,
  viewerId,
  hasAlert,
}: {
  sellerId: string;
  yardSlug: string;
  viewerId: string | null;
  hasAlert: boolean;
}) {
  if (!viewerId) {
    return (
      <p className="text-sm text-zinc-600">
        <Link href="/auth/signin" className="font-medium text-brand hover:underline">
          Sign in
        </Link>{" "}
        to get alerts when this yard lists new marketplace stock.
      </p>
    );
  }
  if (viewerId === sellerId) return null;

  return (
    <form action={toggleYardStockAlertAction} className="inline">
      <input type="hidden" name="sellerId" value={sellerId} />
      <input type="hidden" name="yardSlug" value={yardSlug} />
      <input type="hidden" name="categoryId" value="all" />
      <button
        type="submit"
        className="rounded-lg border border-zinc-300 bg-white px-3 py-1.5 text-sm font-medium text-zinc-800 hover:bg-zinc-50"
      >
        {hasAlert ? "Stop stock alerts" : "Alert me for new stock"}
      </button>
    </form>
  );
}

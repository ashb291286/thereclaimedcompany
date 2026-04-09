"use client";

import { useState } from "react";
import { createDemolitionProjectAction } from "@/lib/actions/demolition-alerts";

type Row = {
  title: string;
  description: string;
  isFree: boolean;
  priceGbp: string;
  removalMustCompleteBy: string;
  pickupWhereWhen: string;
  conditions: string;
  quantityNote: string;
};

function emptyRow(): Row {
  return {
    title: "",
    description: "",
    isFree: true,
    priceGbp: "",
    removalMustCompleteBy: "",
    pickupWhereWhen: "",
    conditions: "",
    quantityNote: "",
  };
}

function rowToPayload(r: Row) {
  const pricePence = r.isFree ? null : Math.round(parseFloat(r.priceGbp || "0") * 100);
  return {
    title: r.title.trim(),
    description: r.description.trim(),
    isFree: r.isFree,
    pricePence,
    removalMustCompleteBy: r.removalMustCompleteBy.trim() || null,
    pickupWhereWhen: r.pickupWhereWhen.trim(),
    conditions: r.conditions.trim(),
    quantityNote: r.quantityNote.trim(),
  };
}

export function DemolitionProjectCreateForm({
  defaultPostcode,
}: {
  defaultPostcode: string;
}) {
  const [rows, setRows] = useState<Row[]>([emptyRow(), emptyRow()]);
  const [images, setImages] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);

  async function onPickPhotos(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (!files?.length) return;
    setUploading(true);
    try {
      const next = [...images];
      for (const file of Array.from(files)) {
        if (next.length >= 12) break;
        const fd = new FormData();
        fd.set("file", file);
        fd.set("folder", "demolition");
        const res = await fetch("/api/upload", { method: "POST", body: fd });
        if (!res.ok) continue;
        const data = (await res.json()) as { url?: string };
        if (data.url) next.push(data.url);
      }
      setImages(next);
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  }

  function updateRow(i: number, patch: Partial<Row>) {
    setRows((prev) => prev.map((r, j) => (j === i ? { ...r, ...patch } : r)));
  }

  const elementsJson = JSON.stringify(
    rows
      .map(rowToPayload)
      .filter((p) => p.title.length > 0)
  );

  return (
    <form action={createDemolitionProjectAction} className="space-y-8">
      <div className="rounded-xl border border-zinc-200 bg-white p-5 space-y-4">
        <h2 className="text-sm font-semibold text-zinc-900">Site &amp; access</h2>
        <div>
          <label className="block text-xs font-medium text-zinc-500 mb-1">Project title</label>
          <input
            name="title"
            required
            className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
            placeholder="e.g. City centre office strip-out"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-zinc-500 mb-1">Description</label>
          <textarea
            name="description"
            required
            rows={5}
            className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
            placeholder="What is being demolished or refurbished, scale, timing, hazards overview…"
          />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="block text-xs font-medium text-zinc-500 mb-1">Site address (optional line)</label>
            <input
              name="siteAddress"
              className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
              placeholder="Shown publicly at high level"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-zinc-500 mb-1">Site postcode</label>
            <input
              name="postcode"
              required
              defaultValue={defaultPostcode}
              className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
            />
          </div>
        </div>
        <div>
          <label className="block text-xs font-medium text-zinc-500 mb-1">Where / when to access site</label>
          <textarea
            name="accessWhereWhen"
            rows={3}
            className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
            placeholder="Meeting point, gate times, induction, parking, PPE…"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-zinc-500 mb-1">General conditions</label>
          <textarea
            name="conditionsGeneral"
            rows={3}
            className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
            placeholder="Insurance, RAMS, lifting, cutting restrictions…"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-zinc-500 mb-1">Site photos (optional)</label>
          <input type="file" accept="image/*" multiple className="text-sm" onChange={onPickPhotos} disabled={uploading} />
          {uploading ? <p className="mt-1 text-xs text-zinc-500">Uploading…</p> : null}
          {images.length > 0 ? (
            <ul className="mt-2 flex flex-wrap gap-2">
              {images.map((url) => (
                <li key={url} className="relative h-16 w-16 overflow-hidden rounded border border-zinc-200">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={url} alt="" className="h-full w-full object-cover" />
                  <button
                    type="button"
                    className="absolute right-0 top-0 bg-black/60 px-1 text-[10px] text-white"
                    onClick={() => setImages((prev) => prev.filter((u) => u !== url))}
                  >
                    ×
                  </button>
                </li>
              ))}
            </ul>
          ) : null}
          <input type="hidden" name="imagesJson" value={JSON.stringify(images)} />
        </div>
      </div>

      <div className="rounded-xl border border-zinc-200 bg-white p-5 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-sm font-semibold text-zinc-900">Lots (doors, windows, flooring, etc.)</h2>
          <button
            type="button"
            className="rounded-lg border border-zinc-300 px-3 py-1.5 text-sm hover:bg-zinc-50"
            onClick={() => setRows((r) => [...r, emptyRow()])}
          >
            Add lot
          </button>
        </div>
        <p className="text-xs text-zinc-600">
          Each row is one offer: mark as <strong>free</strong> for collection-only (buyers and yards can reserve), or{" "}
          <strong>chargeable</strong> to show a guide price — interested parties register so you can arrange payment and
          collection.
        </p>

        <div className="space-y-6">
          {rows.map((row, i) => (
            <div key={i} className="rounded-lg border border-zinc-100 bg-zinc-50/80 p-4 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-xs font-semibold text-zinc-500">Lot {i + 1}</span>
                {rows.length > 1 ? (
                  <button
                    type="button"
                    className="text-xs text-red-600 hover:underline"
                    onClick={() => setRows((prev) => prev.filter((_, j) => j !== i))}
                  >
                    Remove
                  </button>
                ) : null}
              </div>
              <input
                value={row.title}
                onChange={(e) => updateRow(i, { title: e.target.value })}
                className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
                placeholder="Lot title (required to include this row)"
              />
              <textarea
                value={row.description}
                onChange={(e) => updateRow(i, { description: e.target.value })}
                rows={2}
                className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
                placeholder="Details, dimensions, approx. quantity…"
              />
              <label className="flex items-center gap-2 text-sm text-zinc-700">
                <input
                  type="checkbox"
                  checked={row.isFree}
                  onChange={(e) => updateRow(i, { isFree: e.target.checked })}
                />
                Free to collector (reservable)
              </label>
              {!row.isFree ? (
                <div>
                  <label className="block text-xs text-zinc-500 mb-1">Guide price (£)</label>
                  <input
                    type="number"
                    step="0.01"
                    min={0}
                    value={row.priceGbp}
                    onChange={(e) => updateRow(i, { priceGbp: e.target.value })}
                    className="w-40 rounded-lg border border-zinc-300 px-3 py-2 text-sm"
                  />
                </div>
              ) : null}
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="block text-xs text-zinc-500 mb-1">Removal complete by</label>
                  <input
                    type="datetime-local"
                    value={row.removalMustCompleteBy}
                    onChange={(e) => updateRow(i, { removalMustCompleteBy: e.target.value })}
                    className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs text-zinc-500 mb-1">Quantity note</label>
                  <input
                    value={row.quantityNote}
                    onChange={(e) => updateRow(i, { quantityNote: e.target.value })}
                    className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
                    placeholder="e.g. ~40 doors"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs text-zinc-500 mb-1">Where / when to collect this lot</label>
                <textarea
                  value={row.pickupWhereWhen}
                  onChange={(e) => updateRow(i, { pickupWhereWhen: e.target.value })}
                  rows={2}
                  className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
                  placeholder="Bay 2, lifts Mon–Thu 08:00–14:00…"
                />
              </div>
              <div>
                <label className="block text-xs text-zinc-500 mb-1">Conditions for this lot</label>
                <textarea
                  value={row.conditions}
                  onChange={(e) => updateRow(i, { conditions: e.target.value })}
                  rows={2}
                  className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
                  placeholder="Strip in situ, no flame cutting, bring ID…"
                />
              </div>
            </div>
          ))}
        </div>
        <input type="hidden" name="elementsJson" value={elementsJson} />
      </div>

      <div className="flex flex-wrap gap-3">
        <button
          type="submit"
          name="publishIntent"
          value="draft"
          className="rounded-lg border border-zinc-300 px-4 py-2 text-sm font-medium hover:bg-zinc-50"
        >
          Save draft
        </button>
        <button
          type="submit"
          name="publishIntent"
          value="publish"
          className="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-hover"
        >
          Publish alert
        </button>
      </div>
    </form>
  );
}

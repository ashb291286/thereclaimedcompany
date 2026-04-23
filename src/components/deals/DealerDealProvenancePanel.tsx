import { coalesceDealerProvenanceDocuments } from "@/lib/dealer-provenance";
import type { Listing } from "@/generated/prisma/client";

type TimelineEntry = { date: string; event: string };

function parseTimeline(raw: unknown): TimelineEntry[] {
  if (!Array.isArray(raw)) return [];
  const out: TimelineEntry[] = [];
  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    const o = item as { date?: unknown; event?: unknown };
    const date = typeof o.date === "string" ? o.date.trim() : "";
    const event = typeof o.event === "string" ? o.event.trim() : "";
    if (date && event) out.push({ date, event });
  }
  return out;
}

export function DealerDealProvenancePanel({ listing }: { listing: Listing }) {
  const timeline = parseTimeline(listing.dealerProvenanceTimeline);
  const docs = coalesceDealerProvenanceDocuments(listing.dealerProvenanceDocuments);
  const dimLine =
    listing.dimensionsW != null || listing.dimensionsH != null || listing.dimensionsD != null
      ? `${listing.dimensionsW ?? "?"} × ${listing.dimensionsH ?? "?"} × ${listing.dimensionsD ?? "?"} cm (W×H×D)`
      : null;

  const hasSomething =
    dimLine ||
    listing.propMaterials[0] ||
    listing.styleTags[0] ||
    listing.dateSpecific ||
    listing.dealerDesigner ||
    listing.geographicOrigin ||
    (listing.dealerAcquisitionStory && listing.dealerAcquisitionStory.trim()) ||
    timeline.length > 0 ||
    docs.length > 0;

  if (!hasSomething) return null;

  return (
    <div className="mt-4 rounded-xl border border-amber-200/80 bg-amber-50/50 p-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-amber-900/80">Provenance &amp; details</p>
      <p className="mt-1 text-xs text-amber-950/80">
        From the listing passport — same context for both parties in this thread.
      </p>
      <dl className="mt-3 grid gap-2 text-sm text-zinc-800 sm:grid-cols-2">
        {dimLine ? (
          <div>
            <dt className="text-xs text-zinc-500">Dimensions</dt>
            <dd className="font-medium">{dimLine}</dd>
          </div>
        ) : null}
        {listing.propMaterials[0] ? (
          <div>
            <dt className="text-xs text-zinc-500">Material</dt>
            <dd className="font-medium">{listing.propMaterials[0]}</dd>
          </div>
        ) : null}
        {listing.styleTags[0] ? (
          <div>
            <dt className="text-xs text-zinc-500">Style</dt>
            <dd className="font-medium">{listing.styleTags[0]}</dd>
          </div>
        ) : null}
        {listing.dateSpecific ? (
          <div>
            <dt className="text-xs text-zinc-500">Manufacturing</dt>
            <dd className="font-medium">{listing.dateSpecific}</dd>
          </div>
        ) : null}
        {listing.dealerDesigner ? (
          <div>
            <dt className="text-xs text-zinc-500">Designer</dt>
            <dd className="font-medium">{listing.dealerDesigner}</dd>
          </div>
        ) : null}
        {listing.geographicOrigin ? (
          <div>
            <dt className="text-xs text-zinc-500">Origin</dt>
            <dd className="font-medium">{listing.geographicOrigin}</dd>
          </div>
        ) : null}
      </dl>
      {listing.dealerAcquisitionStory?.trim() ? (
        <div className="mt-3 rounded-lg border border-amber-200/60 bg-white/80 p-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Acquisition</p>
          <p className="mt-1 whitespace-pre-wrap text-sm text-zinc-800">{listing.dealerAcquisitionStory.trim()}</p>
        </div>
      ) : null}
      {timeline.length > 0 ? (
        <div className="mt-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Timeline</p>
          <ul className="mt-2 space-y-1.5 text-sm">
            {timeline.map((t, i) => (
              <li key={`${i}-${t.date}`}>
                <span className="font-medium text-zinc-800">{t.date}</span>
                <span className="text-zinc-600"> — {t.event}</span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
      {docs.length > 0 ? (
        <div className="mt-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Documents on file</p>
          <ul className="mt-2 flex flex-wrap gap-2">
            {docs.map((d) => (
              <li key={d.url}>
                <a
                  href={d.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex max-w-[200px] items-center gap-2 rounded-lg border border-zinc-200 bg-white px-2 py-1 text-xs font-medium text-brand hover:underline"
                >
                  {d.kind === "image" ? (
                    <img src={d.url} alt="" className="h-8 w-8 rounded object-cover" />
                  ) : (
                    <span className="flex h-8 w-8 items-center justify-center rounded bg-zinc-100 text-[10px]">
                      PDF
                    </span>
                  )}
                  <span className="truncate">{d.label}</span>
                </a>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}

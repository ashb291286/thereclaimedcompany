import {
  DVLA_VES_DISPLAY_ORDER,
  DVLA_VES_LABELS,
  formatDvlaValueForDisplay,
} from "@/lib/dvla-ves-display";
import type { DvlaVehicleEnquiryData } from "@/lib/dvla-vehicle-enquiry";

function coerceSnapshot(raw: unknown): Partial<DvlaVehicleEnquiryData> | null {
  if (raw == null || typeof raw !== "object" || Array.isArray(raw)) return null;
  return raw as Partial<DvlaVehicleEnquiryData>;
}

/** Public passport: show stored DVLA VES fields when present. */
export function DrivenPassportDvlaSnapshot({ snapshot }: { snapshot: unknown }) {
  const data = coerceSnapshot(snapshot);
  if (!data) return null;

  const rows = DVLA_VES_DISPLAY_ORDER.flatMap((key) => {
    const val = data[key];
    if (val === undefined || val === null) return [];
    if (typeof val === "string" && val.trim() === "") return [];
    return [{ key, val }];
  });

  if (rows.length === 0) return null;

  return (
    <section
      className="border border-driven-warm bg-white px-5 py-6"
      aria-labelledby="passport-dvla-heading"
    >
      <h2
        id="passport-dvla-heading"
        className="font-[family-name:var(--font-driven-mono)] text-[10px] uppercase tracking-[0.2em] text-driven-muted"
      >
        DVLA record (snapshot)
      </h2>
      <p className="mt-2 text-xs leading-relaxed text-driven-muted">
        Data from the UK DVLA Vehicle Enquiry Service captured when this passport was started on Reclaimed. Tax, MOT,
        and other statuses change over time — confirm with the owner or run a fresh check before you rely on them.
      </p>
      <dl className="mt-4 grid gap-3 sm:grid-cols-2">
        {rows.map(({ key, val }) => (
          <div key={key} className="min-w-0 border-b border-driven-warm/50 pb-2 sm:border-0 sm:pb-0">
            <dt className="font-[family-name:var(--font-driven-mono)] text-[9px] uppercase tracking-wider text-driven-muted">
              {DVLA_VES_LABELS[key] ?? key}
            </dt>
            <dd className="mt-0.5 text-sm text-driven-ink">{formatDvlaValueForDisplay(key, val)}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

import {
  formatOpeningHoursLines,
  isYardOpenNow,
  scheduleFromDbField,
} from "@/lib/opening-hours";

export function OpeningHoursBlock({
  scheduleJson,
  legacyText,
  id,
  showOpenNowBadge,
}: {
  scheduleJson: unknown;
  legacyText: string | null;
  id?: string;
  /** When true and structured hours exist, show Open now / Closed badge (Europe/London). */
  showOpenNowBadge?: boolean;
}) {
  const schedule = scheduleFromDbField(scheduleJson);
  if (schedule) {
    const lines = formatOpeningHoursLines(schedule);
    const openNow = showOpenNowBadge ? isYardOpenNow(schedule) : null;
    return (
      <div className="mt-4" id={id}>
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="text-sm font-semibold text-zinc-900">Opening hours</h2>
          {openNow === true ? (
            <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-800">
              Open now
            </span>
          ) : openNow === false ? (
            <span className="rounded-full bg-zinc-200 px-2 py-0.5 text-xs font-medium text-zinc-700">
              Closed now
            </span>
          ) : null}
        </div>
        <ul className="mt-2 space-y-1 text-sm text-zinc-600">
          {lines.map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ul>
      </div>
    );
  }
  if (legacyText?.trim()) {
    return (
      <div className="mt-4" id={id}>
        <h2 className="text-sm font-semibold text-zinc-900">Opening hours</h2>
        <p className="mt-2 text-sm text-zinc-600">{legacyText.trim()}</p>
      </div>
    );
  }
  return null;
}

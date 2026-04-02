import { formatOpeningHoursLines, scheduleFromDbField } from "@/lib/opening-hours";

export function OpeningHoursBlock({
  scheduleJson,
  legacyText,
  id,
}: {
  scheduleJson: unknown;
  legacyText: string | null;
  id?: string;
}) {
  const schedule = scheduleFromDbField(scheduleJson);
  if (schedule) {
    const lines = formatOpeningHoursLines(schedule);
    return (
      <div className="mt-4" id={id}>
        <h2 className="text-sm font-semibold text-zinc-900">Opening hours</h2>
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

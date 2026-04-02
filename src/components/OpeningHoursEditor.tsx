"use client";

import { useMemo, useState } from "react";
import {
  DAY_ORDER,
  DAY_LABELS,
  defaultYardOpeningHours,
  type DayKey,
  type WeeklyOpeningHours,
} from "@/lib/opening-hours";

export function OpeningHoursEditor({
  initialSchedule,
  fieldName = "openingHoursSchedule",
}: {
  initialSchedule?: WeeklyOpeningHours | null;
  fieldName?: string;
}) {
  const [schedule, setSchedule] = useState<WeeklyOpeningHours>(() =>
    initialSchedule ?? defaultYardOpeningHours()
  );

  const json = useMemo(() => JSON.stringify(schedule), [schedule]);

  function setDay(day: DayKey, patch: Partial<WeeklyOpeningHours[DayKey]>) {
    setSchedule((s) => ({ ...s, [day]: { ...s[day], ...patch } as WeeklyOpeningHours[DayKey] }));
  }

  return (
    <div className="space-y-3">
      <input type="hidden" name={fieldName} value={json} />
      <p className="text-sm font-medium text-zinc-700">Opening hours</p>
      <p className="text-xs text-zinc-500">Set each day to open or closed, and choose times when open.</p>
      <div className="space-y-2 rounded-xl border border-zinc-200 bg-zinc-50/80 p-3">
        {DAY_ORDER.map((day) => {
          const d = schedule[day];
          const open = !d.closed;
          return (
            <div
              key={day}
              className="flex flex-col gap-2 border-b border-zinc-200/80 pb-3 last:border-0 last:pb-0 sm:flex-row sm:items-center sm:justify-between sm:gap-4"
            >
              <span className="w-28 text-sm font-medium text-zinc-800">{DAY_LABELS[day]}</span>
              <div className="flex flex-wrap items-center gap-2">
                <div className="inline-flex rounded-lg border border-zinc-200 bg-white p-0.5 text-xs font-semibold">
                  <button
                    type="button"
                    onClick={() =>
                      setDay(day, {
                        closed: false,
                        open: d.open ?? "09:00",
                        close: d.close ?? "17:00",
                      })
                    }
                    className={`rounded-md px-2.5 py-1.5 transition ${
                      open ? "bg-brand text-white shadow-sm" : "text-zinc-600 hover:text-zinc-900"
                    }`}
                  >
                    Open
                  </button>
                  <button
                    type="button"
                    onClick={() => setDay(day, { closed: true })}
                    className={`rounded-md px-2.5 py-1.5 transition ${
                      !open ? "bg-zinc-800 text-white shadow-sm" : "text-zinc-600 hover:text-zinc-900"
                    }`}
                  >
                    Closed
                  </button>
                </div>
                {open && (
                  <div className="flex items-center gap-1.5 text-sm text-zinc-700">
                    <input
                      type="time"
                      value={d.open ?? "09:00"}
                      onChange={(e) => setDay(day, { open: e.target.value })}
                      className="rounded-lg border border-zinc-300 bg-white px-2 py-1 text-zinc-900"
                      aria-label={`${DAY_LABELS[day]} opens`}
                    />
                    <span className="text-zinc-400">–</span>
                    <input
                      type="time"
                      value={d.close ?? "17:00"}
                      onChange={(e) => setDay(day, { close: e.target.value })}
                      className="rounded-lg border border-zinc-300 bg-white px-2 py-1 text-zinc-900"
                      aria-label={`${DAY_LABELS[day]} closes`}
                    />
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

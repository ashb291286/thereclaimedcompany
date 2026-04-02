export const DAY_ORDER = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"] as const;
export type DayKey = (typeof DAY_ORDER)[number];

export const DAY_LABELS: Record<DayKey, string> = {
  mon: "Monday",
  tue: "Tuesday",
  wed: "Wednesday",
  thu: "Thursday",
  fri: "Friday",
  sat: "Saturday",
  sun: "Sunday",
};

export const DAY_LABELS_SHORT: Record<DayKey, string> = {
  mon: "Mon",
  tue: "Tue",
  wed: "Wed",
  thu: "Thu",
  fri: "Fri",
  sat: "Sat",
  sun: "Sun",
};

export type DaySchedule = {
  closed: boolean;
  open?: string;
  close?: string;
};

export type WeeklyOpeningHours = Record<DayKey, DaySchedule>;

const TIME_RE = /^([01]\d|2[0-3]):([0-5]\d)$/;

export function defaultYardOpeningHours(): WeeklyOpeningHours {
  const weekday = { closed: false as const, open: "09:00", close: "17:00" };
  return {
    mon: { ...weekday },
    tue: { ...weekday },
    wed: { ...weekday },
    thu: { ...weekday },
    fri: { ...weekday },
    sat: { closed: true },
    sun: { closed: true },
  };
}

function dayIndex(day: DayKey): number {
  return DAY_ORDER.indexOf(day);
}

function isValidTime(s: string): boolean {
  return TIME_RE.test(s);
}

/** Parse and validate schedule from JSON (DB or client). */
export function parseOpeningHoursSchedule(raw: unknown): WeeklyOpeningHours | null {
  if (raw == null || typeof raw !== "object" || Array.isArray(raw)) return null;
  const o = raw as Record<string, unknown>;
  const out: Partial<WeeklyOpeningHours> = {};
  for (const day of DAY_ORDER) {
    if (!(day in o)) return null;
    const d = o[day];
    if (!d || typeof d !== "object" || Array.isArray(d)) return null;
    const closed = Boolean((d as { closed?: unknown }).closed);
    if (closed) {
      out[day] = { closed: true };
      continue;
    }
    const open = (d as { open?: unknown }).open;
    const close = (d as { close?: unknown }).close;
    if (typeof open !== "string" || typeof close !== "string") return null;
    if (!isValidTime(open) || !isValidTime(close)) return null;
    if (open >= close) return null;
    out[day] = { closed: false, open, close };
  }
  return out as WeeklyOpeningHours;
}

export function scheduleFromDbField(json: unknown): WeeklyOpeningHours | null {
  return parseOpeningHoursSchedule(json);
}

function formatTime12h(t: string): string {
  const m = TIME_RE.exec(t);
  if (!m) return t;
  let h = Number(m[1]);
  const min = m[2];
  const ap = h >= 12 ? "pm" : "am";
  h = h % 12;
  if (h === 0) h = 12;
  return min === "00" ? `${h}${ap}` : `${h}:${min}${ap}`;
}

/** Human-readable lines for profile (one per day). */
export function formatOpeningHoursLines(schedule: WeeklyOpeningHours): string[] {
  return DAY_ORDER.map((day) => {
    const d = schedule[day];
    if (d.closed) return `${DAY_LABELS[day]}: Closed`;
    return `${DAY_LABELS[day]}: ${formatTime12h(d.open!)}–${formatTime12h(d.close!)}`;
  });
}

function dayRangeLabel(start: DayKey, end: DayKey): string {
  if (start === end) return DAY_LABELS_SHORT[start];
  return `${DAY_LABELS_SHORT[start]}–${DAY_LABELS_SHORT[end]}`;
}

/** Short one-line summary e.g. Mon–Fri: 9am–5pm · Sat–Sun: closed */
export function openingHoursCompactLine(
  schedule: WeeklyOpeningHours | null,
  legacy: string | null | undefined
): string | null {
  if (schedule) {
    const openDays = DAY_ORDER.filter((d) => !schedule[d].closed);
    if (openDays.length === 0) return "Closed this week (check profile for updates)";

    type Run = { start: DayKey; end: DayKey; open: string; close: string };
    const runs: Run[] = [];
    for (const day of DAY_ORDER) {
      const d = schedule[day];
      if (d.closed) continue;
      const last = runs[runs.length - 1];
      if (
        last &&
        last.open === d.open &&
        last.close === d.close &&
        dayIndex(day) === dayIndex(last.end) + 1
      ) {
        last.end = day;
      } else {
        runs.push({ start: day, end: day, open: d.open!, close: d.close! });
      }
    }

    return runs
      .map(
        (r) =>
          `${dayRangeLabel(r.start, r.end)}: ${formatTime12h(r.open)}–${formatTime12h(r.close)}`
      )
      .join(" · ");
  }
  const t = legacy?.trim();
  return t ? t : null;
}

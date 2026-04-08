/** Recommended weekly hire as a fraction of the listing’s marketed (sale) price. */
export const PROP_YARD_RECOMMENDED_WEEKLY_RATE_OF_LIST_PRICE = 0.4;

/** Bump when on-site hire terms copy changes (stored on booking for audit). */
export const PROP_YARD_TERMS_VERSION = "2026-04-07";

export function suggestedWeeklyHirePence(listPricePence: number): number {
  if (!Number.isFinite(listPricePence) || listPricePence <= 0) {
    return Math.round(50 * 100); // £50/wk placeholder when no list price
  }
  const raw = Math.round(listPricePence * PROP_YARD_RECOMMENDED_WEEKLY_RATE_OF_LIST_PRICE);
  return Math.max(100, raw); // minimum £1/week in pence
}

export function startOfUtcDay(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

/** YYYY-MM-DD in UTC for `<input type="date">` / API boundaries. */
export function utcCalendarDateToIso(d: Date): string {
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** Inclusive calendar days between start and end (UTC dates). */
export function inclusiveHireDays(hireStart: Date, hireEnd: Date): number {
  const a = startOfUtcDay(hireStart).getTime();
  const b = startOfUtcDay(hireEnd).getTime();
  if (b < a) return 0;
  return Math.floor((b - a) / 86400000) + 1;
}

/** Bill in whole weeks, minimum one week (industry-friendly for props). */
export function billableWeeksFromRange(hireStart: Date, hireEnd: Date): number {
  const days = inclusiveHireDays(hireStart, hireEnd);
  if (days <= 0) return 0;
  return Math.max(1, Math.ceil(days / 7));
}

/**
 * Hire charge: pro-rata by day from the weekly rate, but never below the yard’s minimum hire (weeks × weekly).
 */
export function computePropHireTotalPence(
  hireStart: Date,
  hireEnd: Date,
  minimumHireWeeks: number,
  weeklyHirePence: number
): number {
  const days = inclusiveHireDays(hireStart, hireEnd);
  if (days <= 0) return 0;
  const minCharge = minimumHireWeeks * weeklyHirePence;
  const proRata = Math.round((weeklyHirePence / 7) * days);
  return Math.max(minCharge, proRata);
}

export function rangesOverlapUtc(
  aStart: Date,
  aEnd: Date,
  bStart: Date,
  bEnd: Date
): boolean {
  const as = startOfUtcDay(aStart).getTime();
  const ae = startOfUtcDay(aEnd).getTime();
  const bs = startOfUtcDay(bStart).getTime();
  const be = startOfUtcDay(bEnd).getTime();
  return as <= be && bs <= ae;
}

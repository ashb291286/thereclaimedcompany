"use client";

import { useEffect, useMemo, useState } from "react";
import { upsertPropSetItemAction } from "@/lib/actions/prop-yard";
import { PROP_YARD_TERMS_VERSION, utcCalendarDateToIso } from "@/lib/prop-yard";

function addUtcDaysIso(startIso: string, days: number): string {
  const [y, m, d] = startIso.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  dt.setUTCDate(dt.getUTCDate() + days);
  return utcCalendarDateToIso(dt);
}

export function PropHireAddToSetForm({
  offerId,
  setId,
  minimumHireWeeks,
  returnToPath,
  defaultHireStartIso = null,
  defaultHireEndIso = null,
}: {
  offerId: string;
  setId: string;
  minimumHireWeeks: number;
  returnToPath: string;
  /** From set-level defaults (YYYY-MM-DD UTC) — prefill add-to-set dates. */
  defaultHireStartIso?: string | null;
  defaultHireEndIso?: string | null;
}) {
  const minEndFor = useMemo(
    () => (start: string) => addUtcDaysIso(start, minimumHireWeeks * 7 - 1),
    [minimumHireWeeks]
  );

  const [hireStart, setHireStart] = useState(() => defaultHireStartIso ?? utcCalendarDateToIso(new Date()));
  const [hireEnd, setHireEnd] = useState(() => {
    const start = defaultHireStartIso ?? utcCalendarDateToIso(new Date());
    return defaultHireEndIso ?? minEndFor(start);
  });

  const minEnd = minEndFor(hireStart);

  useEffect(() => {
    setHireEnd((prev) => (prev < minEnd ? minEnd : prev));
  }, [minEnd]);

  return (
    <form action={upsertPropSetItemAction} className="mt-4 space-y-4">
      <input type="hidden" name="offerId" value={offerId} />
      <input type="hidden" name="setId" value={setId} />
      <input type="hidden" name="returnTo" value={returnToPath} />
      <div>
        <label className="block text-xs font-medium text-driven-ink">Hire start</label>
        <input
          type="date"
          name="hireStart"
          required
          value={hireStart}
          onChange={(e) => setHireStart(e.target.value)}
          className="mt-1 w-full rounded-lg border border-driven-warm px-3 py-2 text-sm"
        />
      </div>
      <div>
        <label className="block text-xs font-medium text-driven-ink">Hire end (inclusive)</label>
        <input
          type="date"
          name="hireEnd"
          required
          value={hireEnd}
          min={minEnd}
          onChange={(e) => setHireEnd(e.target.value)}
          className="mt-1 w-full rounded-lg border border-driven-warm px-3 py-2 text-sm"
        />
        <p className="mt-1 text-[11px] text-driven-muted">
          Minimum period {minimumHireWeeks} week{minimumHireWeeks === 1 ? "" : "s"}
          {defaultHireStartIso && defaultHireEndIso
            ? " — dates match your set’s default hire window (adjust if needed)."
            : " — end date defaults to the shortest valid window; you can extend."}{" "}
          Hire is priced pro-rata by day from the weekly rate (never below the minimum-week charge).
        </p>
      </div>
      <div>
        <label className="block text-xs font-medium text-driven-ink">Fulfillment</label>
        <select
          name="fulfillment"
          required
          className="mt-1 w-full rounded-lg border border-driven-warm px-3 py-2 text-sm"
        >
          <option value="COLLECT_AND_RETURN">We collect from yard and return after shoot</option>
          <option value="YARD_DELIVERS_AND_COLLECTS">Yard delivers and collects</option>
          <option value="ARRANGE_SEPARATELY">Arrange separately (note below)</option>
        </select>
      </div>
      <div>
        <label className="block text-xs font-medium text-driven-ink">Production / company name</label>
        <input
          name="hirerOrgName"
          required
          placeholder="e.g. Northlight Pictures Ltd"
          className="mt-1 w-full rounded-lg border border-driven-warm px-3 py-2 text-sm"
        />
      </div>
      <div>
        <label className="block text-xs font-medium text-driven-ink">Production notes (optional)</label>
        <textarea
          name="productionNotes"
          rows={3}
          className="mt-1 w-full rounded-lg border border-driven-warm px-3 py-2 text-sm"
          placeholder="Unit, location, special handling…"
        />
      </div>
      <div>
        <label className="block text-xs font-medium text-driven-ink">Delivery &amp; return notes (optional)</label>
        <textarea name="deliveryArrangementNotes" rows={2} className="mt-1 w-full rounded-lg border border-driven-warm px-3 py-2 text-sm" />
      </div>
      <p className="text-[11px] text-driven-muted">
        Hire terms (v{PROP_YARD_TERMS_VERSION}) are confirmed when you send requests from the set builder.
      </p>
      <button
        type="submit"
        className="w-full rounded-lg border border-driven-ink bg-driven-ink py-3 font-[family-name:var(--font-driven-mono)] text-xs font-semibold uppercase tracking-wide text-driven-paper hover:bg-driven-accent"
      >
        Add to set
      </button>
    </form>
  );
}

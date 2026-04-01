import type { CarbonImpactResult } from "@/lib/carbon/types";

function fmt(n: number, maxFrac = 1): string {
  if (!Number.isFinite(n)) return "—";
  if (n >= 1000) return n.toLocaleString(undefined, { maximumFractionDigits: 0 });
  return n.toLocaleString(undefined, {
    minimumFractionDigits: 0,
    maximumFractionDigits: maxFrac,
  });
}

export function CarbonBadge({
  impact,
  variant = "full",
  className = "",
}: {
  impact: CarbonImpactResult;
  variant?: "full" | "compact";
  className?: string;
}) {
  if (variant === "compact") {
    return (
      <div
        className={`inline-flex items-center rounded-full bg-gradient-to-r from-emerald-600/15 to-teal-600/15 px-2 py-0.5 text-[10px] font-semibold text-emerald-900 ring-1 ring-emerald-600/20 ${className}`}
      >
        Saves ~{fmt(impact.carbon_saved_kg, 0)} kg CO₂e
      </div>
    );
  }

  return (
    <div
      className={`rounded-2xl border border-emerald-200/80 bg-gradient-to-br from-emerald-50 via-white to-teal-50/90 p-4 shadow-sm ring-1 ring-emerald-100/80 ${className}`}
    >
      <p className="text-[11px] font-semibold uppercase tracking-wide text-emerald-800/90">
        Environmental impact (estimate)
      </p>
      <ul className="mt-3 space-y-2 text-sm text-zinc-800">
        <li className="flex items-start gap-2">
          <span className="text-base leading-none text-emerald-600" aria-hidden>
            🌱
          </span>
          <span>
            Saves <strong>{fmt(impact.carbon_saved_kg)} kg</strong> CO₂e
            {impact.carbon_saved_tonnes >= 0.1 ? (
              <> ({fmt(impact.carbon_saved_tonnes, 2)} tonnes)</>
            ) : null}
          </span>
        </li>
        <li className="flex items-start gap-2">
          <span className="text-base leading-none text-emerald-600" aria-hidden>
            🌳
          </span>
          <span>
            ≈ <strong>{fmt(impact.trees_equivalent, 2)}</strong> trees&apos; worth of CO₂/year
            (indicative)
          </span>
        </li>
        <li className="flex items-start gap-2">
          <span className="text-base leading-none text-teal-600" aria-hidden>
            🚗
          </span>
          <span>
            ≈ <strong>{fmt(impact.miles_equivalent, 1)}</strong> miles not driven (UK avg car, indicative)
          </span>
        </li>
        <li className="flex items-start gap-2">
          <span className="text-base leading-none text-teal-600" aria-hidden>
            ♻️
          </span>
          <span>
            <strong>{fmt(impact.waste_diverted_kg)} kg</strong> mass kept in use (vs landfill / new
            production)
          </span>
        </li>
      </ul>
      <p className="mt-3 border-t border-emerald-100 pt-3 text-[11px] leading-relaxed text-zinc-500">
        Based on <strong className="font-medium text-zinc-600">{impact.data_source}</strong> embodied
        carbon factors widely used in UK construction (indicative; not a formal EPD).
      </p>
    </div>
  );
}

export function carbonSeoSentence(impact: CarbonImpactResult): string {
  return `This reclaimed material saves approximately ${fmt(impact.carbon_saved_kg, 0)} kg of CO₂e compared to new production, based on ICE Database carbon factors widely used in UK construction.`;
}

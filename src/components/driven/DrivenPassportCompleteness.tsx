const ITEMS = [
  "Factory documentation",
  "Ownership chain",
  "Service records (3+)",
  "Independent inspection",
  "Bodywork / restoration noted",
  "Competition history",
] as const;

export function DrivenPassportCompleteness({ score }: { score: number }) {
  const filled = Math.min(ITEMS.length, Math.round((score / 100) * ITEMS.length));
  return (
    <div className="border border-driven-warm bg-white p-5">
      <h2 className="font-[family-name:var(--font-driven-mono)] text-[10px] uppercase tracking-[0.2em] text-driven-muted">
        Passport completeness
      </h2>
      <div className="mt-3 h-3 bg-driven-warm">
        <div className="h-full bg-driven-ink" style={{ width: `${score}%` }} />
      </div>
      <p className="mt-2 font-[family-name:var(--font-driven-mono)] text-xs text-driven-ink">{score}/100</p>
      <ul className="mt-4 space-y-2 font-[family-name:var(--font-driven-body)] text-xs text-driven-muted">
        {ITEMS.map((label, i) => (
          <li key={label} className={i < filled ? "text-driven-ink" : ""}>
            {i < filled ? "✓ " : "○ "}
            {label}
          </li>
        ))}
      </ul>
    </div>
  );
}

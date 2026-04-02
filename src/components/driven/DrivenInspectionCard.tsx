type Scores = {
  overallScore: number;
  bodyAndPaint: number;
  mechanical: number;
  interior: number;
  underbody: number;
  electrics: number;
};

const ROWS: { key: keyof Omit<Scores, "overallScore">; label: string }[] = [
  { key: "bodyAndPaint", label: "Body & paint" },
  { key: "mechanical", label: "Mechanical" },
  { key: "interior", label: "Interior" },
  { key: "underbody", label: "Underbody" },
  { key: "electrics", label: "Electrics" },
];

export function DrivenInspectionCard({ scores }: { scores: Scores }) {
  return (
    <div className="border border-driven-warm bg-white p-5">
      <h2 className="font-[family-name:var(--font-driven-mono)] text-[10px] uppercase tracking-[0.2em] text-driven-muted">
        Inspection
      </h2>
      <p className="mt-3 font-[family-name:var(--font-driven-display)] text-3xl text-driven-ink">
        {scores.overallScore}
        <span className="font-[family-name:var(--font-driven-mono)] text-sm text-driven-muted"> /100</span>
      </p>
      <ul className="mt-4 space-y-3">
        {ROWS.map(({ key, label }) => (
          <li key={key}>
            <div className="flex justify-between font-[family-name:var(--font-driven-mono)] text-[10px] uppercase text-driven-muted">
              <span>{label}</span>
              <span>{scores[key]}</span>
            </div>
            <div className="mt-1 h-2 bg-driven-warm">
              <div className="h-full bg-driven-accent" style={{ width: `${scores[key]}%` }} />
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

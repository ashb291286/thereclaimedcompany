function pounds(v: number): string {
  return `£${(v / 100).toLocaleString("en-GB", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

export function DrivenValueTracker({
  valuations,
  todayEstimate,
}: {
  valuations: { year: number; value: number }[];
  todayEstimate: number;
}) {
  if (valuations.length === 0) {
    return (
      <div className="border border-driven-warm bg-white p-5">
        <h2 className="font-[family-name:var(--font-driven-mono)] text-[10px] uppercase tracking-[0.2em] text-driven-muted">
          Value tracker
        </h2>
        <p className="mt-3 text-sm text-driven-muted">No valuation history yet.</p>
      </div>
    );
  }

  const max = Math.max(...valuations.map((v) => v.value), todayEstimate, 1);
  const min = Math.min(...valuations.map((v) => v.value), todayEstimate);
  const pad = (max - min) * 0.08 || max * 0.05;
  const top = max + pad;
  const bottom = Math.max(0, min - pad);
  const h = 80;
  const w = 240;
  const pts = valuations.map((v, i) => {
    const x = (i / Math.max(1, valuations.length - 1)) * w;
    const y = h - ((v.value - bottom) / (top - bottom || 1)) * h;
    return `${x},${y}`;
  });
  const polyline = pts.join(" ");

  return (
    <div className="border border-driven-warm bg-white p-5">
      <h2 className="font-[family-name:var(--font-driven-mono)] text-[10px] uppercase tracking-[0.2em] text-driven-muted">
        Value tracker
      </h2>
      <svg viewBox={`0 0 ${w} ${h}`} className="mt-4 w-full max-w-full text-driven-accent" aria-hidden>
        <polyline
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          points={polyline}
        />
      </svg>
      <table className="mt-4 w-full font-[family-name:var(--font-driven-mono)] text-[10px] uppercase text-driven-muted">
        <tbody>
          {valuations.slice(-4).map((v) => (
            <tr key={v.year} className="border-t border-driven-warm">
              <td className="py-2">{v.year}</td>
              <td className="py-2 text-right text-driven-ink">{pounds(v.value)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="mt-4 font-[family-name:var(--font-driven-display)] text-lg text-driven-ink">
        Today <span className="not-italic text-driven-muted">·</span> {pounds(todayEstimate)}
      </p>
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";

function formatRemaining(ms: number): string {
  if (ms <= 0) return "Ended";
  const s = Math.floor(ms / 1000);
  const d = Math.floor(s / 86400);
  const h = Math.floor((s % 86400) / 3600);
  const m = Math.floor((s % 3600) / 60);
  if (d > 0) return `${d}d ${h}h`;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

export function DrivenCountdown({ endsAtIso }: { endsAtIso: string }) {
  const [label, setLabel] = useState(() => {
    const end = new Date(endsAtIso).getTime();
    return formatRemaining(end - Date.now());
  });

  useEffect(() => {
    const end = new Date(endsAtIso).getTime();
    const id = window.setInterval(() => {
      setLabel(formatRemaining(end - Date.now()));
    }, 60_000);
    return () => window.clearInterval(id);
  }, [endsAtIso]);

  return (
    <span className="font-[family-name:var(--font-driven-mono)] text-sm text-driven-ink">{label}</span>
  );
}

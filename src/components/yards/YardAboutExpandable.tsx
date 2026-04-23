"use client";

import { useMemo, useState } from "react";

export function YardAboutExpandable({ text }: { text: string }) {
  const [expanded, setExpanded] = useState(false);
  const long = text.length > 420 || text.split("\n").length > 6;
  const preview = useMemo(() => {
    if (!long) return text;
    return `${text.slice(0, 420).trimEnd()}...`;
  }, [long, text]);

  return (
    <div className="mt-3">
      <div className="whitespace-pre-wrap text-sm leading-relaxed text-zinc-700">
        {expanded || !long ? text : preview}
      </div>
      {long ? (
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="mt-2 text-sm font-medium text-brand underline hover:text-brand-hover"
          aria-expanded={expanded}
        >
          {expanded ? "Read less" : "Read more"}
        </button>
      ) : null}
    </div>
  );
}

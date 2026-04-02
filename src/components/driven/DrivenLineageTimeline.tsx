import type { MockLineageRow } from "@/app/driven/_lib/mock-auction";
import { drivenLineageCategoryColor } from "@/app/driven/_lib/category-colors";

type Entry = MockLineageRow;

function formatDate(d: Date): string {
  return d.toLocaleDateString("en-GB", { month: "short", year: "numeric" });
}

export function DrivenLineageTimeline({
  entries,
  showUploadHint,
}: {
  entries: Entry[];
  showUploadHint?: boolean;
}) {
  return (
    <section className="border border-driven-warm bg-white">
      <div className="border-b border-driven-warm px-5 py-4">
        <p className="font-[family-name:var(--font-driven-mono)] text-[10px] uppercase tracking-[0.25em] text-driven-accent">
          Driven · Lineage
        </p>
        <h2 className="mt-2 font-[family-name:var(--font-driven-display)] text-2xl italic text-driven-ink">
          The Record
        </h2>
      </div>
      <div className="px-5 py-6">
        <ul className="relative space-y-8 border-l border-driven-warm pl-6">
          {entries.map((e) => (
            <li key={e.id} className="relative">
              <span
                className="absolute -left-[29px] top-1.5 h-3 w-3 rounded-full border-2 border-driven-paper"
                style={{ backgroundColor: drivenLineageCategoryColor(e.category) }}
                aria-hidden
              />
              <p className="font-[family-name:var(--font-driven-mono)] text-xs text-driven-muted">
                {formatDate(e.date)}
                {e.mileageAtTime != null ? ` · ${e.mileageAtTime.toLocaleString()} mi` : ""}
                <span className="ml-2 text-[10px] uppercase tracking-wide">{e.category.replace("_", " ")}</span>
              </p>
              <h3 className="mt-1 font-[family-name:var(--font-driven-display)] text-lg text-driven-ink">{e.title}</h3>
              {e.description ? (
                <p className="mt-2 font-[family-name:var(--font-driven-body)] text-sm leading-relaxed text-driven-muted">
                  {e.description}
                </p>
              ) : null}
              {e.documents.length > 0 ? (
                <ul className="mt-3 flex flex-wrap gap-2">
                  {e.documents.map((doc, i) => (
                    <li
                      key={`${e.id}-${i}`}
                      className="font-[family-name:var(--font-driven-mono)] text-[10px] uppercase tracking-wide text-driven-ink ring-1 ring-driven-warm bg-driven-accent-light px-2 py-1"
                    >
                      {doc.label}
                    </li>
                  ))}
                </ul>
              ) : null}
            </li>
          ))}
        </ul>
        {showUploadHint ? (
          <div className="mt-8 border border-dashed border-driven-muted px-4 py-6 text-center font-[family-name:var(--font-driven-mono)] text-xs text-driven-muted">
            + Add history entry — upload invoices, photos, or documents from your garage.
          </div>
        ) : null}
      </div>
    </section>
  );
}

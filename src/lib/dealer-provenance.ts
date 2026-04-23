/**
 * Seller-uploaded evidence for dealer listings (Piece Passport™).
 * Stored on Listing.dealerProvenanceDocuments as JSON.
 */
export const MAX_DEALER_PROVENANCE_DOCUMENTS = 20;

export type DealerProvenanceDocument = {
  url: string;
  label: string;
  fileName: string;
  kind: "image" | "pdf" | "other";
};

function isHttpsUrl(s: string): boolean {
  try {
    const u = new URL(s);
    return u.protocol === "https:";
  } catch {
    return false;
  }
}

function inferKindFromUrl(url: string): "image" | "pdf" | "other" {
  const u = url.toLowerCase();
  if (u.includes(".pdf") || u.endsWith("pdf")) return "pdf";
  if (u.match(/\.(jpe?g|png|gif|webp|avif)($|\?|#)/)) return "image";
  return "other";
}

/**
 * Sanitise JSON posted from the listing form (hidden field).
 */
export function parseDealerProvenanceDocumentsFromFormJson(
  raw: string
): DealerProvenanceDocument[] {
  if (!raw.trim()) return [];
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw) as unknown;
  } catch {
    return [];
  }
  if (!Array.isArray(parsed)) return [];
  const out: DealerProvenanceDocument[] = [];
  for (const item of parsed) {
    if (!item || typeof item !== "object") continue;
    const o = item as Record<string, unknown>;
    const url = typeof o.url === "string" ? o.url.trim() : "";
    if (!isHttpsUrl(url)) continue;
    const fileName = typeof o.fileName === "string" ? o.fileName.trim().slice(0, 200) : "";
    let label = typeof o.label === "string" ? o.label.trim().slice(0, 120) : "";
    if (!label) label = fileName || "Document";
    const kindRaw = o.kind;
    const kind: DealerProvenanceDocument["kind"] =
      kindRaw === "image" || kindRaw === "pdf" || kindRaw === "other"
        ? kindRaw
        : inferKindFromUrl(url);
    out.push({ url, label, fileName, kind });
    if (out.length >= MAX_DEALER_PROVENANCE_DOCUMENTS) break;
  }
  return out;
}

/** Normalise server-stored JSON for public UIs. */
export function coalesceDealerProvenanceDocuments(
  raw: unknown
): DealerProvenanceDocument[] {
  if (raw == null) return [];
  if (typeof raw === "string") {
    return parseDealerProvenanceDocumentsFromFormJson(raw);
  }
  if (Array.isArray(raw)) {
    return parseDealerProvenanceDocumentsFromFormJson(JSON.stringify(raw));
  }
  return [];
}

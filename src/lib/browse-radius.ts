/** Browse search radius: 10–200 miles, or nationwide (no distance cap). Shared by server + client. */

export type ParsedBrowseRadius = { miles: number; nationwide: boolean };

export function parseBrowseRadiusParam(raw: string | undefined): ParsedBrowseRadius {
  const t = (raw ?? "").trim().toLowerCase();
  if (t === "nationwide") return { miles: 200, nationwide: true };
  const n = parseInt((raw ?? "").trim(), 10);
  if (!Number.isFinite(n)) return { miles: 50, nationwide: false };
  return { miles: Math.min(200, Math.max(10, n)), nationwide: false };
}

/** Range input uses 10–200 = miles; 201 = Nationwide. */
export function browseRadiusSliderFromParam(raw: string | undefined): number {
  const { miles, nationwide } = parseBrowseRadiusParam(raw);
  return nationwide ? 201 : miles;
}

export function browseRadiusQueryFromSlider(sliderValue: number): string {
  if (sliderValue >= 201) return "nationwide";
  return String(Math.min(200, Math.max(10, sliderValue)));
}

export function browseRadiusLabel(sliderValue: number): string {
  if (sliderValue >= 201) return "Nationwide";
  return `${sliderValue} miles`;
}

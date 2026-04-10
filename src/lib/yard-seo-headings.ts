/** Server-side H1/H2 for yard public profile (yard does not edit H1 string directly). */
export function yardPublicHeadings(input: {
  businessName: string | null;
  displayName: string;
  postcodeLocality: string | null;
  adminDistrict: string | null;
  region: string | null;
  primaryMaterials: string[];
}): { h1: string; h2: string } {
  const titleName = input.businessName?.trim() || input.displayName.trim() || "Reclamation yard";
  const place =
    [input.postcodeLocality?.trim(), input.adminDistrict?.trim()].filter(Boolean).join(", ") ||
    input.region?.trim() ||
    "";
  const mats = input.primaryMaterials.map((m) => m.trim()).filter(Boolean).slice(0, 3);
  const matPhrase = mats.length ? mats.join(" · ") : "Reclaimed & salvage materials";
  const h2 = place ? `${matPhrase} · ${place}` : `${matPhrase} · UK`;
  return { h1: titleName, h2 };
}

import type { DrivenEntryCategory } from "@/generated/prisma/client";

/** Timeline dot colours (flat, spec-aligned). */
export function drivenLineageCategoryColor(category: DrivenEntryCategory): string {
  switch (category) {
    case "FACTORY":
      return "#1a1814";
    case "OWNERSHIP":
      return "#3a6aba";
    case "SERVICE":
    case "BODYWORK":
      return "#8a6a2a";
    case "RESTORATION":
      return "#5a3a8a";
    case "COMPETITION":
      return "#993c1d";
    case "DOCUMENT":
    default:
      return "#7a756d";
  }
}

import type { MetadataRoute } from "next";

const ICON =
  "https://thereclaimedcompany.com/wp-content/uploads/2022/09/the-reclaimed-company-logo-1-1.webp";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Reclaimed Marketplace",
    short_name: "Reclaimed",
    description:
      "Find reclamation yards, buy reclaimed materials and architectural salvage, list items, and run auctions.",
    start_url: "/",
    display: "standalone",
    background_color: "#fafaf9",
    theme_color: "#0f766e",
    icons: [
      { src: ICON, type: "image/webp", sizes: "192x192", purpose: "any" },
      { src: ICON, type: "image/webp", sizes: "512x512", purpose: "any" },
    ],
  };
}

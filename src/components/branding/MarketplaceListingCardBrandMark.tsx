const LOGO_SRC = "/images/the-reclaimed-company-logo.png";

/**
 * Decorative mark for marketplace listing tiles (card body, below hero image).
 * Uses a light backing so the teal logo stays visible on white cards and on dark overlays.
 */
export function MarketplaceListingCardBrandMark() {
  return (
    <div
      className="pointer-events-none absolute right-2 top-2 z-20 rounded-lg bg-white p-1 shadow-md ring-1 ring-zinc-200/90"
      aria-hidden
    >
      {/* eslint-disable-next-line @next/next/no-img-element -- small static mark; avoids image optimizer edge cases */}
      <img
        src={LOGO_SRC}
        alt=""
        width={40}
        height={40}
        loading="lazy"
        decoding="async"
        className="block h-9 w-9 object-contain"
      />
    </div>
  );
}

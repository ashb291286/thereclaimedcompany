import Image from "next/image";

const LOGO_SRC = "/images/the-reclaimed-company-logo.png";

/** Decorative mark for marketplace listing tiles (card body, below hero image). */
export function MarketplaceListingCardBrandMark() {
  return (
    <div
      className="pointer-events-none absolute right-2 top-2 z-10 drop-shadow-[0_1px_2px_rgba(0,0,0,0.15)]"
      aria-hidden
    >
      <Image
        src={LOGO_SRC}
        alt=""
        width={36}
        height={36}
        className="h-9 w-9 object-contain opacity-[0.92]"
      />
    </div>
  );
}

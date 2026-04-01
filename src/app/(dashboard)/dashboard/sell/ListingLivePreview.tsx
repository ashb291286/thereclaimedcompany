import Image from "next/image";
import type { ListingKind } from "@/generated/prisma/client";

export type ListingLivePreviewProps = {
  images: string[];
  title: string;
  description: string;
  categoryName: string;
  conditionLabel: string;
  listingKind: ListingKind;
  freeToCollector: boolean;
  priceLine: string;
  locationLine: string;
  auctionEndsLine: string | null;
  collectionLine: string;
  deliveryLines: string[];
  extraDeliveryNotes: string;
  sellerDisplayName?: string;
  /** Seller-only note in dashboard preview (e.g. reserve). */
  auctionReserveSellerNote?: string | null;
};

export function ListingLivePreview({
  images,
  title,
  description,
  categoryName,
  conditionLabel,
  listingKind,
  freeToCollector,
  priceLine,
  locationLine,
  auctionEndsLine,
  collectionLine,
  deliveryLines,
  extraDeliveryNotes,
  sellerDisplayName,
  auctionReserveSellerNote,
}: ListingLivePreviewProps) {
  const excerpt =
    description.trim().length > 0
      ? description.trim().length > 220
        ? `${description.trim().slice(0, 217)}…`
        : description.trim()
      : "Your description will show here so buyers know what they’re getting.";

  const showDelivers = deliveryLines.length > 0;

  return (
    <div className="rounded-xl border border-zinc-200 bg-white shadow-sm ring-1 ring-zinc-100">
      <div className="border-b border-zinc-100 px-3 py-2">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
          Buyer preview
        </p>
      </div>
      <div className="relative aspect-square bg-zinc-200">
        {images[0] ? (
          <Image
            src={images[0]}
            alt=""
            fill
            className="object-cover"
            sizes="360px"
            unoptimized
          />
        ) : (
          <div className="flex h-full w-full flex-col items-center justify-center gap-1 p-4 text-center text-sm text-zinc-500">
            <span className="text-2xl text-zinc-400">+</span>
            Add a photo to see it here
          </div>
        )}
      </div>
      <div className="p-3">
        <div className="mb-1 flex flex-wrap gap-1">
          {listingKind === "auction" && (
            <span className="rounded bg-brand-soft px-1.5 py-0.5 text-[10px] font-bold uppercase text-brand">
              Auction
            </span>
          )}
          {listingKind === "sell" && freeToCollector && (
            <span className="rounded bg-emerald-100 px-1.5 py-0.5 text-[10px] font-bold uppercase text-emerald-900">
              Free
            </span>
          )}
          {showDelivers && (
            <span className="rounded bg-sky-100 px-1.5 py-0.5 text-[10px] font-bold uppercase text-sky-900">
              Delivers
            </span>
          )}
        </div>
        <p className="line-clamp-2 font-medium text-zinc-900">
          {title.trim() || "Listing title"}
        </p>
        <p className="mt-1 text-sm font-medium text-zinc-900">{priceLine}</p>
        {auctionEndsLine && (
          <p className="mt-0.5 text-xs text-zinc-600">{auctionEndsLine}</p>
        )}
        {listingKind === "auction" && auctionReserveSellerNote ? (
          <p className="mt-1 text-xs text-amber-800">{auctionReserveSellerNote}</p>
        ) : null}
        <p className="mt-1 text-sm text-zinc-500">
          {categoryName || "Category"} · {conditionLabel}
        </p>
        {locationLine ? (
          <p className="mt-2 text-xs text-zinc-600">
            <span className="font-medium text-zinc-700">Location</span> · {locationLine}
          </p>
        ) : null}
        <div className="mt-3 rounded-lg border border-zinc-100 bg-zinc-50/80 px-2.5 py-2 text-xs text-zinc-700">
          <p className="font-medium text-zinc-800">Collection &amp; delivery</p>
          <p className="mt-1 text-zinc-600">{collectionLine}</p>
          {deliveryLines.length > 0 && (
            <ul className="mt-1.5 space-y-0.5 border-t border-zinc-200/80 pt-1.5">
              {deliveryLines.map((line, i) => (
                <li key={i} className="text-zinc-600">
                  · {line}
                </li>
              ))}
            </ul>
          )}
          {extraDeliveryNotes.trim() ? (
            <p className="mt-1.5 whitespace-pre-wrap border-t border-zinc-200/80 pt-1.5 text-zinc-600">
              {extraDeliveryNotes.trim()}
            </p>
          ) : null}
        </div>
        <p className="mt-3 text-sm leading-relaxed text-zinc-700">{excerpt}</p>
        {sellerDisplayName ? (
          <p className="mt-3 border-t border-zinc-100 pt-2 text-xs text-zinc-500">
            Seller: <span className="font-medium text-zinc-700">{sellerDisplayName}</span>
          </p>
        ) : null}
      </div>
    </div>
  );
}

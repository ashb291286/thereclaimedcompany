import Image from "next/image";
import Link from "next/link";
import { publicSellerPath } from "@/lib/yard-public-path";
import type { SearchListingRow } from "@/lib/listing-search";

const DEFAULT_AVATAR = "/images/dealer-fallback.png";

function sellerDisplayName(l: SearchListingRow): string {
  const sp = l.seller.sellerProfile;
  return (sp?.businessName?.trim() || sp?.displayName?.trim() || "Seller") as string;
}

function sellerAvatarSrc(l: SearchListingRow): string {
  const sp = l.seller.sellerProfile;
  if (sp?.yardLogoUrl?.trim()) return sp.yardLogoUrl.trim();
  if (l.seller.role === "individual" && l.seller.image?.trim()) return l.seller.image.trim();
  if (sp?.yardHeaderImageUrl?.trim()) return sp.yardHeaderImageUrl.trim();
  return DEFAULT_AVATAR;
}

export function ListingCardSellerAttribution({ listing: l }: { listing: SearchListingRow }) {
  const name = sellerDisplayName(l);
  const href = publicSellerPath({
    sellerId: l.sellerId,
    role: l.seller.role,
    yardSlug: l.seller.sellerProfile?.yardSlug,
  });
  const avatar = sellerAvatarSrc(l);
  const { sellerReviewAvg: avg, sellerReviewCount: count } = l;

  return (
    <div className="mt-2.5 border-t border-zinc-100 pt-2.5">
      <Link
        href={href}
        className="flex min-h-[44px] items-center gap-2.5 rounded-lg -mx-0.5 px-0.5 py-0.5 transition hover:bg-zinc-50"
      >
        <div className="relative h-9 w-9 shrink-0 overflow-hidden rounded-full border border-zinc-200/90 bg-zinc-100">
          <Image
            src={avatar}
            alt=""
            fill
            className="object-cover"
            sizes="36px"
            unoptimized
          />
        </div>
        <div className="min-w-0 flex-1 text-left">
          <p className="truncate text-sm font-medium leading-tight text-zinc-900">{name}</p>
          {avg != null && count > 0 ? (
            <p className="mt-0.5 text-xs leading-tight text-zinc-500">
              <span className="text-amber-500" aria-hidden>
                ★
              </span>{" "}
              <span className="font-medium text-zinc-700">{avg.toFixed(1)}</span>
              <span className="text-zinc-400"> · </span>
              <span>
                {count} review{count === 1 ? "" : "s"}
              </span>
            </p>
          ) : (
            <p className="mt-0.5 text-xs text-zinc-400">No reviews yet</p>
          )}
        </div>
      </Link>
    </div>
  );
}

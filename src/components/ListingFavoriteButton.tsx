"use client";

import { toggleListingFavorite } from "@/lib/actions/listing-favorites";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useTransition } from "react";

export function ListingFavoriteButton({
  listingId,
  initialFavorited,
  isLoggedIn,
  isOwner,
}: {
  listingId: string;
  initialFavorited: boolean;
  isLoggedIn: boolean;
  isOwner: boolean;
}) {
  const pathname = usePathname();
  const [favorited, setFavorited] = useState(initialFavorited);
  const [pending, startTransition] = useTransition();

  if (isOwner) {
    return (
      <span
        className="shrink-0 rounded-full border border-zinc-200 bg-zinc-50 px-2.5 py-1.5 text-xs text-zinc-500"
        title="Your listing"
      >
        Your listing
      </span>
    );
  }

  if (!isLoggedIn) {
    const callback = encodeURIComponent(pathname || `/listings/${listingId}`);
    return (
      <Link
        href={`/auth/signin?callbackUrl=${callback}`}
        className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-zinc-200 bg-white px-2.5 py-1.5 text-xs font-medium text-zinc-700 shadow-sm hover:border-brand/40 hover:text-brand"
        title="Sign in to save favourites"
      >
        <HeartIcon filled={false} />
        Save
      </Link>
    );
  }

  function onClick() {
    startTransition(async () => {
      const res = await toggleListingFavorite(listingId);
      if (res.ok) setFavorited(res.favorited);
    });
  }

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={pending}
      className={`inline-flex shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-1.5 text-xs font-medium shadow-sm transition disabled:opacity-60 ${
        favorited
          ? "border-rose-200 bg-rose-50 text-rose-800 hover:border-rose-300"
          : "border-zinc-200 bg-white text-zinc-700 hover:border-brand/40 hover:text-brand"
      }`}
      title={favorited ? "Remove from favourites" : "Save to favourites"}
      aria-pressed={favorited}
    >
      <HeartIcon filled={favorited} />
      {favorited ? "Saved" : "Save"}
    </button>
  );
}

function HeartIcon({ filled }: { filled: boolean }) {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill={filled ? "currentColor" : "none"}
      stroke="currentColor"
      strokeWidth="2"
      className={filled ? "text-rose-600" : "text-zinc-500"}
      aria-hidden
    >
      <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
    </svg>
  );
}

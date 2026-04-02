"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { declineListingLocalYardAlert } from "@/lib/actions/local-yard-alerts";

export function NearbyStockActions({
  alertId,
  listingId,
  showOffer,
}: {
  alertId: string;
  listingId: string;
  showOffer: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  return (
    <div className="flex flex-wrap gap-2">
      {showOffer ? (
        <Link
          href={`/listings/${listingId}#listing-offer`}
          className="rounded-lg bg-zinc-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-zinc-800"
        >
          Make offer
        </Link>
      ) : null}
      {showOffer ? (
        <button
          type="button"
          disabled={pending}
          onClick={() =>
            startTransition(async () => {
              await declineListingLocalYardAlert(alertId);
              router.refresh();
            })
          }
          className="rounded-lg border border-zinc-300 bg-white px-3 py-1.5 text-sm font-medium text-zinc-800 hover:bg-zinc-50 disabled:opacity-50"
        >
          {pending ? "…" : "Pass"}
        </button>
      ) : null}
    </div>
  );
}

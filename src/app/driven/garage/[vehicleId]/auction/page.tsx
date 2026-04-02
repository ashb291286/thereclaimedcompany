import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { createDrivenAuctionFromGarageAction } from "@/app/driven/actions";
import { STRIPE_MIN_AMOUNT_PENCE } from "@/lib/constants";

const MIN_GBP = (STRIPE_MIN_AMOUNT_PENCE / 100).toFixed(2);

const ERROR_MESSAGES: Record<string, string> = {
  "missing-fields": "Reserve, starting bid, and end date are required.",
  "invalid-end": "Choose an end date and time in the future.",
  "invalid-amounts": `Reserve and starting bid must be at least £${MIN_GBP} each.`,
  "reserve-below-start": "Reserve must be greater than or equal to the starting bid.",
  "already-listed": "This vehicle already has an auction listing.",
  "not-private": "Only vehicles that are not already listed can be sent to auction.",
};

type Props = {
  params: Promise<{ vehicleId: string }>;
  searchParams: Promise<{ error?: string }>;
};

export default async function DrivenGarageAuctionPage({ params, searchParams }: Props) {
  const { vehicleId } = await params;
  const sp = await searchParams;
  const session = await auth();
  if (!session?.user?.id) {
    redirect(`/auth/signin?callbackUrl=${encodeURIComponent(`/driven/garage/${vehicleId}/auction`)}`);
  }

  const vehicle = await prisma.drivenVehicle.findFirst({
    where: { id: vehicleId, ownerId: session.user.id },
    include: { auction: true },
  });
  if (!vehicle) notFound();

  const errorKey = sp.error;
  const error = errorKey ? (ERROR_MESSAGES[errorKey] ?? errorKey) : null;

  const canList =
    vehicle.status === "PRIVATE" && !vehicle.auction;

  const defaultEnds = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  const defaultEndsLocal = new Date(defaultEnds.getTime() - defaultEnds.getTimezoneOffset() * 60000)
    .toISOString()
    .slice(0, 16);

  return (
    <div>
      <nav className="font-[family-name:var(--font-driven-mono)] text-[10px] uppercase tracking-wide text-driven-muted">
        <Link href="/driven/garage" className="hover:text-driven-ink">
          Garage
        </Link>
        <span className="mx-2">/</span>
        <Link href={`/driven/garage/${vehicleId}/record`} className="hover:text-driven-ink">
          {vehicle.registration}
        </Link>
        <span className="mx-2">/</span>
        <span className="text-driven-ink">List for auction</span>
      </nav>

      <header className="mt-6">
        <h1 className="font-[family-name:var(--font-driven-display)] text-3xl italic text-driven-ink">
          Send to Driven auction
        </h1>
        <p className="mt-2 max-w-xl text-sm text-driven-muted">
          {vehicle.year} {vehicle.make} {vehicle.model} · {vehicle.registration}
        </p>
        <p className="mt-1 font-[family-name:var(--font-driven-mono)] text-xs text-driven-muted">
          Reclaimed ID {vehicle.reclaimedPublicId}
        </p>
      </header>

      {!canList ? (
        <div className="mt-8 border border-driven-warm bg-white p-6 text-sm text-driven-muted">
          {vehicle.auction ? (
            <>
              This vehicle is already listed.{" "}
              <Link href={`/driven/auctions/${vehicle.auction.id}`} className="text-driven-accent underline">
                Open auction
              </Link>
            </>
          ) : (
            <>This vehicle cannot be listed for auction in its current state.</>
          )}
        </div>
      ) : (
        <form
          action={createDrivenAuctionFromGarageAction}
          className="mx-auto mt-10 max-w-lg space-y-6 border border-driven-warm bg-white p-6"
        >
          {error ? (
            <p className="font-[family-name:var(--font-driven-mono)] text-xs text-driven-accent">{error}</p>
          ) : null}
          <input type="hidden" name="vehicleId" value={vehicleId} />

          <div>
            <label
              htmlFor="startingPounds"
              className="font-[family-name:var(--font-driven-mono)] text-[10px] uppercase text-driven-muted"
            >
              Starting bid (£)
            </label>
            <input
              id="startingPounds"
              name="startingPounds"
              type="number"
              step="0.01"
              min={MIN_GBP}
              required
              className="mt-1 w-full border border-driven-warm bg-driven-paper px-3 py-2 text-sm"
            />
            <p className="mt-1 text-xs text-driven-muted">Minimum £{MIN_GBP}.</p>
          </div>

          <div>
            <label
              htmlFor="reservePounds"
              className="font-[family-name:var(--font-driven-mono)] text-[10px] uppercase text-driven-muted"
            >
              Reserve (£)
            </label>
            <input
              id="reservePounds"
              name="reservePounds"
              type="number"
              step="0.01"
              min={MIN_GBP}
              required
              className="mt-1 w-full border border-driven-warm bg-driven-paper px-3 py-2 text-sm"
            />
            <p className="mt-1 text-xs text-driven-muted">Must be at least the starting bid. Minimum £{MIN_GBP}.</p>
          </div>

          <div>
            <label
              htmlFor="auctionEndsAt"
              className="font-[family-name:var(--font-driven-mono)] text-[10px] uppercase text-driven-muted"
            >
              Auction ends
            </label>
            <input
              id="auctionEndsAt"
              name="auctionEndsAt"
              type="datetime-local"
              required
              defaultValue={defaultEndsLocal}
              className="mt-1 w-full border border-driven-warm bg-driven-paper px-3 py-2 text-sm"
            />
          </div>

          <button
            type="submit"
            className="w-full border border-driven-ink bg-driven-ink py-3 font-[family-name:var(--font-driven-mono)] text-xs uppercase tracking-wide text-driven-paper"
          >
            Create listing
          </button>
        </form>
      )}
    </div>
  );
}

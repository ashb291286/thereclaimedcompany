import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { addPropUnavailabilityAction, updatePropRentalBookingStatusAction } from "@/lib/actions/prop-yard";

type Props = {
  params: Promise<{ offerId: string }>;
  searchParams: Promise<{ error?: string }>;
};

export default async function PropOfferCalendarPage({ params, searchParams }: Props) {
  const session = await auth();
  if (!session?.user?.id) redirect("/auth/signin");
  const { offerId } = await params;
  const { error } = await searchParams;

  const offer = await prisma.propRentalOffer.findFirst({
    where: { id: offerId, listing: { sellerId: session.user.id } },
    include: {
      listing: { select: { title: true } },
      bookings: {
        orderBy: { hireStart: "asc" },
        include: { hirer: { select: { email: true, name: true } } },
      },
      unavailability: { orderBy: { startDate: "asc" } },
    },
  });
  if (!offer) notFound();

  return (
    <div>
      <Link href="/dashboard/prop-yard" className="text-sm text-brand hover:underline">
        ← Prop Yard dashboard
      </Link>
      <h1 className="mt-4 text-2xl font-semibold text-zinc-900">Availability · {offer.listing.title}</h1>
      <p className="mt-2 text-sm text-zinc-600">
        Hire requests and manual blocks prevent double-booking when productions submit dates.
      </p>

      {error ? (
        <p className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{decodeURIComponent(error)}</p>
      ) : null}

      <section className="mt-8 rounded-xl border border-zinc-200 bg-white p-5">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500">Hire requests &amp; bookings</h2>
        {offer.bookings.length === 0 ? (
          <p className="mt-3 text-sm text-zinc-600">None yet.</p>
        ) : (
          <ul className="mt-3 divide-y divide-zinc-100">
            {offer.bookings.map((b) => (
              <li key={b.id} className="py-3 text-sm">
                <p className="font-medium text-zinc-900">
                  {b.hireStart.toLocaleDateString("en-GB")} → {b.hireEnd.toLocaleDateString("en-GB")}{" "}
                  <span className="text-zinc-500">({b.billableWeeks} wk · £{(b.totalHirePence / 100).toFixed(2)})</span>
                </p>
                <p className="text-zinc-600">
                  {b.status} · {b.fulfillment.replaceAll("_", " ").toLowerCase()}
                </p>
                <p className="text-xs text-zinc-500">
                  {b.hirerOrgName} · {b.hirer.email ?? b.hirer.name ?? b.hirerId}
                </p>
                <form action={updatePropRentalBookingStatusAction} className="mt-2 flex flex-wrap items-center gap-2">
                  <input type="hidden" name="bookingId" value={b.id} />
                  <label className="text-xs text-zinc-500">Status</label>
                  <select
                    name="status"
                    defaultValue={b.status}
                    className="rounded-lg border border-zinc-300 px-2 py-1 text-xs"
                  >
                    <option value="REQUESTED">Requested</option>
                    <option value="CONFIRMED">Confirmed</option>
                    <option value="OUT_ON_HIRE">Out on hire</option>
                    <option value="RETURNED">Returned</option>
                    <option value="CANCELLED">Cancelled</option>
                    <option value="DECLINED">Declined</option>
                  </select>
                  <button
                    type="submit"
                    className="rounded-lg border border-zinc-300 px-2 py-1 text-xs font-medium hover:bg-zinc-50"
                  >
                    Update
                  </button>
                </form>
                {b.status === "OUT_ON_HIRE" ? (
                  <p className="mt-1 text-xs text-amber-800">
                    If this listing was on the marketplace, it stays hidden from browse until no bookings are{" "}
                    <strong>Out on hire</strong>.
                  </p>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="mt-6 rounded-xl border border-zinc-200 bg-white p-5">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500">Blocked dates (maintenance / hold)</h2>
        {offer.unavailability.length === 0 ? (
          <p className="mt-3 text-sm text-zinc-600">No extra blocks.</p>
        ) : (
          <ul className="mt-3 text-sm text-zinc-700">
            {offer.unavailability.map((u) => (
              <li key={u.id}>
                {u.startDate.toLocaleDateString("en-GB")} – {u.endDate.toLocaleDateString("en-GB")}
                {u.note ? ` — ${u.note}` : ""}
              </li>
            ))}
          </ul>
        )}

        <form action={addPropUnavailabilityAction} className="mt-6 space-y-3 border-t border-zinc-100 pt-5">
          <input type="hidden" name="offerId" value={offer.id} />
          <p className="text-xs font-medium text-zinc-700">Add blackout</p>
          <div className="flex flex-wrap gap-3">
            <div>
              <label className="block text-xs text-zinc-500">From</label>
              <input type="date" name="startDate" required className="rounded-lg border border-zinc-300 px-2 py-1 text-sm" />
            </div>
            <div>
              <label className="block text-xs text-zinc-500">To</label>
              <input type="date" name="endDate" required className="rounded-lg border border-zinc-300 px-2 py-1 text-sm" />
            </div>
          </div>
          <input
            name="note"
            placeholder="Optional note"
            className="w-full max-w-md rounded-lg border border-zinc-300 px-3 py-2 text-sm"
          />
          <button
            type="submit"
            className="rounded-lg border border-zinc-300 px-3 py-1.5 text-sm font-medium hover:bg-zinc-50"
          >
            Save block
          </button>
        </form>
      </section>
    </div>
  );
}

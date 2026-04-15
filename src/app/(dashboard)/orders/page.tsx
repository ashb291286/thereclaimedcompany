import { auth } from "@/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/db";
import {
  confirmOrderCollectionAction,
  confirmOrderReceiptAction,
  confirmOrderShipmentAction,
  leaveOrderReviewAction,
  setOrderFulfillmentPlanAction,
} from "@/lib/actions/order-fulfillment";

export default async function OrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ session_id?: string; collected?: string; updated?: string; error?: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect("/auth/signin");
  const { session_id, collected, updated, error } = await searchParams;

  const boughtOrders = await prisma.order.findMany({
    where: { buyerId: session.user.id, status: "paid" },
    orderBy: { createdAt: "desc" },
    take: 40,
    include: { listing: { select: { id: true, title: true, status: true } }, seller: { select: { email: true } } },
  });
  const soldOrders = await prisma.order.findMany({
    where: { sellerId: session.user.id, status: "paid" },
    orderBy: { createdAt: "desc" },
    take: 40,
    include: { listing: { select: { id: true, title: true, status: true } }, buyer: { select: { email: true } } },
  });

  const totalCarbonKg = boughtOrders.reduce((s, o) => s + (o.purchaseCarbonSavedKg ?? 0), 0);
  const totalWasteKg = boughtOrders.reduce((s, o) => s + (o.purchaseWasteDivertedKg ?? 0), 0);
  const showImpact = totalCarbonKg > 0 || totalWasteKg > 0;

  return (
    <div>
      <h1 className="text-2xl font-semibold text-zinc-900">Orders</h1>

      {session_id ? (
        <p className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50/90 px-4 py-3 text-sm text-emerald-950">
          Thank you for your purchase. Your payment was received — the seller will be in touch about collection or
          delivery.
        </p>
      ) : null}
      {collected === "1" ? (
        <p className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50/90 px-4 py-3 text-sm text-emerald-950">
          Collection confirmed. Enjoy your reclaimed item.
        </p>
      ) : null}
      {updated ? (
        <p className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50/90 px-4 py-3 text-sm text-emerald-950">
          Order updated: {updated}.
        </p>
      ) : null}
      {error ? (
        <p className="mt-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-900">
          {error}
        </p>
      ) : null}

      {showImpact ? (
        <div className="mt-6 rounded-2xl border border-emerald-200/80 bg-gradient-to-br from-emerald-50 via-white to-teal-50/90 p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-emerald-800/90">Your impact (purchases)</p>
          <p className="mt-2 text-sm text-zinc-800">
            <strong>{totalCarbonKg.toLocaleString(undefined, { maximumFractionDigits: 1 })} kg</strong> CO₂e estimated
            avoided vs new production
            {totalWasteKg > 0 ? (
              <>
                {" "}
                · <strong>{totalWasteKg.toLocaleString(undefined, { maximumFractionDigits: 1 })} kg</strong> mass kept
                in use
              </>
            ) : null}
          </p>
          <Link
            href="/dashboard/certificate"
            className="mt-3 inline-block text-sm font-medium text-emerald-800 underline hover:text-emerald-950"
          >
            View printable certificate
          </Link>
        </div>
      ) : null}

      <h2 className="mt-8 text-sm font-semibold uppercase tracking-wide text-zinc-500">Recent purchases</h2>
      {boughtOrders.length === 0 ? (
        <p className="mt-3 text-sm text-zinc-600">
          No completed orders yet.{" "}
          <Link href="/search" className="font-medium text-brand hover:underline">
            Browse listings
          </Link>
        </p>
      ) : (
        <ul className="mt-3 space-y-3">
          {boughtOrders.map((o) => (
            <li
              key={o.id}
              className="flex flex-wrap items-start justify-between gap-2 rounded-xl border border-zinc-200 bg-white p-4"
            >
              <div>
                {o.listing.status === "active" ? (
                  <Link
                    href={`/listings/${o.listing.id}`}
                    className="font-medium text-zinc-900 hover:underline"
                  >
                    {o.listing.title}
                  </Link>
                ) : (
                  <span className="font-medium text-zinc-900">{o.listing.title}</span>
                )}
                <p className="text-xs text-zinc-500">
                  {o.createdAt.toLocaleDateString("en-GB", { dateStyle: "medium" })}
                  {o.quantity > 1 ? ` · ×${o.quantity}` : ""}
                  {o.amount > 0 ? ` · £${(o.amount / 100).toFixed(2)}` : " · Free collection"}
                </p>
                {o.purchaseCarbonSavedKg != null && o.purchaseCarbonSavedKg > 0 ? (
                  <p className="mt-1 text-xs text-emerald-800">
                    ~{o.purchaseCarbonSavedKg.toLocaleString(undefined, { maximumFractionDigits: 1 })} kg CO₂e saved
                    (estimate)
                  </p>
                ) : null}
                <p className="mt-1 text-xs text-zinc-600">
                  Seller: {o.seller.email || o.sellerId} · Flow: {o.fulfillmentMethod || "awaiting seller plan"}
                </p>
              </div>
              <div className="w-full rounded-lg border border-zinc-200 bg-zinc-50 p-3 text-xs text-zinc-700 sm:w-auto sm:min-w-[300px]">
                {o.fulfillmentMethod === "collection" ? (
                  <>
                    <p>
                      Collection slot:{" "}
                      {o.collectionAgreedAt
                        ? o.collectionAgreedAt.toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" })
                        : "Awaiting seller confirmation"}
                    </p>
                    <p>
                      Seller confirmed: {o.collectionConfirmedBySellerAt ? "Yes" : "No"} · You confirmed:{" "}
                      {o.collectionConfirmedByBuyerAt ? "Yes" : "No"}
                    </p>
                    {!o.collectionConfirmedByBuyerAt ? (
                      <form action={confirmOrderCollectionAction} className="mt-2">
                        <input type="hidden" name="orderId" value={o.id} />
                        <button type="submit" className="rounded border border-zinc-300 px-2 py-1 hover:bg-zinc-100">
                          Confirm collected
                        </button>
                      </form>
                    ) : null}
                  </>
                ) : o.fulfillmentMethod === "shipping" ? (
                  <>
                    <p>Courier: {o.shippingCourier || "Awaiting seller update"}</p>
                    <p>Tracking: {o.shippingTrackingRef || "Awaiting tracking"}</p>
                    <p>
                      Dispatched: {o.shippingConfirmedAt ? "Yes" : "No"} · Received:{" "}
                      {o.deliveryConfirmedAt ? "Yes" : "No"}
                    </p>
                    {o.shippingConfirmedAt && !o.deliveryConfirmedAt ? (
                      <form action={confirmOrderReceiptAction} className="mt-2">
                        <input type="hidden" name="orderId" value={o.id} />
                        <button type="submit" className="rounded border border-zinc-300 px-2 py-1 hover:bg-zinc-100">
                          Confirm received
                        </button>
                      </form>
                    ) : null}
                  </>
                ) : (
                  <p>Waiting for seller to choose collection or shipping.</p>
                )}
                {(o.collectionConfirmedByBuyerAt && o.collectionConfirmedBySellerAt) ||
                (o.shippingConfirmedAt && o.deliveryConfirmedAt) ? (
                  o.buyerReviewedAt ? (
                    <p className="mt-2 text-emerald-700">
                      Review left ({o.buyerReviewRating}/5)
                      {o.buyerReviewComment ? `: ${o.buyerReviewComment}` : ""}.
                    </p>
                  ) : (
                    <form action={leaveOrderReviewAction} className="mt-2 space-y-2">
                      <input type="hidden" name="orderId" value={o.id} />
                      <label className="block">
                        <span className="mr-2">Your seller review:</span>
                        <select name="rating" defaultValue="5" className="rounded border border-zinc-300 px-1 py-1">
                          <option value="5">5</option>
                          <option value="4">4</option>
                          <option value="3">3</option>
                          <option value="2">2</option>
                          <option value="1">1</option>
                        </select>
                      </label>
                      <textarea
                        name="comment"
                        maxLength={1000}
                        rows={2}
                        placeholder="Optional review comment"
                        className="w-full rounded border border-zinc-300 px-2 py-1"
                      />
                      <button type="submit" className="rounded border border-zinc-300 px-2 py-1 hover:bg-zinc-100">
                        Leave review
                      </button>
                    </form>
                  )
                ) : null}
              </div>
            </li>
          ))}
        </ul>
      )}

      <h2 className="mt-10 text-sm font-semibold uppercase tracking-wide text-zinc-500">Orders to fulfill (as seller)</h2>
      {soldOrders.length === 0 ? (
        <p className="mt-3 text-sm text-zinc-600">No paid orders to fulfill yet.</p>
      ) : (
        <ul className="mt-3 space-y-3">
          {soldOrders.map((o) => (
            <li key={o.id} className="rounded-xl border border-zinc-200 bg-white p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="font-medium text-zinc-900">{o.listing.title}</p>
                  <p className="text-xs text-zinc-500">
                    Buyer: {o.buyer.email || o.buyerId} · {o.quantity > 1 ? `×${o.quantity} · ` : ""}
                    {o.amount > 0 ? `£${(o.amount / 100).toFixed(2)}` : "Free collection"}
                  </p>
                </div>
                <Link href={`/listings/${o.listingId}`} className="text-xs font-medium text-brand hover:underline">
                  Open listing
                </Link>
              </div>

              <div className="mt-3 grid gap-3 md:grid-cols-2">
                <form action={setOrderFulfillmentPlanAction} className="rounded-lg border border-zinc-200 p-3 text-xs">
                  <input type="hidden" name="orderId" value={o.id} />
                  <p className="font-semibold text-zinc-900">Set fulfillment plan</p>
                  <label className="mt-2 block">
                    <span>Method</span>
                    <select
                      name="method"
                      defaultValue={o.fulfillmentMethod ?? "collection"}
                      className="mt-1 w-full rounded border border-zinc-300 px-2 py-1"
                    >
                      <option value="collection">Collection</option>
                      <option value="shipping">Shipping</option>
                    </select>
                  </label>
                  <label className="mt-2 block">
                    <span>Collection date/time (if collection)</span>
                    <input
                      name="collectionDateTime"
                      type="datetime-local"
                      defaultValue={
                        o.collectionAgreedAt
                          ? new Date(o.collectionAgreedAt.getTime() - o.collectionAgreedAt.getTimezoneOffset() * 60000)
                              .toISOString()
                              .slice(0, 16)
                          : ""
                      }
                      className="mt-1 w-full rounded border border-zinc-300 px-2 py-1"
                    />
                  </label>
                  <label className="mt-2 block">
                    <span>Courier (if shipping)</span>
                    <input
                      name="courier"
                      defaultValue={o.shippingCourier ?? ""}
                      className="mt-1 w-full rounded border border-zinc-300 px-2 py-1"
                    />
                  </label>
                  <label className="mt-2 block">
                    <span>Tracking (optional)</span>
                    <input
                      name="tracking"
                      defaultValue={o.shippingTrackingRef ?? ""}
                      className="mt-1 w-full rounded border border-zinc-300 px-2 py-1"
                    />
                  </label>
                  <button type="submit" className="mt-2 rounded border border-zinc-300 px-2 py-1 hover:bg-zinc-100">
                    Save plan
                  </button>
                </form>

                <div className="rounded-lg border border-zinc-200 p-3 text-xs text-zinc-700">
                  <p className="font-semibold text-zinc-900">Confirm progress</p>
                  <p className="mt-1">Flow: {o.fulfillmentMethod || "awaiting plan"}</p>
                  {o.fulfillmentMethod === "collection" ? (
                    <>
                      <p className="mt-1">
                        Agreed slot:{" "}
                        {o.collectionAgreedAt
                          ? o.collectionAgreedAt.toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" })
                          : "Not set"}
                      </p>
                      <p className="mt-1">
                        Seller confirmed: {o.collectionConfirmedBySellerAt ? "Yes" : "No"} · Buyer confirmed:{" "}
                        {o.collectionConfirmedByBuyerAt ? "Yes" : "No"}
                      </p>
                      {!o.collectionConfirmedBySellerAt ? (
                        <form action={confirmOrderCollectionAction} className="mt-2">
                          <input type="hidden" name="orderId" value={o.id} />
                          <button type="submit" className="rounded border border-zinc-300 px-2 py-1 hover:bg-zinc-100">
                            Confirm handed over
                          </button>
                        </form>
                      ) : null}
                    </>
                  ) : o.fulfillmentMethod === "shipping" ? (
                    <>
                      <p className="mt-1">Courier: {o.shippingCourier || "Not set"}</p>
                      <p className="mt-1">Tracking: {o.shippingTrackingRef || "Not set"}</p>
                      <p className="mt-1">
                        Dispatched: {o.shippingConfirmedAt ? "Yes" : "No"} · Buyer received:{" "}
                        {o.deliveryConfirmedAt ? "Yes" : "No"}
                      </p>
                      <form action={confirmOrderShipmentAction} className="mt-2 space-y-2">
                        <input type="hidden" name="orderId" value={o.id} />
                        <input
                          name="courier"
                          defaultValue={o.shippingCourier ?? ""}
                          placeholder="Courier"
                          className="w-full rounded border border-zinc-300 px-2 py-1"
                        />
                        <input
                          name="tracking"
                          defaultValue={o.shippingTrackingRef ?? ""}
                          placeholder="Tracking"
                          className="w-full rounded border border-zinc-300 px-2 py-1"
                        />
                        <button type="submit" className="rounded border border-zinc-300 px-2 py-1 hover:bg-zinc-100">
                          Confirm dispatched
                        </button>
                      </form>
                    </>
                  ) : (
                    <p className="mt-1">Set a fulfillment plan first.</p>
                  )}
                  {(o.collectionConfirmedByBuyerAt && o.collectionConfirmedBySellerAt) ||
                  (o.shippingConfirmedAt && o.deliveryConfirmedAt) ? (
                    o.sellerReviewedAt ? (
                      <p className="mt-2 text-emerald-700">
                        Your buyer review: {o.sellerReviewRating}/5
                        {o.sellerReviewComment ? ` · ${o.sellerReviewComment}` : ""}.
                      </p>
                    ) : (
                      <form action={leaveOrderReviewAction} className="mt-2 space-y-2">
                        <input type="hidden" name="orderId" value={o.id} />
                        <label className="block">
                          <span className="mr-2">Your buyer review:</span>
                          <select name="rating" defaultValue="5" className="rounded border border-zinc-300 px-1 py-1">
                            <option value="5">5</option>
                            <option value="4">4</option>
                            <option value="3">3</option>
                            <option value="2">2</option>
                            <option value="1">1</option>
                          </select>
                        </label>
                        <textarea
                          name="comment"
                          maxLength={1000}
                          rows={2}
                          placeholder="Optional review comment"
                          className="w-full rounded border border-zinc-300 px-2 py-1"
                        />
                        <button type="submit" className="rounded border border-zinc-300 px-2 py-1 hover:bg-zinc-100">
                          Leave review
                        </button>
                      </form>
                    )
                  ) : null}
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}

      <Link href="/" className="mt-8 inline-block text-sm font-medium text-brand hover:underline">
        Continue shopping
      </Link>
    </div>
  );
}

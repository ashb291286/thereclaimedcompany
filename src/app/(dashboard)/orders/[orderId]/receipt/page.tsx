import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";

export default async function OrderReceiptPage({ params }: { params: Promise<{ orderId: string }> }) {
  const session = await auth();
  if (!session?.user?.id) redirect("/auth/signin");
  const { orderId } = await params;
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: {
      listing: { select: { id: true, title: true } },
      seller: { select: { role: true } },
    },
  });
  if (!order) notFound();
  if (session.user.id !== order.buyerId && session.user.id !== order.sellerId) notFound();

  const completed =
    (order.fulfillmentMethod === "collection" &&
      order.collectionConfirmedBySellerAt &&
      order.collectionConfirmedByBuyerAt) ||
    (order.fulfillmentMethod === "shipping" && order.shippingConfirmedAt && order.deliveryConfirmedAt);

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-8 sm:px-6">
      <h1 className="text-2xl font-semibold text-zinc-900">Order receipt</h1>
      <p className="mt-1 text-sm text-zinc-600">Order #{order.id.slice(0, 10).toUpperCase()}</p>
      <div className="mt-5 rounded-xl border border-zinc-200 bg-white p-4 text-sm text-zinc-700">
        <p className="font-medium text-zinc-900">{order.listing.title}</p>
        <p className="mt-1">Paid: £{(order.amount / 100).toFixed(2)}</p>
        <p className="mt-1">Status: {completed ? "Completed" : "In progress"}</p>
        <p className="mt-1">Flow: {order.fulfillmentMethod ?? "Awaiting seller plan"}</p>
        <div className="mt-3 flex flex-wrap gap-3">
          {order.dealerDealId ? (
            <Link href={`/dashboard/deals/${order.listing.id}?buyer=${order.buyerId}`} className="text-brand underline">
              Deal discussion
            </Link>
          ) : null}
          <Link href={`/orders/${order.id}/invoice`} className="text-brand underline">
            Invoice
          </Link>
          {order.seller.role === "dealer" ? (
            <Link href={`/orders/${order.id}/authenticity`} className="text-brand underline">
              Certificate
            </Link>
          ) : null}
        </div>
      </div>
    </div>
  );
}

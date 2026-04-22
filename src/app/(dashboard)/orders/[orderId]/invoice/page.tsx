import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";

export default async function OrderInvoicePage({ params }: { params: Promise<{ orderId: string }> }) {
  const session = await auth();
  if (!session?.user?.id) redirect("/auth/signin");
  const { orderId } = await params;
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: {
      listing: { select: { id: true, title: true } },
      buyer: { select: { email: true } },
      seller: { select: { email: true, role: true } },
      chargeBreakdown: true,
    },
  });
  if (!order) notFound();
  if (session.user.id !== order.buyerId && session.user.id !== order.sellerId) notFound();

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-8 sm:px-6">
      <h1 className="text-2xl font-semibold text-zinc-900">Invoice</h1>
      <p className="mt-1 text-sm text-zinc-600">
        Invoice #{order.chargeBreakdown?.invoiceNumber ?? `RM-${order.id.slice(0, 10).toUpperCase()}`}
      </p>
      <div className="mt-5 rounded-xl border border-zinc-200 bg-white p-4 text-sm">
        <p className="font-medium text-zinc-900">{order.listing.title}</p>
        <p className="text-zinc-600">
          Buyer: {order.buyer.email || order.buyerId} · Seller: {order.seller.email || order.sellerId}
        </p>
        <p className="mt-2 text-zinc-600">Order date: {order.createdAt.toISOString().slice(0, 10)}</p>
        <p className="text-zinc-600">Gross paid: £{(order.amount / 100).toFixed(2)}</p>
        {order.chargeBreakdown ? (
          <div className="mt-3 border-t border-zinc-200 pt-3 text-zinc-700">
            <p>Commission (net): £{(order.chargeBreakdown.commissionNetPence / 100).toFixed(2)}</p>
            <p>VAT on commission: £{(order.chargeBreakdown.commissionVatPence / 100).toFixed(2)}</p>
            <p>Stripe fee (estimate): £{(order.chargeBreakdown.stripeProcessingFeePence / 100).toFixed(2)}</p>
            <p>Digital marketplace fees: £{(order.chargeBreakdown.digitalMarketplaceFeePence / 100).toFixed(2)}</p>
            <p className="mt-1 font-medium text-zinc-900">
              Total platform fees: £{(order.chargeBreakdown.totalMarketplaceFeesPence / 100).toFixed(2)}
            </p>
            <p className="font-medium text-zinc-900">
              Seller payout: £{(order.chargeBreakdown.sellerPayoutPence / 100).toFixed(2)}
            </p>
          </div>
        ) : (
          <p className="mt-3 text-zinc-600">Fee breakdown not recorded for this legacy order.</p>
        )}
        {order.seller.role === "dealer" ? (
          <div className="mt-3 flex flex-wrap gap-3">
            {order.dealerDealId ? (
              <Link href={`/dashboard/deals/${order.listing.id}?buyer=${order.buyerId}`} className="text-brand underline">
                Deal discussion
              </Link>
            ) : null}
            <Link href={`/orders/${order.id}/receipt`} className="text-brand underline">
              Receipt
            </Link>
            <Link href={`/orders/${order.id}/authenticity`} className="text-brand underline">
              Authenticity certificate
            </Link>
          </div>
        ) : null}
      </div>
    </div>
  );
}

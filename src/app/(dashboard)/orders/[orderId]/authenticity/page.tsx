import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { createHash } from "node:crypto";
import { CertificatePrintButton } from "@/components/CertificatePrintButton";

function certificateReference(input: string) {
  const hash = createHash("sha256").update(input).digest("hex").toUpperCase();
  return `RM-DA-${hash.slice(0, 24)}`;
}

export default async function OrderAuthenticityPage({
  params,
}: {
  params: Promise<{ orderId: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect("/auth/signin");
  const { orderId } = await params;

  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: {
      listing: {
        select: {
          id: true,
          title: true,
          dimensionsW: true,
          dimensionsH: true,
          dimensionsD: true,
          propMaterials: true,
          styleTags: true,
          dateSpecific: true,
          dealerDesigner: true,
          geographicOrigin: true,
          dealerAcquisitionStory: true,
        },
      },
      seller: {
        select: {
          id: true,
          role: true,
          sellerProfile: {
            select: {
              displayName: true,
              businessName: true,
              postcode: true,
              yardSlug: true,
              salvoCodeMember: true,
            },
          },
        },
      },
    },
  });
  if (!order) notFound();
  if (session.user.id !== order.buyerId && session.user.id !== order.sellerId) notFound();
  if (order.seller.role !== "dealer") notFound();

  const dealerName =
    order.seller.sellerProfile?.businessName?.trim() ||
    order.seller.sellerProfile?.displayName?.trim() ||
    "Dealer";
  const issuedDate = order.createdAt.toLocaleDateString("en-GB", { dateStyle: "long" });
  const certRef = certificateReference(
    [
      order.id,
      order.listing.id,
      order.createdAt.toISOString(),
      order.seller.id,
      dealerName,
      order.listing.title,
    ].join("|")
  );

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-8 sm:px-6 print:bg-white">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4 print:hidden">
        <Link href="/orders" className="text-sm font-medium text-brand hover:underline">
          ← Back to orders
        </Link>
        <CertificatePrintButton />
      </div>

      <article className="rounded-2xl border border-amber-200/70 bg-gradient-to-br from-amber-50 via-white to-yellow-50 p-8 shadow-sm print:border-0 print:shadow-none">
        <p className="text-xs font-semibold uppercase tracking-[0.25em] text-amber-900/80">
          Reclaimed Marketplace
        </p>
        <h1 className="mt-2 text-2xl font-semibold text-zinc-900">Dealer Certificate of Authenticity</h1>
        <p className="mt-2 text-sm text-zinc-700">
          This certificate is issued for the purchased piece below and certified by{" "}
          <strong>{dealerName}</strong>.
        </p>

        <div className="mt-6 grid gap-3 rounded-xl border border-zinc-200 bg-white/90 p-5 text-sm sm:grid-cols-2">
          <p>
            <span className="text-zinc-500">Certificate ref</span>
            <br />
            <span className="font-mono text-xs font-semibold text-zinc-900">{certRef}</span>
          </p>
          <p>
            <span className="text-zinc-500">Issued</span>
            <br />
            <span className="font-medium text-zinc-900">{issuedDate}</span>
          </p>
          <p>
            <span className="text-zinc-500">Order ID</span>
            <br />
            <span className="font-mono text-xs text-zinc-800">{order.id}</span>
          </p>
          <p>
            <span className="text-zinc-500">Listing ID</span>
            <br />
            <span className="font-mono text-xs text-zinc-800">{order.listing.id}</span>
          </p>
          <p className="sm:col-span-2">
            <span className="text-zinc-500">Certified piece</span>
            <br />
            <span className="font-semibold text-zinc-900">{order.listing.title}</span>
          </p>
        </div>

        <div className="mt-5 grid gap-3 text-sm sm:grid-cols-2">
          {order.listing.dimensionsW != null ||
          order.listing.dimensionsH != null ||
          order.listing.dimensionsD != null ? (
            <p>
              <span className="text-zinc-500">Dimensions (W x H x D)</span>
              <br />
              <span className="font-medium text-zinc-900">
                {order.listing.dimensionsW != null ? `${order.listing.dimensionsW} cm` : "?"} x{" "}
                {order.listing.dimensionsH != null ? `${order.listing.dimensionsH} cm` : "?"} x{" "}
                {order.listing.dimensionsD != null ? `${order.listing.dimensionsD} cm` : "?"}
              </span>
            </p>
          ) : null}
          {order.listing.propMaterials[0] ? (
            <p>
              <span className="text-zinc-500">Material</span>
              <br />
              <span className="font-medium text-zinc-900">{order.listing.propMaterials[0]}</span>
            </p>
          ) : null}
          {order.listing.styleTags[0] ? (
            <p>
              <span className="text-zinc-500">Style</span>
              <br />
              <span className="font-medium text-zinc-900">{order.listing.styleTags[0]}</span>
            </p>
          ) : null}
          {order.listing.dateSpecific ? (
            <p>
              <span className="text-zinc-500">Manufacturing date</span>
              <br />
              <span className="font-medium text-zinc-900">{order.listing.dateSpecific}</span>
            </p>
          ) : null}
          {order.listing.dealerDesigner ? (
            <p>
              <span className="text-zinc-500">Designer</span>
              <br />
              <span className="font-medium text-zinc-900">{order.listing.dealerDesigner}</span>
            </p>
          ) : null}
          {order.listing.geographicOrigin ? (
            <p>
              <span className="text-zinc-500">Country of origin</span>
              <br />
              <span className="font-medium text-zinc-900">{order.listing.geographicOrigin}</span>
            </p>
          ) : null}
        </div>

        {order.listing.dealerAcquisitionStory ? (
          <div className="mt-5 rounded-xl border border-zinc-200 bg-zinc-50/80 px-4 py-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Provenance statement</p>
            <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-zinc-700">
              {order.listing.dealerAcquisitionStory}
            </p>
          </div>
        ) : null}

        <div className="mt-6 border-t border-zinc-200 pt-4 text-xs text-zinc-600">
          <p>
            Certified by {dealerName}
            {order.seller.sellerProfile?.postcode ? ` · ${order.seller.sellerProfile.postcode}` : ""}
            {order.seller.sellerProfile?.salvoCodeMember ? " · Salvo Code Member" : ""}
          </p>
          <p className="mt-1">
            This certificate reference is cryptographically generated from immutable purchase and dealer identifiers.
          </p>
        </div>
      </article>
    </div>
  );
}

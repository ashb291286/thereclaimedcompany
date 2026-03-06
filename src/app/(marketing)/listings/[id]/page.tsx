import { prisma } from "@/lib/db";
import { notFound } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { auth } from "@/auth";
import { BuyButton } from "./BuyButton";
import { CONDITION_LABELS } from "@/lib/constants";
import type { Metadata } from "next";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const listing = await prisma.listing.findUnique({
    where: { id, status: "active" },
    select: { title: true, description: true, price: true },
  });
  if (!listing) return { title: "Listing" };
  return {
    title: listing.title,
    description: listing.description.slice(0, 160),
    openGraph: {
      title: listing.title,
      description: listing.description.slice(0, 160),
    },
  };
}

export default async function ListingPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const listing = await prisma.listing.findUnique({
    where: { id },
    include: {
      category: true,
      seller: { include: { sellerProfile: true } },
    },
  });
  if (!listing || listing.status !== "active") notFound();

  const session = await auth();
  const isOwner = session?.user?.id === listing.sellerId;
  const sellerProfile = listing.seller?.sellerProfile;

  return (
    <div className="flex flex-col gap-8 lg:flex-row">
      <div className="flex-1">
        <div className="aspect-square relative rounded-xl overflow-hidden bg-zinc-200">
          {listing.images[0] ? (
            <Image
              src={listing.images[0]}
              alt={listing.title}
              fill
              className="object-cover"
              unoptimized
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-zinc-500">
              No image
            </div>
          )}
        </div>
        {listing.images.length > 1 && (
          <div className="mt-3 flex gap-2 overflow-x-auto">
            {listing.images.slice(1, 5).map((url) => (
              <div key={url} className="relative w-20 h-20 flex-shrink-0 rounded-lg overflow-hidden bg-zinc-200">
                <Image src={url} alt="" fill className="object-cover" unoptimized />
              </div>
            ))}
          </div>
        )}
      </div>
      <div className="lg:w-96">
        <h1 className="text-2xl font-semibold text-zinc-900">{listing.title}</h1>
        <p className="mt-2 text-2xl font-medium text-zinc-900">
          £{(listing.price / 100).toFixed(2)}
        </p>
        <p className="mt-1 text-sm text-zinc-500">
          {listing.category.name} · {CONDITION_LABELS[listing.condition]}
        </p>
        <p className="mt-4 text-zinc-700 whitespace-pre-wrap">{listing.description}</p>
        {!isOwner && listing.status === "active" && (
          <div className="mt-6">
            <BuyButton listingId={listing.id} />
          </div>
        )}
        {sellerProfile && (
          <div className="mt-8 rounded-xl border border-zinc-200 bg-white p-4">
            <h2 className="font-medium text-zinc-900">Seller</h2>
            <Link
              href={`/sellers/${listing.sellerId}`}
              className="mt-1 block text-amber-600 hover:underline"
            >
              {sellerProfile.displayName}
              {sellerProfile.businessName && ` · ${sellerProfile.businessName}`}
            </Link>
            <p className="mt-1 text-sm text-zinc-500">
              {sellerProfile.postcode}
              {sellerProfile.openingHours && ` · ${sellerProfile.openingHours}`}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

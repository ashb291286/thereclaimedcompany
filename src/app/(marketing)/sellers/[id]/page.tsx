import { prisma } from "@/lib/db";
import { notFound, permanentRedirect } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { CONDITION_LABELS } from "@/lib/constants";
import { OpeningHoursBlock } from "@/components/OpeningHoursBlock";

export default async function SellerPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const seller = await prisma.user.findUnique({
    where: { id },
    include: {
      sellerProfile: true,
      listings: {
        where: { status: "active", visibleOnMarketplace: true },
        orderBy: { updatedAt: "desc" },
        include: { category: true },
      },
    },
  });
  if (!seller?.sellerProfile) notFound();

  const profile = seller.sellerProfile;
  const isYard = seller.role === "reclamation_yard";

  if (isYard && profile.yardSlug) {
    permanentRedirect(`/reclamation-yard/${profile.yardSlug}`);
  }

  return (
    <div>
      <div className="rounded-xl border border-zinc-200 bg-white p-6">
        <h1 className="text-2xl font-semibold text-zinc-900">
          {profile.displayName}
          {profile.businessName && ` · ${profile.businessName}`}
        </h1>
        {isYard && (
          <span className="mt-2 inline-block rounded-full bg-brand-soft px-2.5 py-0.5 text-xs font-medium text-brand">
            Reclamation yard
          </span>
        )}
        <p className="mt-2 text-zinc-600">{profile.postcode}</p>
        {isYard || profile.openingHoursSchedule || profile.openingHours ? (
          <OpeningHoursBlock
            id="opening-hours"
            scheduleJson={profile.openingHoursSchedule}
            legacyText={profile.openingHours}
          />
        ) : null}
      </div>
      <h2 className="mt-8 text-lg font-medium text-zinc-900">Listings</h2>
      {seller.listings.length === 0 ? (
        <p className="mt-4 text-zinc-500">No active listings.</p>
      ) : (
        <ul className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {seller.listings.map((l) => (
            <li key={l.id}>
              <Link
                href={`/listings/${l.id}`}
                className="block rounded-xl border border-zinc-200 bg-white overflow-hidden hover:border-brand/40 transition-colors"
              >
                <div className="aspect-square relative bg-zinc-200">
                  {l.images[0] ? (
                    <Image
                      src={l.images[0]}
                      alt={l.title}
                      fill
                      className="object-cover"
                      sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
                      unoptimized
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-zinc-400">
                      No image
                    </div>
                  )}
                </div>
                <div className="p-3">
                  <p className="font-medium text-zinc-900 truncate">{l.title}</p>
                  <p className="text-sm text-zinc-500">
                    £{(l.price / 100).toFixed(2)} · {l.category.name}
                    {l.condition ? ` · ${CONDITION_LABELS[l.condition]}` : ""}
                  </p>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

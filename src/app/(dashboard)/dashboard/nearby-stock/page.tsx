import Link from "next/link";
import { redirect } from "next/navigation";
import Image from "next/image";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { NearbyStockActions } from "./NearbyStockActions";
import { formatMiles } from "@/lib/geo";

export const metadata = {
  title: "Nearby stock",
};

export default async function NearbyStockPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/auth/signin?callbackUrl=/dashboard/nearby-stock");

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { role: true },
  });
  if (user?.role !== "reclamation_yard") redirect("/dashboard");

  const alerts = await prisma.listingLocalYardAlert.findMany({
    where: { yardUserId: session.user.id },
    orderBy: { createdAt: "desc" },
    include: {
      listing: {
        include: { category: true },
      },
    },
  });

  const visible = alerts.filter((a) => a.listing.status === "active");

  return (
    <div>
      <h1 className="text-2xl font-semibold text-zinc-900">New stock near you</h1>
      <p className="mt-2 max-w-2xl text-sm text-zinc-600">
        Sellers who opted in have shared fixed-price listings within about 50 miles of your yard. Pass if it&apos;s
        not for you, or make an offer — same flow as on the public listing page.
      </p>

      {visible.length === 0 ? (
        <p className="mt-10 rounded-xl border border-zinc-200 bg-white p-8 text-center text-sm text-zinc-500">
          No local alerts right now. Ensure your yard postcode is saved on your profile so we can measure
          distance.
        </p>
      ) : (
        <ul className="mt-8 space-y-5">
          {visible.map((a) => {
            const l = a.listing;
            const thumb = l.images[0];
            const showOffer = a.status === "PENDING" && !a.linkedOfferId;
            const dist =
              a.distanceMiles != null ? (
                <span className="text-zinc-500"> · {formatMiles(a.distanceMiles)} from your yard</span>
              ) : null;

            return (
              <li
                key={a.id}
                className="overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm sm:flex"
              >
                <Link
                  href={`/listings/${l.id}`}
                  className="relative block h-44 w-full shrink-0 bg-zinc-100 sm:h-auto sm:min-h-[10rem] sm:w-44"
                >
                  {thumb ? (
                    <Image src={thumb} alt="" fill className="object-cover" sizes="176px" unoptimized />
                  ) : (
                    <div className="flex h-full min-h-[10rem] items-center justify-center text-xs text-zinc-400">
                      No image
                    </div>
                  )}
                </Link>
                <div className="flex min-w-0 flex-1 flex-col justify-between gap-3 p-4">
                  <div>
                    <Link href={`/listings/${l.id}`} className="font-semibold text-zinc-900 hover:underline">
                      {l.title}
                    </Link>
                    <p className="mt-1 text-sm text-zinc-600">
                      {l.category.name} · £{(l.price / 100).toFixed(2)}
                      {dist}
                    </p>
                    {a.status === "DECLINED" ? (
                      <p className="mt-2 text-xs font-medium text-zinc-500">You passed on this one.</p>
                    ) : null}
                    {a.linkedOfferId ? (
                      <p className="mt-2 text-xs text-zinc-600">
                        You submitted an offer — see status on the{" "}
                        <Link href={`/listings/${l.id}`} className="font-medium text-brand hover:underline">
                          listing
                        </Link>{" "}
                        or under Offers.
                      </p>
                    ) : null}
                  </div>
                  <NearbyStockActions alertId={a.id} listingId={l.id} showOffer={showOffer} />
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

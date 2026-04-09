import Link from "next/link";
import Image from "next/image";
import type { Metadata } from "next";
import { prisma } from "@/lib/db";

export const metadata: Metadata = {
  title: "Demolition & refurb alerts | Salvage lots before they go to waste",
  description:
    "Browse live demolition and refurbishment projects. Reserve free salvage or register interest on chargeable lots — for buyers and reclamation yards.",
};

export const revalidate = 120;

export default async function DemolitionAlertsPage() {
  const projects = await prisma.demolitionProject.findMany({
    where: { status: "active" },
    orderBy: { publishedAt: "desc" },
    take: 48,
    include: {
      elements: { select: { id: true, status: true, isFree: true } },
    },
  });

  return (
    <div className="mx-auto w-full max-w-5xl px-[30px] py-8 sm:py-10">
      <h1 className="text-3xl font-semibold tracking-tight text-zinc-900 sm:text-4xl">
        Demolition &amp; refurb alerts
      </h1>
      <p className="mt-3 max-w-2xl text-sm leading-relaxed text-zinc-600 sm:text-base">
        Organisers post whole sites with multiple lots — doors, windows, fittings, furniture.{" "}
        <strong>Free</strong> lots can be reserved here with collection details;{" "}
        <strong>chargeable</strong> lots use a guide price and you register interest so the organiser can follow up.
      </p>
      <div className="mt-6 flex flex-wrap gap-3">
        <Link
          href="/dashboard/demolition-alerts/new"
          className="rounded-lg bg-brand px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-hover"
        >
          Post an alert
        </Link>
        <Link href="/search" className="rounded-lg border border-zinc-300 px-4 py-2.5 text-sm font-medium hover:bg-zinc-50">
          Browse marketplace
        </Link>
      </div>

      {projects.length === 0 ? (
        <p className="mt-12 rounded-xl border border-zinc-200 bg-white p-8 text-center text-zinc-600">
          No live alerts yet. If you are stripping out a building,{" "}
          <Link href="/dashboard/demolition-alerts/new" className="font-medium text-brand hover:underline">
            publish the first one
          </Link>
          .
        </p>
      ) : (
        <ul className="mt-10 space-y-4">
          {projects.map((p) => {
            const img = p.images[0];
            const avail = p.elements.filter((e) => e.status === "available").length;
            const reserved = p.elements.filter((e) => e.status === "reserved").length;
            return (
              <li key={p.id}>
                <Link
                  href={`/demolition-alerts/${p.id}`}
                  className="flex gap-4 rounded-xl border border-zinc-200 bg-white p-4 transition hover:border-brand/35 hover:shadow-sm"
                >
                  <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-lg bg-zinc-100 sm:h-28 sm:w-28">
                    {img ? (
                      <Image src={img} alt="" fill className="object-cover" sizes="112px" unoptimized />
                    ) : (
                      <div className="flex h-full items-center justify-center text-[10px] text-zinc-400">No photo</div>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <h2 className="font-semibold text-zinc-900">{p.title}</h2>
                    <p className="mt-1 line-clamp-2 text-sm text-zinc-600">{p.description}</p>
                    <p className="mt-2 text-xs text-zinc-500">
                      {p.postcode}
                      {p.adminDistrict ? ` · ${p.adminDistrict}` : ""}
                      {" · "}
                      {p.elements.length} lot{p.elements.length === 1 ? "" : "s"}
                      {avail > 0 ? ` · ${avail} available` : ""}
                      {reserved > 0 ? ` · ${reserved} reserved` : ""}
                    </p>
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

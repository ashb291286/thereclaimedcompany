import { prisma } from "@/lib/db";
import Link from "next/link";
import Image from "next/image";
import { SearchForm } from "./SearchForm";
import { CONDITION_LABELS } from "@/lib/constants";
import type { Condition } from "@/generated/prisma/client";

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string;
    categoryId?: string;
    condition?: string;
    postcode?: string;
    sellerType?: string;
    page?: string;
  }>;
}) {
  const params = await searchParams;
  const page = Math.max(1, parseInt(params.page ?? "1", 10));
  const pageSize = 12;
  const skip = (page - 1) * pageSize;

  const where: { status: "active"; OR?: Array<{ title?: { contains: string; mode: "insensitive" }; description?: { contains: string; mode: "insensitive" } }>; categoryId?: string; condition?: Condition; seller?: { role: "individual" | "reclamation_yard" }; postcode?: { startsWith: string; mode: "insensitive" } } = {
    status: "active",
  };
  if (params.q?.trim()) {
    where.OR = [
      { title: { contains: params.q.trim(), mode: "insensitive" } },
      { description: { contains: params.q.trim(), mode: "insensitive" } },
    ];
  }
  if (params.categoryId) where.categoryId = params.categoryId;
  if (params.condition) where.condition = params.condition as Condition;
  if (params.sellerType) where.seller = { role: params.sellerType as "individual" | "reclamation_yard" };
  if (params.postcode?.trim()) {
    const prefix = params.postcode.trim().toUpperCase().replace(/\s/g, "").slice(0, 4);
    if (prefix.length >= 2) {
      where.postcode = { startsWith: prefix, mode: "insensitive" };
    }
  }

  const [listings, total, categories] = await Promise.all([
    prisma.listing.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip,
      take: pageSize,
      include: { category: true },
    }),
    prisma.listing.count({ where }),
    prisma.category.findMany({ where: { parentId: null }, orderBy: { name: "asc" } }),
  ]);

  const totalPages = Math.ceil(total / pageSize);

  return (
    <div>
      <h1 className="text-2xl font-semibold text-zinc-900">Browse listings</h1>
      <SearchForm
        categories={categories}
        defaultQ={params.q}
        defaultCategoryId={params.categoryId}
        defaultCondition={params.condition}
        defaultPostcode={params.postcode}
        defaultSellerType={params.sellerType}
      />
      <p className="mt-4 text-sm text-zinc-500">
        {total} listing{total !== 1 ? "s" : ""} found
      </p>
      {listings.length === 0 ? (
        <p className="mt-8 text-zinc-500">No listings match your filters.</p>
      ) : (
        <ul className="mt-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {listings.map((l) => (
            <li key={l.id}>
              <Link
                href={`/listings/${l.id}`}
                className="block rounded-xl border border-zinc-200 bg-white overflow-hidden hover:border-amber-300 transition-colors"
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
      {totalPages > 1 && (
        <div className="mt-8 flex justify-center gap-2">
          {page > 1 && (
            <Link
              href={`/search?${new URLSearchParams({
                ...Object.fromEntries(
                  Object.entries(params).filter(([, v]) => v != null && v !== "")
                ),
                page: String(page - 1),
              }).toString()}`}
              className="rounded-lg border border-zinc-300 px-3 py-1.5 text-sm hover:bg-zinc-50"
            >
              Previous
            </Link>
          )}
          <span className="px-3 py-1.5 text-sm text-zinc-600">
            Page {page} of {totalPages}
          </span>
          {page < totalPages && (
            <Link
              href={`/search?${new URLSearchParams({
                ...Object.fromEntries(
                  Object.entries(params).filter(([, v]) => v != null && v !== "")
                ),
                page: String(page + 1),
              }).toString()}`}
              className="rounded-lg border border-zinc-300 px-3 py-1.5 text-sm hover:bg-zinc-50"
            >
              Next
            </Link>
          )}
        </div>
      )}
    </div>
  );
}

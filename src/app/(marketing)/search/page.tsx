import { prisma } from "@/lib/db";
import Link from "next/link";
import Image from "next/image";
import { SearchForm } from "./SearchForm";
import { CONDITION_LABELS } from "@/lib/constants";
import type { Condition, Prisma } from "@/generated/prisma/client";

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
    ids?: string;
    fromImage?: string;
  }>;
}) {
  const params = await searchParams;
  const page = Math.max(1, parseInt(params.page ?? "1", 10));
  const pageSize = 12;
  const skip = (page - 1) * pageSize;

  const idList = params.ids
    ?.split(",")
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, 48) ?? [];

  const where: Prisma.ListingWhereInput = {
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
  if (params.sellerType) {
    where.seller = { role: params.sellerType as "individual" | "reclamation_yard" };
  }
  if (params.postcode?.trim()) {
    const prefix = params.postcode.trim().toUpperCase().replace(/\s/g, "").slice(0, 4);
    if (prefix.length >= 2) {
      where.postcode = { startsWith: prefix, mode: "insensitive" };
    }
  }
  if (idList.length > 0) {
    where.id = { in: idList };
  }

  const categoriesPromise = prisma.category.findMany({
    where: { parentId: null },
    orderBy: { name: "asc" },
  });

  const [categories, listingsOrdered, total] = await (async () => {
    if (idList.length > 0) {
      const orderMap = new Map(idList.map((id, i) => [id, i]));
      const [allMatching, count, cats] = await Promise.all([
        prisma.listing.findMany({
          where,
          include: { category: true },
        }),
        prisma.listing.count({ where }),
        categoriesPromise,
      ]);
      allMatching.sort(
        (a, b) => (orderMap.get(a.id) ?? 999) - (orderMap.get(b.id) ?? 999)
      );
      const pageSlice = allMatching.slice(skip, skip + pageSize);
      return [cats, pageSlice, count] as const;
    }

    const [pageList, count, cats] = await Promise.all([
      prisma.listing.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip,
        take: pageSize,
        include: { category: true },
      }),
      prisma.listing.count({ where }),
      categoriesPromise,
    ]);
    return [cats, pageList, count] as const;
  })();

  const totalPages = Math.ceil(total / pageSize);
  const fromImage = params.fromImage === "1";

  const paramRecord: Record<string, string | undefined> = {
    q: params.q,
    categoryId: params.categoryId,
    condition: params.condition,
    postcode: params.postcode,
    sellerType: params.sellerType,
    ids: params.ids,
    fromImage: params.fromImage,
  };

  function paginationQuery(pageNum: number) {
    const sp = new URLSearchParams();
    for (const [k, v] of Object.entries(paramRecord)) {
      if (v != null && String(v) !== "") sp.set(k, String(v));
    }
    sp.set("page", String(pageNum));
    return sp.toString();
  }

  return (
    <div>
      <h1 className="text-2xl font-semibold text-zinc-900">Browse listings</h1>
      {fromImage ? (
        <p className="mt-3 rounded-lg border border-brand/20 bg-brand-soft px-4 py-3 text-sm text-zinc-900">
          Showing listings ranked by visual similarity to your photo. Add keywords or filters below to narrow results.
        </p>
      ) : null}
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
      {listingsOrdered.length === 0 ? (
        <p className="mt-8 text-zinc-500">No listings match your filters.</p>
      ) : (
        <ul className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {listingsOrdered.map((l) => (
            <li key={l.id}>
              <Link
                href={`/listings/${l.id}`}
                className="block overflow-hidden rounded-xl border border-zinc-200 bg-white transition-colors hover:border-brand/40"
              >
                <div className="relative aspect-square bg-zinc-200">
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
                    <div className="flex h-full w-full items-center justify-center text-zinc-400">
                      No image
                    </div>
                  )}
                </div>
                <div className="p-3">
                  <div className="mb-1 flex flex-wrap gap-1">
                    {l.listingKind === "auction" && (
                      <span className="rounded bg-brand-soft px-1.5 py-0.5 text-[10px] font-bold uppercase text-brand">
                        Auction
                      </span>
                    )}
                    {l.listingKind === "sell" && l.freeToCollector && (
                      <span className="rounded bg-emerald-100 px-1.5 py-0.5 text-[10px] font-bold uppercase text-emerald-900">
                        Free
                      </span>
                    )}
                  </div>
                  <p className="truncate font-medium text-zinc-900">{l.title}</p>
                  <p className="text-sm text-zinc-500">
                    {l.listingKind === "sell" && l.freeToCollector
                      ? `Free to collect · ${l.category.name}`
                      : l.listingKind === "auction"
                        ? `From £${(l.price / 100).toFixed(2)} · ${l.category.name}`
                        : `£${(l.price / 100).toFixed(2)} · ${l.category.name}`}
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
              href={`/search?${paginationQuery(page - 1)}`}
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
              href={`/search?${paginationQuery(page + 1)}`}
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

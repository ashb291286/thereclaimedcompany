import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { auth } from "@/auth";
import { parseBrowseRadiusParam } from "@/lib/browse-radius";
import { browseListingTypeQueryParam, browseSortQueryParam, searchListings } from "@/lib/listing-search";
import { BrowseSortSelect } from "@/app/(marketing)/search/BrowseSortSelect";
import { BrowseListingGrid } from "@/app/(marketing)/search/BrowseListingGrid";

type Props = { params: Promise<{ slug: string }>; searchParams: Promise<{ page?: string; sort?: string }> };

export async function generateStaticParams() {
  const rows = await prisma.category.findMany({
    where: { parentId: null },
    select: { slug: true },
  });
  return rows.map((r) => ({ slug: r.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const cat = await prisma.category.findUnique({
    where: { slug },
    select: { name: true },
  });
  if (!cat) return { title: "Category" };
  const title = `${cat.name} | Reclaimed & salvage for sale`;
  const description = `Browse reclaimed ${cat.name.toLowerCase()} for sale across the UK — listings from individuals and reclamation yards.`;
  return { title, description, openGraph: { title, description } };
}

export default async function CategoryBrowsePage({ params, searchParams }: Props) {
  const { slug } = await params;
  const sp = await searchParams;
  const category = await prisma.category.findUnique({
    where: { slug },
    select: { id: true, name: true, slug: true },
  });
  if (!category) notFound();

  const page = Math.max(1, parseInt(sp.page ?? "1", 10));
  const pageSize = 12;
  const skip = (page - 1) * pageSize;

  const session = await auth();
  const userPrefs = session?.user?.id
    ? await prisma.user.findUnique({
        where: { id: session.user.id },
        select: { homePostcode: true, homeLat: true, homeLng: true },
      })
    : null;

  const nearestAvailable =
    Boolean(userPrefs?.homeLat != null &&
      userPrefs?.homeLng != null &&
      Number.isFinite(userPrefs.homeLat) &&
      Number.isFinite(userPrefs.homeLng));

  const sortQuery = browseSortQueryParam(sp.sort, nearestAvailable);
  const listingTypeQuery = browseListingTypeQueryParam(undefined);
  const { miles: radiusMiles, nationwide: radiusNationwide } = parseBrowseRadiusParam(undefined);

  const searchResult = await searchListings({
    categoryId: category.id,
    hireOnly: false,
    availableNow: false,
    listingType: listingTypeQuery || undefined,
    postcode: undefined,
    radiusMiles,
    radiusNationwide,
    skip,
    take: pageSize,
    viewerHomeLat: userPrefs?.homeLat ?? undefined,
    viewerHomeLng: userPrefs?.homeLng ?? undefined,
    viewerHomePostcode: userPrefs?.homePostcode ?? undefined,
    sort: sp.sort,
  });

  const { listings: listingsOrdered, total, sortByDistance } = searchResult;
  const totalPages = Math.ceil(total / pageSize);

  function paginationQuery(pageNum: number) {
    const p = new URLSearchParams();
    if (sortQuery) p.set("sort", sortQuery);
    p.set("page", String(pageNum));
    return p.toString();
  }

  let locationNote: string | null = null;
  if (sortByDistance && userPrefs?.homePostcode?.trim()) {
    locationNote = `Sorted by distance from your saved postcode (${userPrefs.homePostcode.trim()}). Add a postcode on search for a different origin.`;
  }

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 lg:max-w-7xl lg:py-10">
      <nav className="mb-6 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-zinc-500">
        <Link href="/" className="hover:text-zinc-800">
          Home
        </Link>
        <span aria-hidden className="text-zinc-300">
          /
        </span>
        <Link href="/categories" className="hover:text-zinc-800">
          Categories
        </Link>
        <span aria-hidden className="text-zinc-300">
          /
        </span>
        <span className="font-medium text-zinc-700">{category.name}</span>
      </nav>

      <header className="max-w-3xl">
        <h1 className="text-2xl font-semibold text-zinc-900 sm:text-3xl">{category.name}</h1>
        <p className="mt-3 text-sm leading-relaxed text-zinc-600">
          Reclaimed and salvage {category.name.toLowerCase()} listed on The Reclaimed Company. Use{" "}
          <Link href={`/search?category=${encodeURIComponent(category.slug)}`} className="font-medium text-brand underline">
            advanced search
          </Link>{" "}
          to filter by postcode, listing type, and keywords.
        </p>
      </header>

      <section className="mt-8">
        {locationNote ? (
          <p className="rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm text-zinc-700">{locationNote}</p>
        ) : null}
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-zinc-500">
            {total} listing{total !== 1 ? "s" : ""} in this category
          </p>
          <BrowseSortSelect value={sortQuery} nearestAvailable={nearestAvailable} />
        </div>
        {listingsOrdered.length === 0 ? (
          <p className="mt-8 text-zinc-500">No active listings in this category yet.</p>
        ) : (
          <BrowseListingGrid listings={listingsOrdered} visibility="always" />
        )}
      </section>

      {totalPages > 1 ? (
        <div className="mt-8 flex justify-center gap-2">
          {page > 1 ? (
            <Link
              href={`/categories/${category.slug}?${paginationQuery(page - 1)}`}
              className="rounded-lg border border-zinc-300 px-3 py-1.5 text-sm hover:bg-zinc-50"
            >
              Previous
            </Link>
          ) : null}
          <span className="px-3 py-1.5 text-sm text-zinc-600">
            Page {page} of {totalPages}
          </span>
          {page < totalPages ? (
            <Link
              href={`/categories/${category.slug}?${paginationQuery(page + 1)}`}
              className="rounded-lg border border-zinc-300 px-3 py-1.5 text-sm hover:bg-zinc-50"
            >
              Next
            </Link>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

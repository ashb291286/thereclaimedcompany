import Link from "next/link";
import Image from "next/image";
import { prisma } from "@/lib/db";

type Props = { searchParams: Promise<{ q?: string; error?: string; setId?: string; era?: string; genre?: string; setting?: string; material?: string; conditionGrade?: string; availableNow?: string }> };

export default async function PropYardSearchPage({ searchParams }: Props) {
  const { q, error, setId: setIdParam, era, genre, setting, material, conditionGrade, availableNow } = await searchParams;
  const term = (q ?? "").trim();
  const eraTags = (era ?? "").split(",").map((x) => x.trim()).filter(Boolean);
  const genreTags = (genre ?? "").split(",").map((x) => x.trim()).filter(Boolean);
  const settingTags = (setting ?? "").split(",").map((x) => x.trim()).filter(Boolean);
  const materialTags = (material ?? "").split(",").map((x) => x.trim()).filter(Boolean);
  const setId = (setIdParam ?? "").trim();
  const offerQuery = setId ? `?setId=${encodeURIComponent(setId)}` : "";

  const offers = await prisma.propRentalOffer.findMany({
    where: {
      isActive: true,
      listing: {
        status: "active",
        listingKind: "sell",
        freeToCollector: false,
          ...(conditionGrade ? { conditionGrade: conditionGrade as never } : {}),
          ...(availableNow === "1" ? { propListingStatus: "ACTIVE" as never } : {}),
          ...(eraTags.length ? { eraTags: { hasSome: eraTags } } : {}),
          ...(genreTags.length ? { genreTags: { hasSome: genreTags } } : {}),
          ...(materialTags.length ? { propMaterials: { hasSome: materialTags } } : {}),
          ...(settingTags.length
            ? {
                OR: [
                  { settingInteriorTags: { hasSome: settingTags } },
                  { settingExteriorTags: { hasSome: settingTags } },
                ],
              }
            : {}),
        ...(term
          ? {
              OR: [
                { title: { contains: term, mode: "insensitive" } },
                { description: { contains: term, mode: "insensitive" } },
              ],
            }
          : {}),
      },
    },
    orderBy: { updatedAt: "desc" },
    take: 48,
    include: {
      listing: {
        include: {
          category: true,
          seller: { include: { sellerProfile: true } },
        },
      },
    },
  });

  return (
    <div>
      <h2 className="font-[family-name:var(--font-driven-display)] text-2xl font-semibold text-driven-ink">
        Find props
      </h2>
      <p className="mt-2 max-w-2xl text-sm text-driven-muted">
        Listed by UK reclamation yards for weekly hire. Results are separate from marketplace purchase listings.
      </p>
      <div className="mt-3">
        <Link
          href="/prop-yard/sets"
          className="text-sm font-medium text-driven-accent underline hover:text-driven-ink"
        >
          My sets &amp; set builder
        </Link>
        {setId ? (
          <p className="mt-2 text-xs text-driven-muted">
            Browsing with an active set — offer links will add to that set when you open them.
          </p>
        ) : null}
      </div>

      {error ? (
        <p className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{decodeURIComponent(error)}</p>
      ) : null}

      <form className="mt-6 flex flex-wrap gap-2" action="/prop-yard/search" method="get">
        <input
          type="search"
          name="q"
          defaultValue={term}
          placeholder="Search title or description…"
          className="min-w-[12rem] flex-1 rounded-lg border border-driven-warm bg-white px-3 py-2 text-sm text-driven-ink"
        />
        <button
          type="submit"
          className="rounded-lg border border-driven-ink bg-driven-ink px-4 py-2 font-[family-name:var(--font-driven-mono)] text-xs font-semibold uppercase tracking-wide text-driven-paper hover:bg-driven-accent"
        >
          Search
        </button>
        <input name="era" defaultValue={era ?? ""} placeholder="Era tags (comma)" className="rounded-lg border border-driven-warm bg-white px-3 py-2 text-sm text-driven-ink" />
        <input name="genre" defaultValue={genre ?? ""} placeholder="Genre tags (comma)" className="rounded-lg border border-driven-warm bg-white px-3 py-2 text-sm text-driven-ink" />
        <input name="setting" defaultValue={setting ?? ""} placeholder="Setting tags (comma)" className="rounded-lg border border-driven-warm bg-white px-3 py-2 text-sm text-driven-ink" />
        <input name="material" defaultValue={material ?? ""} placeholder="Material tags (comma)" className="rounded-lg border border-driven-warm bg-white px-3 py-2 text-sm text-driven-ink" />
        <select name="conditionGrade" defaultValue={conditionGrade ?? ""} className="rounded-lg border border-driven-warm bg-white px-3 py-2 text-sm text-driven-ink">
          <option value="">Any condition grade</option>
          <option value="A">A</option>
          <option value="B">B</option>
          <option value="C">C</option>
        </select>
        <label className="inline-flex items-center gap-2 rounded-lg border border-driven-warm bg-white px-3 py-2 text-sm text-driven-ink">
          <input type="checkbox" name="availableNow" value="1" defaultChecked={availableNow === "1"} />
          Available now
        </label>
      </form>

      {offers.length === 0 ? (
        <p className="mt-10 text-center text-sm text-driven-muted">
          No props match{term ? " that search" : ""} yet. Try another keyword or check back as yards opt in.
        </p>
      ) : (
        <ul className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {offers.map((o) => {
            const img = o.listing.images[0];
            const yard = o.listing.seller.sellerProfile;
            return (
              <li key={o.id} className="overflow-hidden rounded-xl border border-driven-warm bg-white shadow-sm">
                <Link href={`/prop-yard/offers/${o.id}${offerQuery}`} className="block">
                  <div className="relative aspect-[4/3] bg-driven-warm">
                    {img ? (
                      <Image src={img} alt="" fill className="object-cover" unoptimized />
                    ) : (
                      <div className="flex h-full items-center justify-center text-driven-muted">No image</div>
                    )}
                  </div>
                  <div className="p-4">
                    <p className="font-[family-name:var(--font-driven-mono)] text-[10px] font-medium uppercase tracking-wide text-driven-muted">
                      {o.listing.category.name}
                    </p>
                    <h3 className="mt-1 line-clamp-2 font-semibold text-driven-ink">{o.listing.title}</h3>
                    <p className="mt-2 text-sm font-medium text-driven-ink">
                      £{(o.weeklyHirePence / 100).toFixed(2)} / week
                    </p>
                    <p className="mt-1 text-xs text-driven-muted">
                      Min hire {o.minimumHireWeeks} week{o.minimumHireWeeks === 1 ? "" : "s"}
                    </p>
                    {yard ? <p className="mt-1 text-xs text-driven-muted">{yard.displayName}</p> : null}
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

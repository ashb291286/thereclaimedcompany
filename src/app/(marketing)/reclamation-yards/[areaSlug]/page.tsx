import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getAllYardAreaSlugs, getYardsInAreaBySlug } from "@/lib/yard-area-seo";
import { publicSellerPath } from "@/lib/yard-public-path";
import { formatUkLocationLine } from "@/lib/postcode-uk";

type Props = { params: Promise<{ areaSlug: string }> };

export const revalidate = 1800;

export async function generateStaticParams() {
  const slugs = await getAllYardAreaSlugs();
  return slugs.map((areaSlug) => ({ areaSlug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { areaSlug } = await params;
  const { label, yards } = await getYardsInAreaBySlug(areaSlug);
  if (!label || yards.length === 0) {
    return { title: "Reclamation yards" };
  }
  const title = `Reclamation yards in ${label} | UK salvage & reclaimed stock`;
  const description = `Browse ${yards.length} reclamation yard${yards.length === 1 ? "" : "s"} in ${label}. View profiles, contact details, and listings.`;
  return { title, description, openGraph: { title, description } };
}

export default async function ReclamationYardsAreaPage({ params }: Props) {
  const { areaSlug } = await params;
  const { label, yards } = await getYardsInAreaBySlug(areaSlug);
  if (!label || yards.length === 0) notFound();

  const searchNearHref = `/search?sellerType=reclamation_yard`;

  return (
    <div className="mx-auto w-full max-w-3xl px-[30px] py-8 sm:py-10">
      <nav className="text-sm text-zinc-500">
        <Link href="/reclamation-yards" className="hover:text-zinc-800">
          Reclamation yards
        </Link>
        <span className="mx-2">/</span>
        <span className="text-zinc-800">{label}</span>
      </nav>

      <h1 className="mt-4 text-3xl font-semibold tracking-tight text-zinc-900 sm:text-4xl">
        Reclamation yards in {label}
      </h1>
      <p className="mt-3 text-sm leading-relaxed text-zinc-600 sm:text-base">
        {yards.length} yard{yards.length === 1 ? "" : "s"} on The Reclaimed Company in this area. Visit a
        profile for opening hours, contact details, and live stock — or{" "}
        <Link href={searchNearHref} className="font-medium text-brand hover:underline">
          search all yards by postcode
        </Link>{" "}
        to sort by distance from you.
      </p>

      <ul className="mt-8 space-y-3">
        {yards.map((y) => {
          const href = publicSellerPath({
            sellerId: y.userId,
            role: "reclamation_yard",
            yardSlug: y.yardSlug,
          });
          const locLine = formatUkLocationLine({
            postcodeLocality: y.postcodeLocality,
            adminDistrict: y.adminDistrict,
            region: y.region,
            postcode: y.postcode,
          });
          return (
            <li key={y.userId}>
              <Link
                href={href}
                className="block rounded-xl border border-zinc-200 bg-white p-4 transition hover:border-brand/35 hover:shadow-sm"
              >
                <p className="font-semibold text-zinc-900">{y.displayName}</p>
                {y.businessName && y.businessName !== y.displayName ? (
                  <p className="text-sm text-zinc-600">{y.businessName}</p>
                ) : null}
                {y.yardTagline ? <p className="mt-2 text-sm text-zinc-600">{y.yardTagline}</p> : null}
                <p className="mt-2 text-xs text-zinc-500">{locLine}</p>
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

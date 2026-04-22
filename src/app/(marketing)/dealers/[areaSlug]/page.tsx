import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getAllDealerAreaSlugs, getDealersInAreaBySlug } from "@/lib/dealer-area-seo";
import { formatUkLocationLine } from "@/lib/postcode-uk";
import { getSiteBaseUrl } from "@/lib/site-url";

type Props = { params: Promise<{ areaSlug: string }> };

export const revalidate = 1800;

export async function generateStaticParams() {
  const slugs = await getAllDealerAreaSlugs();
  return slugs.map((areaSlug) => ({ areaSlug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { areaSlug } = await params;
  const { label, dealers } = await getDealersInAreaBySlug(areaSlug);
  if (!label || dealers.length === 0) return { title: "Dealers" };
  const title = `Antiques dealers in ${label} | Curated dealer pieces`;
  const description = `Browse ${dealers.length} dealer${dealers.length === 1 ? "" : "s"} in ${label}. View profiles and curated pieces.`;
  return { title, description, openGraph: { title, description } };
}

export default async function DealersAreaPage({ params }: Props) {
  const { areaSlug } = await params;
  const { label, dealers } = await getDealersInAreaBySlug(areaSlug);
  if (!label || dealers.length === 0) notFound();
  const base = getSiteBaseUrl();
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: `Antiques dealers in ${label}`,
    url: `${base}/dealers/${areaSlug}`,
    mainEntity: {
      "@type": "ItemList",
      itemListElement: dealers.slice(0, 100).map((d, index) => ({
        "@type": "ListItem",
        position: index + 1,
        item: {
          "@type": "AntiqueStore",
          name: d.businessName || d.displayName,
          url: `${base}/sellers/${d.userId}`,
          address: {
            "@type": "PostalAddress",
            addressLocality: d.postcodeLocality || d.adminDistrict || undefined,
            addressRegion: d.region || undefined,
            postalCode: d.postcode || undefined,
            addressCountry: "GB",
          },
        },
      })),
    },
  };

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 sm:py-10">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <nav className="text-sm text-zinc-500">
        <Link href="/dealers" className="hover:text-zinc-800">
          Dealers
        </Link>
        <span className="mx-2">/</span>
        <span className="text-zinc-800">{label}</span>
      </nav>

      <p className="mt-4 text-xs font-semibold uppercase tracking-[0.2em] text-amber-900/80">Curated by area</p>
      <h1 className="mt-2 text-3xl font-semibold tracking-tight text-zinc-900 sm:text-4xl">Dealers in {label}</h1>
      <p className="mt-3 text-sm leading-relaxed text-zinc-700 sm:text-base">
        {dealers.length} dealer{dealers.length === 1 ? "" : "s"} in this area. Visit a profile for contact
        details and curated pieces, or{" "}
        <Link href="/search?sellerType=dealer" className="font-medium text-brand hover:underline">
          search all dealers by postcode
        </Link>
        .
      </p>

      <ul className="mt-8 space-y-3">
        {dealers.map((d) => {
          const locLine = formatUkLocationLine({
            postcodeLocality: d.postcodeLocality,
            adminDistrict: d.adminDistrict,
            region: d.region,
            postcode: d.postcode,
          });
          return (
            <li key={d.userId}>
              <Link
                href={`/sellers/${d.userId}`}
                className="block rounded-xl border border-amber-200/70 bg-white p-4 transition hover:border-amber-500/60 hover:shadow-sm"
              >
                <p className="font-semibold text-zinc-900">{d.displayName}</p>
                {d.businessName && d.businessName !== d.displayName ? (
                  <p className="text-sm text-zinc-600">{d.businessName}</p>
                ) : null}
                {d.yardTagline ? <p className="mt-2 text-sm text-zinc-600">{d.yardTagline}</p> : null}
                <p className="mt-2 text-xs text-zinc-500">{locLine}</p>
                <p className="mt-3 text-xs font-semibold uppercase tracking-wide text-amber-900">View pieces</p>
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

import { prisma } from "@/lib/db";
import { notFound } from "next/navigation";
import Link from "next/link";
import { auth } from "@/auth";
import { createHash } from "node:crypto";
import { getSiteBaseUrl } from "@/lib/site-url";
import { CertificatePrintButton } from "@/components/CertificatePrintButton";

type TimelinePoint = { label: string; value: string };

function passportVerificationId(parts: string[]) {
  const hash = createHash("sha256").update(parts.join("|")).digest("hex").toUpperCase();
  return `RMPP-${hash.slice(0, 28)}`;
}

export default async function ListingPiecePassportPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await auth();
  const listing = await prisma.listing.findUnique({
    where: { id },
    include: {
      seller: {
        include: {
          sellerProfile: true,
        },
      },
    },
  });
  if (!listing) notFound();
  if (listing.seller.role !== "dealer") notFound();
  if (listing.status !== "active" && session?.user?.id !== listing.sellerId) notFound();

  const dealerName =
    listing.seller.sellerProfile?.businessName?.trim() ||
    listing.seller.sellerProfile?.displayName?.trim() ||
    listing.seller.name ||
    "Dealer";
  const passportId = passportVerificationId([
    listing.id,
    listing.sellerId,
    listing.createdAt.toISOString(),
    dealerName,
    listing.title,
  ]);
  const base = getSiteBaseUrl();
  const passportUrl = `${base}/listings/${listing.id}/passport`;
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=240x240&data=${encodeURIComponent(passportUrl)}`;

  const timeline: TimelinePoint[] = [];
  if (listing.dateSpecific) {
    timeline.push({ label: "Manufactured", value: listing.dateSpecific });
  }
  if (Array.isArray(listing.dealerProvenanceTimeline)) {
    for (const item of listing.dealerProvenanceTimeline) {
      if (!item || typeof item !== "object") continue;
      const maybe = item as { date?: unknown; event?: unknown };
      const date = typeof maybe.date === "string" ? maybe.date.trim() : "";
      const event = typeof maybe.event === "string" ? maybe.event.trim() : "";
      if (!date || !event) continue;
      timeline.push({ label: date.slice(0, 120), value: event.slice(0, 300) });
    }
  }
  if (listing.dealerAcquisitionStory?.trim()) {
    timeline.push({ label: "Dealer acquisition", value: listing.dealerAcquisitionStory.trim() });
  }
  timeline.push({
    label: "Listed on The Reclaimed Company",
    value: listing.createdAt.toLocaleDateString("en-GB", { dateStyle: "long" }),
  });
  timeline.push({
    label: "Passport issued",
    value: new Date().toLocaleDateString("en-GB", { dateStyle: "long" }),
  });

  const provenanceDocuments = coalesceDealerProvenanceDocuments(listing.dealerProvenanceDocuments);

  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-8 sm:px-6 print:bg-white">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4 print:hidden">
        <Link href={`/listings/${listing.id}`} className="text-sm font-medium text-brand hover:underline">
          ← Back to listing
        </Link>
        <CertificatePrintButton />
      </div>

      <article className="rounded-2xl border border-amber-200 bg-gradient-to-br from-amber-50 via-white to-yellow-50 p-8 shadow-sm print:border-0 print:shadow-none">
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-amber-900/80">
          The Reclaimed Company
        </p>
        <h1 className="mt-2 text-2xl font-semibold text-zinc-900">Piece Passport™</h1>
        <p className="mt-2 text-sm text-zinc-700">
          Certificate of authenticity endorsed by <strong>{dealerName}</strong>, verifying the heritage and
          provenance context of this piece.
        </p>

        <div className="mt-6 grid gap-4 rounded-xl border border-zinc-200 bg-white/90 p-5 sm:grid-cols-[1fr_180px]">
          <div>
            <p className="text-xs uppercase tracking-wide text-zinc-500">Certified piece</p>
            <p className="mt-1 text-lg font-semibold text-zinc-900">{listing.title}</p>
            <p className="mt-2 text-xs text-zinc-600">
              Passport ID: <span className="font-mono font-semibold text-zinc-900">{passportId}</span>
            </p>
            <p className="mt-1 text-xs text-zinc-600">
              Listing ID: <span className="font-mono text-zinc-800">{listing.id}</span>
            </p>
          </div>
          <div className="flex items-center justify-center">
            <img
              src={qrUrl}
              alt="QR code linking to Piece Passport™ verification page"
              className="h-36 w-36 rounded-lg border border-zinc-200 bg-white p-2"
            />
          </div>
        </div>

        <div className="mt-5 grid gap-3 text-sm sm:grid-cols-2">
          {listing.dealerDesigner ? (
            <p>
              <span className="text-zinc-500">Designer</span>
              <br />
              <span className="font-medium text-zinc-900">{listing.dealerDesigner}</span>
            </p>
          ) : null}
          {listing.geographicOrigin ? (
            <p>
              <span className="text-zinc-500">Country of origin</span>
              <br />
              <span className="font-medium text-zinc-900">{listing.geographicOrigin}</span>
            </p>
          ) : null}
          {listing.styleTags[0] ? (
            <p>
              <span className="text-zinc-500">Style</span>
              <br />
              <span className="font-medium text-zinc-900">{listing.styleTags[0]}</span>
            </p>
          ) : null}
          {listing.propMaterials[0] ? (
            <p>
              <span className="text-zinc-500">Material</span>
              <br />
              <span className="font-medium text-zinc-900">{listing.propMaterials[0]}</span>
            </p>
          ) : null}
        </div>

        <div className="mt-6 rounded-xl border border-zinc-200 bg-zinc-50/80 p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Provenance timeline</p>
          <ol className="mt-4 space-y-0">
            {timeline.map((item, index) => (
              <li key={`${item.label}-${item.value}`} className="relative pl-8">
                {index < timeline.length - 1 ? (
                  <span
                    aria-hidden
                    className="absolute left-[11px] top-5 h-[calc(100%+1.1rem)] w-px bg-amber-300"
                  />
                ) : null}
                <span
                  aria-hidden
                  className="absolute left-2 top-2 inline-block h-2.5 w-2.5 rounded-full border border-amber-500 bg-amber-200"
                />
                <div className="mb-4 rounded-lg border border-zinc-200 bg-white px-3 py-2">
                  <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">{item.label}</p>
                  <p className="mt-1 text-sm text-zinc-700">{item.value}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>

        {provenanceDocuments.length > 0 ? (
          <div className="mt-6 rounded-xl border border-zinc-200 bg-white p-4 print:break-inside-avoid">
            <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Supporting documents</p>
            <p className="mt-1 text-sm text-zinc-600">
              Dealer-uploaded files stored with this passport (receipts, repairs, certificates).
            </p>
            <ul className="mt-4 grid gap-3 sm:grid-cols-2">
              {provenanceDocuments.map((doc) => (
                <li
                  key={doc.url}
                  className="overflow-hidden rounded-lg border border-zinc-200 bg-zinc-50/80"
                >
                  {doc.kind === "image" ? (
                    <a href={doc.url} target="_blank" rel="noopener noreferrer" className="block">
                      <img
                        src={doc.url}
                        alt={doc.label}
                        className="h-40 w-full object-cover"
                      />
                    </a>
                  ) : (
                    <a
                      href={doc.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex h-32 items-center justify-center bg-zinc-200/80 text-sm font-semibold text-zinc-800"
                    >
                      {doc.kind === "pdf" ? "PDF document" : "File"}
                    </a>
                  )}
                  <div className="p-3">
                    <p className="text-sm font-medium text-zinc-900">{doc.label}</p>
                    {doc.fileName ? (
                      <p className="mt-0.5 text-xs text-zinc-500">{doc.fileName}</p>
                    ) : null}
                    <a
                      href={doc.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-2 inline-block text-sm font-medium text-brand hover:underline"
                    >
                      {doc.kind === "pdf" || doc.kind === "other" ? "Open file" : "View full size"}
                    </a>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </article>
    </div>
  );
}

import Link from "next/link";
import Image from "next/image";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import {
  claimFreeDemolitionElementAction,
  expressDemolitionInterestAction,
} from "@/lib/actions/demolition-alerts";
import { formatDemolitionPricePence } from "@/lib/demolition-display";
import { formatUkLocationLine } from "@/lib/postcode-uk";

type Props = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string; reserved?: string; interest?: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const p = await prisma.demolitionProject.findFirst({
    where: { id, status: "active" },
    select: { title: true, description: true, postcode: true },
  });
  if (!p) return { title: "Demolition alert" };
  const title = `${p.title} | Demolition alert`;
  const desc = `${p.description.slice(0, 155)}… · ${p.postcode}`;
  return { title, description: desc };
}

export default async function DemolitionAlertDetailPage({ params, searchParams }: Props) {
  const { id } = await params;
  const sp = await searchParams;
  const session = await auth();

  const project = await prisma.demolitionProject.findFirst({
    where: { id, status: "active" },
    include: {
      organizer: {
        select: {
          id: true,
          email: true,
          sellerProfile: { select: { displayName: true } },
        },
      },
      elements: { orderBy: { sortOrder: "asc" } },
    },
  });

  if (!project) notFound();

  const organizerLabel =
    project.organizer.sellerProfile?.displayName ?? project.organizer.email ?? "Organiser";

  return (
    <div className="mx-auto w-full max-w-3xl px-[30px] py-8 sm:py-10">
      <nav className="text-sm text-zinc-500">
        <Link href="/demolition-alerts" className="hover:text-zinc-800">
          Demolition alerts
        </Link>
        <span className="mx-2">/</span>
        <span className="text-zinc-800 line-clamp-1">{project.title}</span>
      </nav>

      {sp.error ? (
        <p className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">{sp.error}</p>
      ) : null}
      {sp.reserved ? (
        <p className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-900">
          You have reserved this free lot. The organiser will see your account — check the collection details below
          and message them via your usual contact if needed.
        </p>
      ) : null}
      {sp.interest ? (
        <p className="mt-4 rounded-lg border border-sky-200 bg-sky-50 px-3 py-2 text-sm text-sky-950">
          Interest registered. The organiser can follow up with you.
        </p>
      ) : null}

      <h1 className="mt-4 text-3xl font-semibold tracking-tight text-zinc-900">{project.title}</h1>
      <p className="mt-2 text-sm text-zinc-500">
        Organised by {organizerLabel} ·{" "}
        {formatUkLocationLine({
          postcodeLocality: project.postcodeLocality,
          adminDistrict: project.adminDistrict,
          region: project.region,
          postcode: project.postcode,
        })}
      </p>

      {project.images.length > 0 ? (
        <div className="mt-6 flex gap-2 overflow-x-auto pb-2">
          {project.images.map((url) => (
            <div key={url} className="relative h-40 w-56 shrink-0 overflow-hidden rounded-lg bg-zinc-100">
              <Image src={url} alt="" fill className="object-cover" sizes="224px" unoptimized />
            </div>
          ))}
        </div>
      ) : null}

      <div className="mt-6 space-y-4 text-sm leading-relaxed text-zinc-700">
        <p className="whitespace-pre-wrap">{project.description}</p>
        {project.siteAddress ? (
          <p>
            <span className="font-semibold text-zinc-900">Site: </span>
            {project.siteAddress}
          </p>
        ) : null}
        {project.accessWhereWhen ? (
          <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Where / when to access</p>
            <p className="mt-2 whitespace-pre-wrap">{project.accessWhereWhen}</p>
          </div>
        ) : null}
        {project.conditionsGeneral ? (
          <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">General conditions</p>
            <p className="mt-2 whitespace-pre-wrap">{project.conditionsGeneral}</p>
          </div>
        ) : null}
      </div>

      <h2 className="mt-10 text-lg font-semibold text-zinc-900">Lots</h2>
      <ul className="mt-4 space-y-4">
        {project.elements.map((el) => (
          <li key={el.id} className="rounded-xl border border-zinc-200 bg-white p-4">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <h3 className="font-semibold text-zinc-900">{el.title}</h3>
                {el.quantityNote ? (
                  <p className="text-xs text-zinc-500">{el.quantityNote}</p>
                ) : null}
              </div>
              <div className="text-right text-sm">
                {el.isFree ? (
                  <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-900">
                    Free
                  </span>
                ) : (
                  <span className="font-semibold text-zinc-900">{formatDemolitionPricePence(el.pricePence)}</span>
                )}
              </div>
            </div>
            {el.description ? <p className="mt-2 text-sm text-zinc-600 whitespace-pre-wrap">{el.description}</p> : null}
            {el.removalMustCompleteBy ? (
              <p className="mt-2 text-xs text-zinc-600">
                <span className="font-medium text-zinc-800">Remove by: </span>
                {el.removalMustCompleteBy.toLocaleString("en-GB", {
                  dateStyle: "medium",
                  timeStyle: "short",
                })}
              </p>
            ) : null}
            {el.pickupWhereWhen ? (
              <p className="mt-2 text-xs text-zinc-600 whitespace-pre-wrap">
                <span className="font-medium text-zinc-800">Collection: </span>
                {el.pickupWhereWhen}
              </p>
            ) : null}
            {el.conditions ? (
              <p className="mt-2 text-xs text-zinc-600 whitespace-pre-wrap">
                <span className="font-medium text-zinc-800">Conditions: </span>
                {el.conditions}
              </p>
            ) : null}

            <div className="mt-4 border-t border-zinc-100 pt-4">
              {el.status === "withdrawn" ? (
                <p className="text-sm text-zinc-500">This lot has been withdrawn.</p>
              ) : el.isFree ? (
                el.status === "reserved" ? (
                  <p className="text-sm text-zinc-700">
                    <span className="font-medium text-zinc-900">Reserved</span>
                    {el.claimedById === session?.user?.id ? " — this is your reservation." : " — another party has reserved this lot."}
                  </p>
                ) : (
                  <form action={claimFreeDemolitionElementAction} className="inline">
                    <input type="hidden" name="elementId" value={el.id} />
                    <input type="hidden" name="projectId" value={project.id} />
                    <button
                      type="submit"
                      className="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-hover"
                    >
                      Reserve free lot
                    </button>
                  </form>
                )
              ) : el.status === "available" ? (
                <form action={expressDemolitionInterestAction} className="space-y-2 max-w-md">
                  <input type="hidden" name="elementId" value={el.id} />
                  <input type="hidden" name="projectId" value={project.id} />
                  <label className="block text-xs text-zinc-500">Message (optional)</label>
                  <textarea
                    name="message"
                    rows={2}
                    className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
                    placeholder="Collection dates, questions…"
                  />
                  <button
                    type="submit"
                    className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-semibold text-white hover:bg-zinc-800"
                  >
                    Register interest
                  </button>
                </form>
              ) : (
                <p className="text-sm text-zinc-500">This lot is not available.</p>
              )}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

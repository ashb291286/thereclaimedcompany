import Link from "next/link";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { redirect, notFound } from "next/navigation";
import {
  appendDemolitionElementAction,
  closeDemolitionProjectAction,
  publishDemolitionProjectAction,
  releaseDemolitionReservationAction,
  withdrawDemolitionElementAction,
} from "@/lib/actions/demolition-alerts";
import { formatDemolitionPricePence, maskEmailForOrganizer } from "@/lib/demolition-display";

export default async function ManageDemolitionAlertPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect("/auth/signin");

  const { id } = await params;
  const sp = await searchParams;

  const project = await prisma.demolitionProject.findFirst({
    where: { id, organizerId: session.user.id },
    include: {
      elements: {
        orderBy: { sortOrder: "asc" },
        include: {
          claimedBy: { select: { email: true } },
          interests: {
            orderBy: { createdAt: "desc" },
            include: { user: { select: { email: true } } },
          },
        },
      },
    },
  });

  if (!project) notFound();

  return (
    <div>
      <Link href="/dashboard/demolition-alerts" className="text-sm text-brand hover:underline">
        ← All alerts
      </Link>

      {sp.created ? (
        <p className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-900">
          Alert saved.
        </p>
      ) : null}
      {sp.published ? (
        <p className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-900">
          Published — live on demolition alerts.
        </p>
      ) : null}
      {sp.closed ? (
        <p className="mt-4 rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm text-zinc-800">
          Alert closed — hidden from public browse.
        </p>
      ) : null}
      {sp.released ? (
        <p className="mt-4 rounded-lg border border-sky-200 bg-sky-50 px-3 py-2 text-sm text-sky-950">
          Reservation released; lot is available again.
        </p>
      ) : null}
      {sp.added ? (
        <p className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-900">
          Lot added.
        </p>
      ) : null}
      {sp.withdrawn ? (
        <p className="mt-4 rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm text-zinc-800">
          Lot withdrawn.
        </p>
      ) : null}
      {sp.error ? (
        <p className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">{sp.error}</p>
      ) : null}

      <div className="mt-4 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-900">{project.title}</h1>
          <p className="mt-1 text-sm text-zinc-500">
            {project.postcode} · {project.status}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {project.status === "active" ? (
            <Link
              href={`/demolition-alerts/${project.id}`}
              className="rounded-lg border border-zinc-300 px-3 py-2 text-sm hover:bg-zinc-50"
            >
              View public page
            </Link>
          ) : null}
          {project.status === "draft" ? (
            <form action={publishDemolitionProjectAction}>
              <input type="hidden" name="projectId" value={project.id} />
              <button
                type="submit"
                className="rounded-lg bg-brand px-3 py-2 text-sm font-semibold text-white hover:bg-brand-hover"
              >
                Publish
              </button>
            </form>
          ) : null}
          {project.status === "active" ? (
            <form action={closeDemolitionProjectAction}>
              <input type="hidden" name="projectId" value={project.id} />
              <button
                type="submit"
                className="rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-700 hover:bg-zinc-50"
              >
                Close alert
              </button>
            </form>
          ) : null}
        </div>
      </div>

      <div className="mt-8 rounded-xl border border-zinc-200 bg-white p-5 text-sm text-zinc-700">
        <h2 className="text-sm font-semibold text-zinc-900">Summary</h2>
        <p className="mt-2 whitespace-pre-wrap">{project.description}</p>
      </div>

      <h2 className="mt-10 text-lg font-semibold text-zinc-900">Lots</h2>
      <ul className="mt-4 space-y-6">
        {project.elements.map((el) => (
          <li key={el.id} className="rounded-xl border border-zinc-200 bg-white p-4">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <h3 className="font-medium text-zinc-900">{el.title}</h3>
                <p className="text-xs text-zinc-500">
                  {el.isFree ? "Free" : formatDemolitionPricePence(el.pricePence)} · {el.status}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                {el.status === "reserved" && el.isFree ? (
                  <form action={releaseDemolitionReservationAction}>
                    <input type="hidden" name="elementId" value={el.id} />
                    <button type="submit" className="rounded-lg border border-zinc-300 px-3 py-1.5 text-xs hover:bg-zinc-50">
                      Release reservation
                    </button>
                  </form>
                ) : null}
                {el.status !== "withdrawn" ? (
                  <form action={withdrawDemolitionElementAction}>
                    <input type="hidden" name="elementId" value={el.id} />
                    <button
                      type="submit"
                      className="rounded-lg border border-red-200 px-3 py-1.5 text-xs text-red-800 hover:bg-red-50"
                    >
                      Withdraw lot
                    </button>
                  </form>
                ) : null}
              </div>
            </div>
            {el.status === "reserved" && el.claimedBy?.email ? (
              <p className="mt-2 text-xs text-zinc-600">
                Reserved by <span className="font-medium">{maskEmailForOrganizer(el.claimedBy.email)}</span>
                {el.claimedAt
                  ? ` · ${el.claimedAt.toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" })}`
                  : ""}
              </p>
            ) : null}
            {!el.isFree && el.interests.length > 0 ? (
              <div className="mt-3 border-t border-zinc-100 pt-3">
                <p className="text-xs font-semibold text-zinc-500">Interest ({el.interests.length})</p>
                <ul className="mt-2 space-y-1 text-xs text-zinc-600">
                  {el.interests.map((it) => (
                    <li key={it.id}>
                      {maskEmailForOrganizer(it.user.email)} ·{" "}
                      {it.createdAt.toLocaleString("en-GB", { dateStyle: "short", timeStyle: "short" })}
                      {it.message ? ` — “${it.message.slice(0, 120)}${it.message.length > 120 ? "…" : ""}”` : ""}
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </li>
        ))}
      </ul>

      {project.status !== "closed" ? (
        <div className="mt-10 rounded-xl border border-zinc-200 bg-zinc-50 p-5">
          <h2 className="text-sm font-semibold text-zinc-900">Add another lot</h2>
          <form action={appendDemolitionElementAction} className="mt-4 space-y-3 max-w-lg">
            <input type="hidden" name="projectId" value={project.id} />
            <div>
              <label className="block text-xs text-zinc-500 mb-1">Title</label>
              <input name="title" required className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="block text-xs text-zinc-500 mb-1">Description</label>
              <textarea name="description" rows={2} className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm" />
            </div>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" name="isFree" value="yes" defaultChecked className="rounded border-zinc-300" />
              Free to collector (uncheck if chargeable)
            </label>
            <div>
              <label className="block text-xs text-zinc-500 mb-1">Guide price (£) if chargeable</label>
              <input name="priceGbp" type="number" step="0.01" min={0} className="w-40 rounded-lg border border-zinc-300 px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="block text-xs text-zinc-500 mb-1">Removal complete by</label>
              <input name="removalMustCompleteBy" type="datetime-local" className="rounded-lg border border-zinc-300 px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="block text-xs text-zinc-500 mb-1">Quantity note</label>
              <input name="quantityNote" className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="block text-xs text-zinc-500 mb-1">Collection (where / when)</label>
              <textarea name="pickupWhereWhen" rows={2} className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="block text-xs text-zinc-500 mb-1">Conditions</label>
              <textarea name="conditions" rows={2} className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm" />
            </div>
            <button type="submit" className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800">
              Add lot
            </button>
          </form>
        </div>
      ) : null}
    </div>
  );
}

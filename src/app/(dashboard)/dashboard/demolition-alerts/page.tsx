import Link from "next/link";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { redirect } from "next/navigation";

export default async function DemolitionAlertsDashboardPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/auth/signin");

  const sellerProfile = await prisma.sellerProfile.findUnique({
    where: { userId: session.user.id },
    select: { id: true },
  });
  if (!sellerProfile) redirect("/dashboard/onboarding");

  const projects = await prisma.demolitionProject.findMany({
    where: { organizerId: session.user.id },
    orderBy: { updatedAt: "desc" },
    include: {
      _count: { select: { elements: true } },
    },
  });

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-900">Demolition &amp; refurb alerts</h1>
          <p className="mt-1 text-sm text-zinc-600">
            Manage site-wide alerts, lots, reservations, and buyer interest.
          </p>
        </div>
        <Link
          href="/dashboard/demolition-alerts/new"
          className="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-hover"
        >
          New alert
        </Link>
      </div>

      {projects.length === 0 ? (
        <p className="mt-8 rounded-xl border border-zinc-200 bg-white p-6 text-zinc-600">
          You have no alerts yet.{" "}
          <Link href="/dashboard/demolition-alerts/new" className="font-medium text-brand hover:underline">
            Create one
          </Link>{" "}
          to list multiple salvage lots under one project.
        </p>
      ) : (
        <ul className="mt-6 space-y-3">
          {projects.map((p) => (
            <li key={p.id}>
              <Link
                href={`/dashboard/demolition-alerts/${p.id}`}
                className="block rounded-xl border border-zinc-200 bg-white p-4 transition hover:border-brand/30"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="font-medium text-zinc-900">{p.title}</span>
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                      p.status === "active"
                        ? "bg-emerald-100 text-emerald-900"
                        : p.status === "draft"
                          ? "bg-amber-100 text-amber-900"
                          : "bg-zinc-200 text-zinc-700"
                    }`}
                  >
                    {p.status}
                  </span>
                </div>
                <p className="mt-1 text-xs text-zinc-500">
                  {p.postcode} · {p._count.elements} lot{p._count.elements === 1 ? "" : "s"} · updated{" "}
                  {p.updatedAt.toLocaleDateString("en-GB")}
                </p>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

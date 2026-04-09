import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { isCarbonAdmin } from "@/lib/admin";
import { redirect } from "next/navigation";
import { reviewSeenOnScreenVerificationAction } from "@/lib/actions/prop-yard";

export default async function SeenOnScreenAdminPage({
  searchParams,
}: {
  searchParams: Promise<{ ok?: string; error?: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id || !isCarbonAdmin(session)) redirect("/dashboard");
  const { ok, error } = await searchParams;

  const rows = await prisma.seenOnScreenVerificationRequest.findMany({
    orderBy: { createdAt: "desc" },
    include: { listing: { select: { id: true, title: true } }, requestedBy: { select: { email: true } } },
    take: 200,
  });

  return (
    <div>
      <h1 className="text-2xl font-semibold text-zinc-900">Seen on screen verification</h1>
      {ok ? <p className="mt-3 rounded bg-emerald-50 px-3 py-2 text-sm text-emerald-700">Request updated.</p> : null}
      {error ? <p className="mt-3 rounded bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p> : null}

      <ul className="mt-5 space-y-3">
        {rows.map((r) => (
          <li key={r.id} className="rounded-xl border border-zinc-200 bg-white p-4">
            <p className="font-medium text-zinc-900">{r.listing.title}</p>
            <p className="text-sm text-zinc-600">Production: {r.productionName}</p>
            <p className="text-xs text-zinc-500">Requested by: {r.requestedBy.email ?? "Unknown"} · {r.status}</p>
            {r.note ? <p className="mt-2 text-sm text-zinc-600">{r.note}</p> : null}
            {r.status === "PENDING" ? (
              <div className="mt-3 flex gap-2">
                <form action={reviewSeenOnScreenVerificationAction}>
                  <input type="hidden" name="requestId" value={r.id} />
                  <input type="hidden" name="decision" value="approve" />
                  <button className="rounded-lg bg-emerald-700 px-3 py-1.5 text-xs font-semibold text-white">Approve</button>
                </form>
                <form action={reviewSeenOnScreenVerificationAction}>
                  <input type="hidden" name="requestId" value={r.id} />
                  <input type="hidden" name="decision" value="reject" />
                  <button className="rounded-lg border border-rose-300 px-3 py-1.5 text-xs font-semibold text-rose-700">Reject</button>
                </form>
              </div>
            ) : null}
          </li>
        ))}
      </ul>
    </div>
  );
}

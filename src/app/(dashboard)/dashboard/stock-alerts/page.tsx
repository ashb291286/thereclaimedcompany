import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { redirect } from "next/navigation";
import Link from "next/link";
import { toggleYardStockAlertAction } from "@/lib/actions/yard-stock-alert";
import { publicSellerPath } from "@/lib/yard-public-path";

export default async function StockAlertsPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/auth/signin");

  const alerts = await prisma.yardStockAlert.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "desc" },
    include: {
      seller: {
        include: {
          sellerProfile: true,
        },
      },
      category: { select: { name: true } },
    },
  });

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="text-2xl font-semibold text-zinc-900">Stock alerts</h1>
      <p className="mt-1 text-sm text-zinc-600">
        We notify you when a followed yard or dealer lists new marketplace stock that matches your alert.
      </p>

      {alerts.length === 0 ? (
        <p className="mt-8 rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-6 text-sm text-zinc-600">
          You are not following any sellers yet. Open a yard or dealer profile and choose
          &quot;Favourite ... &amp; get alerts&quot;.
        </p>
      ) : (
        <ul className="mt-6 space-y-3">
          {alerts.map((a) => {
            const sp = a.seller.sellerProfile;
            const slug = sp?.yardSlug;
            const href =
              a.seller.role === "reclamation_yard" && slug
                ? `/yards/${slug}`
                : publicSellerPath({
                    sellerId: a.sellerId,
                    role: a.seller.role,
                    yardSlug: slug,
                  });
            const title = sp?.businessName?.trim() || sp?.displayName || "Seller";
            return (
              <li
                key={a.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-zinc-200 bg-white px-4 py-3"
              >
                <div>
                  <Link href={href} className="font-medium text-brand hover:underline">
                    {title}
                  </Link>
                  <p className="text-xs text-zinc-500">
                    {a.categoryId ? `Category: ${a.category?.name ?? "—"}` : "All new marketplace listings"}
                  </p>
                </div>
                <form action={toggleYardStockAlertAction}>
                  <input type="hidden" name="callbackUrl" value="/dashboard/stock-alerts" />
                  <input type="hidden" name="sellerId" value={a.sellerId} />
                  <input type="hidden" name="sellerPath" value={href} />
                  <input type="hidden" name="categoryId" value={a.categoryId ?? "all"} />
                  <button
                    type="submit"
                    className="text-sm font-medium text-red-700 hover:underline"
                  >
                    Unfollow
                  </button>
                </form>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

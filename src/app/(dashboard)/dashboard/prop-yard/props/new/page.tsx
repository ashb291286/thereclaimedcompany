import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { createPropOnlyListingAndOfferAction } from "@/lib/actions/prop-yard";
import { CONDITION_LABELS } from "@/lib/constants";
import { PROP_YARD_RECOMMENDED_WEEKLY_RATE_OF_LIST_PRICE } from "@/lib/prop-yard";

type Props = { searchParams: Promise<{ error?: string }> };

export default async function NewPropOnlyPage({ searchParams }: Props) {
  const session = await auth();
  if (!session?.user?.id) redirect("/auth/signin");

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { role: true },
  });
  if (user?.role !== "reclamation_yard") {
    redirect("/dashboard?error=" + encodeURIComponent("Hire-only props are for reclamation yard accounts."));
  }

  const { error } = await searchParams;
  const categories = await prisma.category.findMany({
    where: { parentId: null },
    orderBy: { name: "asc" },
  });

  const pct = Math.round(PROP_YARD_RECOMMENDED_WEEKLY_RATE_OF_LIST_PRICE * 100);

  return (
    <div>
      <Link href="/dashboard/prop-yard" className="text-sm text-brand hover:underline">
        ← Prop Yard dashboard
      </Link>
      <h1 className="mt-4 text-2xl font-semibold text-zinc-900">Add hire-only prop</h1>
      <p className="mt-2 max-w-2xl text-sm text-zinc-600">
        Creates an item that appears in <strong>The Prop Yard</strong> only — not in marketplace search or your public
        yard shop. Use a <strong>reference list price</strong> for hire maths (e.g. {pct}%/week suggestion); it is not
        a live “buy now” price. Paste image URLs from{" "}
        <Link href="/dashboard/sell" className="font-medium text-brand underline">
          List an item
        </Link>{" "}
        uploads or elsewhere (comma-separated).
      </p>

      {error ? (
        <p className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{decodeURIComponent(error)}</p>
      ) : null}

      <form action={createPropOnlyListingAndOfferAction} className="mt-8 max-w-xl space-y-4">
        <div>
          <label className="block text-xs font-medium text-zinc-800">Title</label>
          <input name="title" required className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm" />
        </div>
        <div>
          <label className="block text-xs font-medium text-zinc-800">Description</label>
          <textarea
            name="description"
            required
            rows={5}
            className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-zinc-800">Condition</label>
          <select name="condition" required className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm">
            {Object.entries(CONDITION_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-zinc-800">Category</label>
          <select name="categoryId" className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm">
            <option value="">Select…</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          <p className="mt-1 text-xs text-zinc-500">Or suggest a new one:</p>
          <input
            name="newCategoryName"
            placeholder="New category name (optional)"
            className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-zinc-800">Item postcode (UK)</label>
          <input
            name="postcode"
            required
            placeholder="e.g. NG1 6FQ"
            className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-zinc-800">Image URLs (comma-separated)</label>
          <textarea
            name="images"
            required
            rows={2}
            placeholder="https://…, https://…"
            className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-zinc-800">Reference list price (£)</label>
          <input
            name="listPriceGbp"
            type="number"
            step="0.01"
            min="0.5"
            required
            className="mt-1 w-full max-w-xs rounded-lg border border-zinc-300 px-3 py-2 text-sm"
          />
          <p className="mt-1 text-xs text-zinc-500">Not shown as a purchase price on the marketplace.</p>
        </div>
        <div>
          <label className="block text-xs font-medium text-zinc-800">Weekly hire (£)</label>
          <input
            name="weeklyHireGbp"
            type="number"
            step="0.01"
            min="1"
            required
            className="mt-1 w-full max-w-xs rounded-lg border border-zinc-300 px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-zinc-800">Minimum hire (weeks)</label>
          <input
            name="minimumHireWeeks"
            type="number"
            min="1"
            max="52"
            defaultValue={1}
            required
            className="mt-1 w-full max-w-xs rounded-lg border border-zinc-300 px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-zinc-800">Notes for hirers (optional)</label>
          <textarea name="yardHireNotes" rows={3} className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm" />
        </div>
        <button
          type="submit"
          className="rounded-lg bg-amber-900 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-950"
        >
          Publish hire-only prop
        </button>
      </form>
    </div>
  );
}

import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { redirect } from "next/navigation";
import Link from "next/link";
import { isCarbonAdmin } from "@/lib/admin";
import { createCarbonFactorAction, updateCarbonFactorAction } from "@/lib/actions/carbon-admin";

export default async function AdminCarbonFactorsPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/auth/signin");
  if (!isCarbonAdmin(session)) {
    return (
      <div className="rounded-xl border border-amber-200 bg-amber-50 p-6 text-sm text-amber-950">
        You don&apos;t have access to carbon factor administration. Set{" "}
        <code className="rounded bg-amber-100 px-1">ADMIN_EMAILS</code> to include your account email.
      </div>
    );
  }

  const factors = await prisma.carbonFactor.findMany({
    orderBy: [{ materialType: "asc" }, { unitType: "asc" }],
  });

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-900">Carbon factors</h1>
          <p className="mt-1 max-w-xl text-sm text-zinc-600">
            Edit ICE-style embodied carbon values used for listing estimates. Saved changes invalidate the cached
            factor table.
          </p>
        </div>
        <Link href="/dashboard" className="text-sm font-medium text-brand hover:underline">
          Dashboard
        </Link>
      </div>

      <ul className="space-y-4">
        {factors.map((f) => (
          <li
            key={f.id}
            className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm sm:p-5"
          >
            <form action={updateCarbonFactorAction} className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end">
              <input type="hidden" name="id" value={f.id} />
              <div className="min-w-[140px]">
                <p className="text-xs font-medium text-zinc-500">Material</p>
                <p className="font-mono text-sm text-zinc-900">
                  {f.materialType} · {f.unitType}
                </p>
              </div>
              <label className="min-w-[160px] flex-1 text-sm">
                <span className="text-zinc-600">Display label</span>
                <input
                  name="label"
                  defaultValue={f.label}
                  required
                  className="mt-1 w-full rounded-lg border border-zinc-200 px-3 py-2"
                />
              </label>
              <label className="w-full sm:w-32 text-sm">
                <span className="text-zinc-600">CO₂e / unit</span>
                <input
                  name="co2PerUnit"
                  type="number"
                  step="any"
                  min={0}
                  required
                  defaultValue={f.co2PerUnit}
                  className="mt-1 w-full rounded-lg border border-zinc-200 px-3 py-2"
                />
              </label>
              <label className="w-full sm:w-36 text-sm">
                <span className="text-zinc-600">Density kg/m³</span>
                <input
                  name="densityKgPerM3"
                  type="number"
                  step="any"
                  min={0}
                  placeholder="optional"
                  defaultValue={f.densityKgPerM3 ?? ""}
                  className="mt-1 w-full rounded-lg border border-zinc-200 px-3 py-2"
                />
              </label>
              <label className="min-w-[140px] flex-1 text-sm">
                <span className="text-zinc-600">Source</span>
                <input
                  name="source"
                  defaultValue={f.source}
                  className="mt-1 w-full rounded-lg border border-zinc-200 px-3 py-2"
                />
              </label>
              <button
                type="submit"
                className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800"
              >
                Save
              </button>
            </form>
          </li>
        ))}
      </ul>

      <section className="mt-10 rounded-xl border border-zinc-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-zinc-900">Add material</h2>
        <p className="mt-1 text-sm text-zinc-600">
          Use a unique material slug. A <code className="rounded bg-zinc-100 px-1">kg</code> row appears in the listing
          form dropdown.
        </p>
        <form action={createCarbonFactorAction} className="mt-4 grid max-w-lg gap-3">
          <label className="block text-sm">
            <span className="text-zinc-600">materialType (slug)</span>
            <input
              name="materialType"
              required
              className="mt-1 w-full rounded-lg border border-zinc-200 px-3 py-2"
              placeholder="slate"
            />
          </label>
          <label className="block text-sm">
            <span className="text-zinc-600">unitType</span>
            <select name="unitType" required className="mt-1 w-full rounded-lg border border-zinc-200 px-3 py-2">
              <option value="kg">kg</option>
              <option value="m3">m3</option>
              <option value="tonne">tonne</option>
            </select>
          </label>
          <label className="block text-sm">
            <span className="text-zinc-600">Label</span>
            <input name="label" required className="mt-1 w-full rounded-lg border border-zinc-200 px-3 py-2" />
          </label>
          <label className="block text-sm">
            <span className="text-zinc-600">kg CO₂e per unit</span>
            <input
              name="co2PerUnit"
              type="number"
              step="any"
              min={0}
              required
              className="mt-1 w-full rounded-lg border border-zinc-200 px-3 py-2"
            />
          </label>
          <label className="block text-sm">
            <span className="text-zinc-600">Density kg/m³ (optional)</span>
            <input
              name="densityKgPerM3"
              type="number"
              step="any"
              min={0}
              className="mt-1 w-full rounded-lg border border-zinc-200 px-3 py-2"
            />
          </label>
          <label className="block text-sm">
            <span className="text-zinc-600">Source</span>
            <input
              name="source"
              defaultValue="ICE Database"
              className="mt-1 w-full rounded-lg border border-zinc-200 px-3 py-2"
            />
          </label>
          <button
            type="submit"
            className="w-fit rounded-lg bg-emerald-700 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-800"
          >
            Create factor
          </button>
        </form>
      </section>
    </div>
  );
}

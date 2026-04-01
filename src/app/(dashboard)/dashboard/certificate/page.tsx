import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { redirect } from "next/navigation";
import Link from "next/link";
import { CertificatePrintButton } from "@/components/CertificatePrintButton";

export default async function CarbonCertificatePage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/auth/signin");

  const orders = await prisma.order.findMany({
    where: { buyerId: session.user.id, status: "paid" },
    select: { purchaseCarbonSavedKg: true, purchaseWasteDivertedKg: true },
  });

  const totalCo2Kg = orders.reduce((s, o) => s + (o.purchaseCarbonSavedKg ?? 0), 0);
  const totalWasteKg = orders.reduce((s, o) => s + (o.purchaseWasteDivertedKg ?? 0), 0);
  const tonnes = totalCo2Kg / 1000;

  return (
    <div className="print:bg-white">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4 print:hidden">
        <Link href="/orders" className="text-sm font-medium text-brand hover:underline">
          ← Back to orders
        </Link>
        <CertificatePrintButton />
      </div>

      <article className="mx-auto max-w-2xl rounded-2xl border border-emerald-200/80 bg-gradient-to-br from-emerald-50 via-white to-teal-50/90 p-8 shadow-sm print:border-0 print:shadow-none">
        <p className="text-xs font-semibold uppercase tracking-widest text-emerald-800/80">
          Reclaimed Marketplace
        </p>
        <h1 className="mt-2 text-2xl font-semibold text-zinc-900">Carbon impact certificate</h1>
        <p className="mt-2 text-sm text-zinc-600">
          Issued for <strong className="text-zinc-800">{session.user.email ?? session.user.name ?? "Account holder"}</strong>
        </p>
        <p className="mt-1 text-xs text-zinc-500">{new Date().toLocaleDateString("en-GB", { dateStyle: "long" })}</p>

        <div className="mt-8 space-y-4 rounded-xl border border-emerald-100 bg-white/80 p-6">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">Total CO₂e avoided (vs new)</p>
            <p className="mt-1 text-3xl font-semibold tabular-nums text-emerald-900">
              {totalCo2Kg.toLocaleString(undefined, { maximumFractionDigits: 1 })} kg
            </p>
            {tonnes >= 0.01 ? (
              <p className="text-sm text-zinc-600">
                ≈ {tonnes.toLocaleString(undefined, { maximumFractionDigits: 3 })} tonnes CO₂e
              </p>
            ) : null}
          </div>
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">Mass kept in use (indicative)</p>
            <p className="mt-1 text-xl font-semibold tabular-nums text-zinc-900">
              {totalWasteKg.toLocaleString(undefined, { maximumFractionDigits: 1 })} kg
            </p>
          </div>
          <p className="text-xs leading-relaxed text-zinc-600">
            Based on completed purchases on this platform. Figures are estimates from embodied carbon factors
            (ICE Database, University of Bath), aligned with common UK construction practice and indicative of
            BREEAM / RICS whole-life carbon approaches — not a substitute for a formal Environmental Product
            Declaration (EPD).
          </p>
        </div>
      </article>
    </div>
  );
}

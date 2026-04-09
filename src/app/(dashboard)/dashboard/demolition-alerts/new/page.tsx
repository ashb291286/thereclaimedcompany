import Link from "next/link";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { redirect } from "next/navigation";
import { DemolitionProjectCreateForm } from "../DemolitionProjectCreateForm";

export default async function NewDemolitionAlertPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect("/auth/signin?callbackUrl=%2Fdashboard%2Fdemolition-alerts%2Fnew");

  const sellerProfile = await prisma.sellerProfile.findUnique({
    where: { userId: session.user.id },
    select: { postcode: true },
  });
  if (!sellerProfile) redirect("/dashboard/onboarding");

  const { error } = await searchParams;

  return (
    <div>
      <Link href="/dashboard/demolition-alerts" className="text-sm text-brand hover:underline">
        ← Back to alerts
      </Link>
      <h1 className="mt-4 text-2xl font-semibold text-zinc-900">New demolition / refurb alert</h1>
      <p className="mt-1 max-w-2xl text-sm text-zinc-600">
        One project (site) with many lots. Free lots can be reserved by signed-in buyers and yards; chargeable lots
        collect registered interest for you to arrange payment and pickup offline (or future in-app checkout).
      </p>
      {error ? (
        <p className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">{error}</p>
      ) : null}
      <div className="mt-8">
        <DemolitionProjectCreateForm defaultPostcode={sellerProfile.postcode} />
      </div>
    </div>
  );
}

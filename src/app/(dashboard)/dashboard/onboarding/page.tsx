import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { redirect } from "next/navigation";
import { completeSellerOnboarding } from "@/lib/actions/onboarding";
import { YardFieldsToggle } from "./YardFieldsToggle";

export default async function OnboardingPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/auth/signin");

  const existing = await prisma.sellerProfile.findUnique({
    where: { userId: session.user.id },
  });
  if (existing) redirect("/dashboard");

  return (
    <div className="mx-auto max-w-lg">
      <h1 className="text-2xl font-semibold text-zinc-900">Seller profile</h1>
      <p className="mt-1 text-zinc-600">
        Choose how you want to sell and add your details.
      </p>
      <form action={completeSellerOnboarding} className="mt-8 space-y-6">
        <YardFieldsToggle />
        <div>
          <label htmlFor="displayName" className="block text-sm font-medium text-zinc-700 mb-1">
            Display name
          </label>
          <input
            id="displayName"
            name="displayName"
            type="text"
            required
            placeholder="How you want to appear to buyers"
            className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-zinc-900 focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
          />
        </div>
        <div>
          <label htmlFor="postcode" className="block text-sm font-medium text-zinc-700 mb-1">
            Postcode
          </label>
          <input
            id="postcode"
            name="postcode"
            type="text"
            required
            placeholder="e.g. SW1A 1AA"
            className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-zinc-900 focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
          />
        </div>
        <button
          type="submit"
          className="w-full rounded-lg bg-brand px-4 py-2.5 font-medium text-white hover:bg-brand-hover focus:outline-none focus:ring-2 focus:ring-brand focus:ring-offset-2"
        >
          Continue
        </button>
      </form>
    </div>
  );
}

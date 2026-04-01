import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { redirect } from "next/navigation";
import { completeSellerOnboarding } from "@/lib/actions/onboarding";
import { YardFieldsToggle } from "./YardFieldsToggle";
import { PostcodeLookupField } from "@/components/PostcodeLookupField";

export default async function OnboardingPage({
  searchParams,
}: {
  searchParams: Promise<{ welcome?: string; error?: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect("/auth/signin");

  const { welcome, error } = await searchParams;

  const existing = await prisma.sellerProfile.findUnique({
    where: { userId: session.user.id },
  });
  if (existing) redirect("/dashboard");

  return (
    <div className="mx-auto max-w-lg">
      {welcome === "1" && (
        <div className="mb-6 rounded-xl border border-brand/25 bg-brand-soft/50 px-4 py-3 text-sm text-zinc-800">
          <p className="font-semibold text-zinc-900">Welcome to Reclaimed Marketplace</p>
          <p className="mt-1 text-zinc-700">
            You&apos;re signed in. Complete this short seller profile to list items and receive orders.
          </p>
        </div>
      )}
      <div className="mb-6 flex gap-2 text-xs font-medium text-zinc-500">
        <span className="rounded-full bg-brand px-2.5 py-1 text-white">1 · Account</span>
        <span className="text-zinc-400">→</span>
        <span className="rounded-full bg-zinc-200 px-2.5 py-1 text-zinc-800">2 · Seller profile</span>
      </div>
      <h1 className="text-2xl font-semibold text-zinc-900">Set up your seller profile</h1>
      <p className="mt-1 text-zinc-600">
        How you appear to buyers and where your items are generally located.
      </p>
      {error && (
        <p className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
      )}
      <form action={completeSellerOnboarding} className="mt-8 space-y-6">
        <YardFieldsToggle />
        <div>
          <label htmlFor="displayName" className="mb-1 block text-sm font-medium text-zinc-700">
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
          <label htmlFor="postcode" className="mb-1 block text-sm font-medium text-zinc-700">
            Postcode
          </label>
          <PostcodeLookupField id="postcode" name="postcode" required placeholder="e.g. SW1A 1AA" />
        </div>
        <button
          type="submit"
          className="w-full rounded-lg bg-brand px-4 py-2.5 font-medium text-white hover:bg-brand-hover focus:outline-none focus:ring-2 focus:ring-brand focus:ring-offset-2"
        >
          Continue to list an item
        </button>
      </form>
    </div>
  );
}

import Link from "next/link";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import {
  updateAccountEmailAction,
  updateAccountPasswordAction,
  updateAccountTypeAction,
} from "@/lib/actions/account";
import { getBidCardSummaryForUser } from "@/lib/actions/bid-payment";
import { redirect } from "next/navigation";
import { AccountAuctionCardSection } from "./AccountAuctionCardSection";

export default async function AccountPage({
  searchParams,
}: {
  searchParams: Promise<{ ok?: string; error?: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect("/auth/signin");
  const { ok, error } = await searchParams;

  const [user, sellerProfile] = await Promise.all([
    prisma.user.findUnique({
      where: { id: session.user.id },
      select: { email: true, role: true },
    }),
    prisma.sellerProfile.findUnique({
      where: { userId: session.user.id },
      select: { id: true, businessName: true, yardSlug: true },
    }),
  ]);

  if (!user) redirect("/auth/signin");

  const bidCardSummary = await getBidCardSummaryForUser(session.user.id);

  return (
    <div>
      <h1 className="text-2xl font-semibold text-zinc-900">Account management</h1>
      <p className="mt-1 text-sm text-zinc-600">
        Manage sign-in details, saved card for auctions, account type, and yard setup.
      </p>

      {ok ? (
        <p className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
          {ok}
        </p>
      ) : null}
      {error ? (
        <p className="mt-4 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-800">
          {error}
        </p>
      ) : null}

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <section className="rounded-xl border border-zinc-200 bg-white p-5">
          <h2 className="text-base font-semibold text-zinc-900">Email</h2>
          <p className="mt-1 text-sm text-zinc-600">Current: {user.email}</p>
          <form action={updateAccountEmailAction} className="mt-4 space-y-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-zinc-600">New email</label>
              <input
                name="email"
                type="email"
                required
                className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-zinc-600">Current password</label>
              <input
                name="currentPassword"
                type="password"
                autoComplete="current-password"
                required
                className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
              />
            </div>
            <button className="rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand-hover">
              Update email
            </button>
          </form>
        </section>

        <section className="rounded-xl border border-zinc-200 bg-white p-5">
          <h2 className="text-base font-semibold text-zinc-900">Password</h2>
          <p className="mt-1 text-sm text-zinc-600">Use at least 8 characters.</p>
          <form action={updateAccountPasswordAction} className="mt-4 space-y-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-zinc-600">Current password</label>
              <input
                name="currentPassword"
                type="password"
                autoComplete="current-password"
                required
                className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-zinc-600">New password</label>
              <input
                name="newPassword"
                type="password"
                autoComplete="new-password"
                minLength={8}
                required
                className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-zinc-600">Confirm new password</label>
              <input
                name="confirmPassword"
                type="password"
                autoComplete="new-password"
                minLength={8}
                required
                className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
              />
            </div>
            <button className="rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand-hover">
              Update password
            </button>
          </form>
        </section>
      </div>

      <div className="mt-4">
        <AccountAuctionCardSection card={bidCardSummary} />
      </div>

      <section className="mt-4 rounded-xl border border-zinc-200 bg-white p-5">
        <h2 className="text-base font-semibold text-zinc-900">Account type</h2>
        <p className="mt-1 text-sm text-zinc-600">
          Current type: <span className="font-medium">{user.role ?? "individual"}</span>
        </p>
        <form action={updateAccountTypeAction} className="mt-4 flex flex-wrap items-center gap-3">
          <select
            name="accountType"
            defaultValue={user.role ?? "individual"}
            className="rounded-lg border border-zinc-300 px-3 py-2 text-sm"
          >
            <option value="individual">Individual</option>
            <option value="reclamation_yard">Reclamation yard</option>
          </select>
          <button className="rounded-lg border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-800 hover:bg-zinc-50">
            Save account type
          </button>
        </form>
      </section>

      <section className="mt-4 rounded-xl border border-zinc-200 bg-white p-5">
        <h2 className="text-base font-semibold text-zinc-900">Yard setup</h2>
        {sellerProfile ? (
          <p className="mt-1 text-sm text-zinc-600">
            Seller profile is active{sellerProfile.businessName ? ` as ${sellerProfile.businessName}` : ""}.
          </p>
        ) : (
          <p className="mt-1 text-sm text-zinc-600">No seller/yard profile yet.</p>
        )}
        <div className="mt-4 flex flex-wrap gap-3">
          {!sellerProfile ? (
            <Link
              href="/dashboard/onboarding?welcome=1"
              className="rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand-hover"
            >
              Add seller or yard profile
            </Link>
          ) : (
            <Link
              href="/dashboard/seller-profile"
              className="rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand-hover"
            >
              Edit yard profile
            </Link>
          )}
          {sellerProfile?.yardSlug ? (
            <Link
              href={`/reclamation-yard/${sellerProfile.yardSlug}`}
              className="rounded-lg border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50"
            >
              View public yard page
            </Link>
          ) : null}
        </div>
      </section>
    </div>
  );
}

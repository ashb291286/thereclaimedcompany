import Link from "next/link";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { isCarbonAdmin } from "@/lib/admin";
import {
  adminCreateBlogPostAction,
  adminDeleteBlogPostAction,
  adminDeleteListingAction,
  adminPurgeReadNotificationsAction,
  adminSetListingStatusAction,
  adminSetListingVisibilityAction,
  adminSetBlogPublishedAction,
  adminCreateOnboardedSellerAction,
  adminAssignListingToUserAction,
  adminSetUserRoleAction,
  adminUpdateMarketplaceFeesAction,
  adminToggleUserSuspensionAction,
} from "@/lib/actions/admin-overview";
import { calculateMarketplaceFees } from "@/lib/marketplace-fees";
import { SellerProfileImportForm } from "./SellerProfileImportForm";
import { BlogFeaturedImageField } from "./BlogFeaturedImageField";

export default async function AdminOverviewPage({
  searchParams,
}: {
  searchParams: Promise<{
    error?: string;
    userQ?: string;
    yardQ?: string;
    listingQ?: string;
    notifQ?: string;
  }>;
}) {
  const session = await auth();
  if (!session?.user?.id) return null;
  if (!isCarbonAdmin(session)) {
    return (
      <div className="rounded-xl border border-amber-200 bg-amber-50 p-6 text-sm text-amber-950">
        You don&apos;t have access. Add your email to{" "}
        <code className="rounded bg-amber-100 px-1">ADMIN_EMAILS</code>.
      </div>
    );
  }

  const { error, userQ: rawUserQ, yardQ: rawYardQ, listingQ: rawListingQ, notifQ: rawNotifQ } =
    await searchParams;
  const userQ = rawUserQ?.trim() ?? "";
  const yardQ = rawYardQ?.trim() ?? "";
  const listingQ = rawListingQ?.trim() ?? "";
  const notifQ = rawNotifQ?.trim() ?? "";
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const notifSearchWhere = notifQ
    ? {
        OR: [
          { id: { contains: notifQ } },
          { type: { contains: notifQ, mode: "insensitive" as const } },
          { title: { contains: notifQ, mode: "insensitive" as const } },
          { body: { contains: notifQ, mode: "insensitive" as const } },
          { user: { email: { contains: notifQ, mode: "insensitive" as const } } },
          { user: { id: { contains: notifQ } } },
        ],
      }
    : undefined;

  const [
    users,
    yards,
    listings,
    bids,
    endedAuctions,
    myListings,
    stats,
    notifByType,
    recentNotifications,
    notificationTotal,
    notificationUnread,
    blogPosts,
    feeSettings,
    onboardedProfiles,
  ] = await Promise.all([
    prisma.user.findMany({
      where: userQ
        ? {
            OR: [
              { id: { contains: userQ } },
              { email: { contains: userQ, mode: "insensitive" } },
              { name: { contains: userQ, mode: "insensitive" } },
              {
                sellerProfile: {
                  is: {
                    OR: [
                      { displayName: { contains: userQ, mode: "insensitive" } },
                      { businessName: { contains: userQ, mode: "insensitive" } },
                      { yardSlug: { contains: userQ, mode: "insensitive" } },
                    ],
                  },
                },
              },
            ],
          }
        : undefined,
      orderBy: { createdAt: "desc" },
      take: 20,
      include: {
        sellerProfile: {
          select: { displayName: true, businessName: true, postcode: true, yardSlug: true },
        },
        _count: {
          select: { listings: true, bids: true, offersMade: true },
        },
      },
    }),
    prisma.sellerProfile.findMany({
      where: yardQ
        ? {
            OR: [
              { id: { contains: yardQ } },
              { displayName: { contains: yardQ, mode: "insensitive" } },
              { businessName: { contains: yardQ, mode: "insensitive" } },
              { yardSlug: { contains: yardQ, mode: "insensitive" } },
              { postcode: { contains: yardQ, mode: "insensitive" } },
              { user: { id: { contains: yardQ } } },
              { user: { email: { contains: yardQ, mode: "insensitive" } } },
            ],
          }
        : undefined,
      orderBy: { updatedAt: "desc" },
      take: 20,
      include: {
        user: {
          select: {
            id: true,
            email: true,
            suspendedAt: true,
            _count: { select: { listings: true } },
          },
        },
      },
    }),
    prisma.listing.findMany({
      where: listingQ
        ? {
            OR: [
              { id: { contains: listingQ } },
              { title: { contains: listingQ, mode: "insensitive" } },
              { sellerId: { contains: listingQ } },
              { seller: { email: { contains: listingQ, mode: "insensitive" } } },
              { category: { name: { contains: listingQ, mode: "insensitive" } } },
            ],
          }
        : undefined,
      orderBy: { updatedAt: "desc" },
      take: 20,
      include: {
        seller: { select: { id: true, email: true, suspendedAt: true } },
        category: { select: { name: true, slug: true } },
      },
    }),
    prisma.bid.findMany({
      orderBy: { createdAt: "desc" },
      take: 120,
      include: {
        listing: { select: { id: true, title: true, sellerId: true, status: true, auctionEndsAt: true } },
        bidder: { select: { id: true, email: true } },
      },
    }),
    prisma.listing.findMany({
      where: { listingKind: "auction", status: { in: ["ended", "sold", "payment_pending"] } },
      orderBy: { updatedAt: "desc" },
      take: 80,
      include: {
        seller: { select: { id: true, email: true } },
        bids: { orderBy: { amountPence: "desc" }, take: 1, select: { amountPence: true, bidderId: true } },
        orders: { orderBy: { createdAt: "desc" }, take: 1, select: { id: true, status: true, amount: true } },
      },
    }),
    prisma.listing.findMany({
      where: { sellerId: session.user.id },
      orderBy: { updatedAt: "desc" },
      take: 24,
      include: {
        category: { select: { name: true } },
      },
    }),
    Promise.all([
      prisma.user.count(),
      prisma.user.count({ where: { suspendedAt: { not: null } } }),
      prisma.sellerProfile.count(),
      prisma.listing.count(),
      prisma.listing.count({ where: { status: "active" } }),
      prisma.listing.count({ where: { listingKind: "auction", status: "active" } }),
    ]),
    prisma.notification.groupBy({
      by: ["type"],
      where: { createdAt: { gte: thirtyDaysAgo } },
      _count: { id: true },
    }),
    prisma.notification.findMany({
      where: notifSearchWhere,
      take: 20,
      orderBy: { createdAt: "desc" },
      include: { user: { select: { id: true, email: true } } },
    }),
    prisma.notification.count(),
    prisma.notification.count({ where: { readAt: null } }),
    prisma.blogPost.findMany({
      orderBy: { createdAt: "desc" },
      take: 20,
      select: {
        id: true,
        title: true,
        slug: true,
        published: true,
        publishedAt: true,
        createdAt: true,
      },
    }),
    prisma.marketplaceFeeSettings.findUnique({ where: { id: "default" } }),
    prisma.sellerProfile.findMany({
      where: { importedByAdmin: true },
      orderBy: { updatedAt: "desc" },
      take: 20,
      include: {
        user: {
          select: {
            id: true,
            role: true,
            _count: { select: { listings: true, ordersAsSeller: true } },
          },
        },
      },
    }),
  ]);
  const effectiveFeeSettings = {
    commissionPercentBps: feeSettings?.commissionPercentBps ?? 1000,
    commissionFixedPence: feeSettings?.commissionFixedPence ?? 20,
    commissionVatRateBps: feeSettings?.commissionVatRateBps ?? 2000,
    stripeFeePercentBps: feeSettings?.stripeFeePercentBps ?? 150,
    stripeFeeFixedPence: feeSettings?.stripeFeeFixedPence ?? 20,
    digitalMarketplaceFeeBps: feeSettings?.digitalMarketplaceFeeBps ?? 0,
    digitalMarketplaceFeeFixedPence: feeSettings?.digitalMarketplaceFeeFixedPence ?? 0,
  };
  const sample = calculateMarketplaceFees(10000, effectiveFeeSettings);

  const [userCount, suspendedCount, yardCount, listingCount, activeListingCount, activeAuctionCount] = stats;
  const notifByTypeSorted = [...notifByType].sort((a, b) => b._count.id - a._count.id);
  const smtpConfigured = Boolean(process.env.SMTP_USER?.trim() && process.env.SMTP_PASS?.trim());
  const gaMeasurementId = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID?.trim() ?? "";
  const gaPropertyId = process.env.NEXT_PUBLIC_GA_PROPERTY_ID?.trim() ?? "";
  const gaConnected = Boolean(gaMeasurementId);
  const gaRealtimeUrl = gaPropertyId
    ? `https://analytics.google.com/analytics/web/#/p${encodeURIComponent(gaPropertyId)}/reports/realtime`
    : "https://analytics.google.com/analytics/web/";
  const gaReportsUrl = gaPropertyId
    ? `https://analytics.google.com/analytics/web/#/p${encodeURIComponent(gaPropertyId)}/reports`
    : "https://analytics.google.com/analytics/web/";
  const smtpFromPreview =
    process.env.MAIL_FROM?.trim() ||
    process.env.SMTP_FROM?.trim() ||
    "Reclaimed Marketplace <nowthen@thereclaimedcompany.com>";

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-900">Admin overview</h1>
          <p className="mt-1 max-w-3xl text-sm text-zinc-600">
            Users, yards, listings, and auction activity in one place. Actions here are live and affect production
            data.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/dashboard/admin/bulk-listings" className="rounded-lg border border-zinc-300 px-3 py-1.5 text-sm hover:bg-zinc-50">
            Bulk listings
          </Link>
          <Link href="/dashboard/admin/marketplace-categories" className="rounded-lg border border-zinc-300 px-3 py-1.5 text-sm hover:bg-zinc-50">
            Categories
          </Link>
          <Link href="/dashboard/admin/woocommerce-sync" className="rounded-lg border border-zinc-300 px-3 py-1.5 text-sm hover:bg-zinc-50">
            WooCommerce
          </Link>
        </div>
      </div>

      {error === "delete_blocked" ? (
        <p className="mb-4 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-900">
          Listing delete was blocked by related records (e.g. orders). Set status/visibility instead.
        </p>
      ) : null}
      {error === "blog_slug_taken" ? (
        <p className="mb-4 rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-800">
          Blog slug already exists. Use a unique slug.
        </p>
      ) : null}
      {error === "onboard_missing" ? (
        <p className="mb-4 rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-800">
          Onboarding requires display name and a valid postcode.
        </p>
      ) : null}
      {error === "onboard_postcode" ? (
        <p className="mb-4 rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-800">
          Onboarding failed: postcode could not be validated.
        </p>
      ) : null}
      {error === "onboard_slug_taken" ? (
        <p className="mb-4 rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-800">
          That yard slug is already in use. Choose another or leave it blank for auto-allocation.
        </p>
      ) : null}
      {error === "onboard_target" ? (
        <p className="mb-4 rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-800">
          Listing assignment target must be an imported admin-onboarded seller profile.
        </p>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        <div className="rounded-xl border border-zinc-200 bg-white p-4">
          <p className="text-xs uppercase tracking-wide text-zinc-500">Users</p>
          <p className="mt-1 text-2xl font-semibold text-zinc-900">{userCount}</p>
          <p className="text-xs text-zinc-500">{suspendedCount} suspended</p>
        </div>
        <div className="rounded-xl border border-zinc-200 bg-white p-4">
          <p className="text-xs uppercase tracking-wide text-zinc-500">Yards</p>
          <p className="mt-1 text-2xl font-semibold text-zinc-900">{yardCount}</p>
        </div>
        <div className="rounded-xl border border-zinc-200 bg-white p-4">
          <p className="text-xs uppercase tracking-wide text-zinc-500">Listings</p>
          <p className="mt-1 text-2xl font-semibold text-zinc-900">{listingCount}</p>
          <p className="text-xs text-zinc-500">{activeListingCount} active · {activeAuctionCount} active auctions</p>
        </div>
      </div>

      <section id="notifications" className="mt-8 rounded-xl border border-zinc-200 bg-white p-4">
        <h2 className="text-lg font-semibold text-zinc-900">Live fee settings (Stripe Connect)</h2>
        <p className="mt-1 text-sm text-zinc-600">
          The platform takes an application fee on each payment: commission (+ VAT), estimated Stripe processing fee, and any mandatory digital marketplace fee.
          Seller receives the remaining balance via Stripe Connect transfer.
        </p>
        <form action={adminUpdateMarketplaceFeesAction} className="mt-4 grid gap-3 rounded-lg border border-zinc-200 p-4 md:grid-cols-3">
          <label className="text-xs">
            <span className="mb-1 block font-medium text-zinc-700">Commission % (bps)</span>
            <input name="commissionPercentBps" defaultValue={effectiveFeeSettings.commissionPercentBps} className="w-full rounded border border-zinc-300 px-2 py-1.5 text-sm" />
          </label>
          <label className="text-xs">
            <span className="mb-1 block font-medium text-zinc-700">Commission fixed (pence)</span>
            <input name="commissionFixedPence" defaultValue={effectiveFeeSettings.commissionFixedPence} className="w-full rounded border border-zinc-300 px-2 py-1.5 text-sm" />
          </label>
          <label className="text-xs">
            <span className="mb-1 block font-medium text-zinc-700">VAT on commission (bps)</span>
            <input name="commissionVatRateBps" defaultValue={effectiveFeeSettings.commissionVatRateBps} className="w-full rounded border border-zinc-300 px-2 py-1.5 text-sm" />
          </label>
          <label className="text-xs">
            <span className="mb-1 block font-medium text-zinc-700">Stripe fee % estimate (bps)</span>
            <input name="stripeFeePercentBps" defaultValue={effectiveFeeSettings.stripeFeePercentBps} className="w-full rounded border border-zinc-300 px-2 py-1.5 text-sm" />
          </label>
          <label className="text-xs">
            <span className="mb-1 block font-medium text-zinc-700">Stripe fixed estimate (pence)</span>
            <input name="stripeFeeFixedPence" defaultValue={effectiveFeeSettings.stripeFeeFixedPence} className="w-full rounded border border-zinc-300 px-2 py-1.5 text-sm" />
          </label>
          <label className="text-xs">
            <span className="mb-1 block font-medium text-zinc-700">Digital marketplace % (bps)</span>
            <input name="digitalMarketplaceFeeBps" defaultValue={effectiveFeeSettings.digitalMarketplaceFeeBps} className="w-full rounded border border-zinc-300 px-2 py-1.5 text-sm" />
          </label>
          <label className="text-xs md:col-span-2">
            <span className="mb-1 block font-medium text-zinc-700">Digital marketplace fixed (pence)</span>
            <input name="digitalMarketplaceFeeFixedPence" defaultValue={effectiveFeeSettings.digitalMarketplaceFeeFixedPence} className="w-full rounded border border-zinc-300 px-2 py-1.5 text-sm" />
          </label>
          <div className="flex items-end">
            <button type="submit" className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-semibold text-white hover:bg-zinc-800">Save fee settings</button>
          </div>
        </form>
        <div className="mt-4 rounded-lg border border-zinc-200 bg-zinc-50 p-3 text-sm text-zinc-700">
          <p className="font-medium text-zinc-900">Example on a £100.00 order</p>
          <p className="mt-1">Commission (net): £{(sample.commissionNetPence / 100).toFixed(2)}</p>
          <p>VAT on commission: £{(sample.commissionVatPence / 100).toFixed(2)}</p>
          <p>Stripe fee estimate: £{(sample.stripeProcessingFeePence / 100).toFixed(2)}</p>
          <p>Digital marketplace fee: £{(sample.digitalMarketplaceFeePence / 100).toFixed(2)}</p>
          <p className="mt-1 font-medium text-zinc-900">
            Total platform fees: £{(sample.totalMarketplaceFeesPence / 100).toFixed(2)} · Seller payout: £{(sample.sellerPayoutPence / 100).toFixed(2)}
          </p>
        </div>
      </section>

      <SellerProfileImportForm />

      <section className="mt-8 rounded-xl border border-zinc-200 bg-white p-4">
        <h2 className="text-lg font-semibold text-zinc-900">Admin onboarded sellers</h2>
        <p className="mt-1 text-sm text-zinc-600">
          Create placeholder seller accounts with claim codes, then assign listings so the real owner can claim the
          profile later.
        </p>

        <div className="mt-4 grid gap-4 xl:grid-cols-2">
          <form action={adminCreateOnboardedSellerAction} className="grid gap-3 rounded-lg border border-zinc-200 p-4">
            <h3 className="text-sm font-semibold text-zinc-900">Create onboarded seller + yard profile</h3>
            <div className="grid gap-3 md:grid-cols-2">
              <label className="text-sm">
                <span className="mb-1 block text-xs font-medium text-zinc-700">Role</span>
                <select name="role" defaultValue="reclamation_yard" className="w-full rounded border border-zinc-300 px-3 py-2 text-sm">
                  <option value="reclamation_yard">Reclamation yard</option>
                  <option value="dealer">Dealer</option>
                </select>
              </label>
              <label className="text-sm">
                <span className="mb-1 block text-xs font-medium text-zinc-700">Postcode</span>
                <input name="postcode" required placeholder="e.g. LS1 4AP" className="w-full rounded border border-zinc-300 px-3 py-2 text-sm" />
              </label>
            </div>
            <label className="text-sm">
              <span className="mb-1 block text-xs font-medium text-zinc-700">Display name</span>
              <input name="displayName" required placeholder="Public business/person name" className="w-full rounded border border-zinc-300 px-3 py-2 text-sm" />
            </label>
            <div className="grid gap-3 md:grid-cols-2">
              <label className="text-sm">
                <span className="mb-1 block text-xs font-medium text-zinc-700">Business name (yards)</span>
                <input name="businessName" placeholder="Optional" className="w-full rounded border border-zinc-300 px-3 py-2 text-sm" />
              </label>
              <label className="text-sm">
                <span className="mb-1 block text-xs font-medium text-zinc-700">Yard slug (optional)</span>
                <input name="yardSlug" placeholder="auto if empty" className="w-full rounded border border-zinc-300 px-3 py-2 text-sm" />
              </label>
            </div>
            <label className="text-sm">
              <span className="mb-1 block text-xs font-medium text-zinc-700">Claim contact email (optional)</span>
              <input name="claimContactEmail" type="email" placeholder="owner@example.com" className="w-full rounded border border-zinc-300 px-3 py-2 text-sm" />
            </label>
            <div>
              <button type="submit" className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-semibold text-white hover:bg-zinc-800">
                Create onboarded seller
              </button>
            </div>
          </form>

          <form action={adminAssignListingToUserAction} className="grid gap-3 rounded-lg border border-zinc-200 p-4">
            <h3 className="text-sm font-semibold text-zinc-900">Assign listing to onboarded seller</h3>
            <p className="text-xs text-zinc-600">
              Moves an existing listing to the target onboarded user account.
            </p>
            <label className="text-sm">
              <span className="mb-1 block text-xs font-medium text-zinc-700">Listing ID</span>
              <input name="listingId" required placeholder="clx..." className="w-full rounded border border-zinc-300 px-3 py-2 text-sm font-mono" />
            </label>
            <label className="text-sm">
              <span className="mb-1 block text-xs font-medium text-zinc-700">Target user ID (onboarded seller)</span>
              <input name="targetUserId" required placeholder="clx..." className="w-full rounded border border-zinc-300 px-3 py-2 text-sm font-mono" />
            </label>
            <div>
              <button type="submit" className="rounded-lg border border-zinc-300 px-4 py-2 text-sm font-semibold hover:bg-zinc-50">
                Assign listing
              </button>
            </div>
          </form>
        </div>

        <div className="mt-5 overflow-x-auto rounded-lg border border-zinc-200">
          <table className="min-w-full text-sm">
            <thead className="text-left text-xs uppercase tracking-wide text-zinc-500">
              <tr>
                <th className="px-3 py-2">Seller</th>
                <th className="px-3 py-2">User ID</th>
                <th className="px-3 py-2">Role</th>
                <th className="px-3 py-2">Claim code</th>
                <th className="px-3 py-2">Listings</th>
                <th className="px-3 py-2">Orders</th>
              </tr>
            </thead>
            <tbody>
              {onboardedProfiles.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-3 py-5 text-center text-zinc-500">
                    No admin-onboarded profiles yet.
                  </td>
                </tr>
              ) : (
                onboardedProfiles.map((p) => (
                  <tr key={p.id} className="border-t border-zinc-100">
                    <td className="px-3 py-2">
                      <p className="font-medium text-zinc-900">{p.businessName || p.displayName}</p>
                      <p className="text-xs text-zinc-500">{p.yardSlug ? `/yards/${p.yardSlug}` : `/sellers/${p.userId}`}</p>
                    </td>
                    <td className="px-3 py-2 font-mono text-xs text-zinc-700">{p.userId}</td>
                    <td className="px-3 py-2 text-zinc-700">{p.user.role}</td>
                    <td className="px-3 py-2 font-mono text-xs text-zinc-900">{p.claimCode || "—"}</td>
                    <td className="px-3 py-2 text-zinc-700">{p.user._count.listings}</td>
                    <td className="px-3 py-2 text-zinc-700">{p.user._count.ordersAsSeller}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="mt-8 rounded-xl border border-zinc-200 bg-white p-4">
        <h2 className="text-lg font-semibold text-zinc-900">Blog publishing</h2>
        <p className="mt-1 text-sm text-zinc-600">
          Post full-page blog content as HTML. Published posts appear on the homepage and <code className="rounded bg-zinc-100 px-1">/blog</code>.
        </p>
        <form action={adminCreateBlogPostAction} className="mt-4 grid gap-3 rounded-lg border border-zinc-200 p-4">
          <div className="grid gap-3 md:grid-cols-2">
            <label className="text-sm">
              <span className="mb-1 block text-xs font-medium text-zinc-700">Title</span>
              <input
                name="title"
                required
                maxLength={180}
                placeholder="e.g. Reclaimed timber trends in 2026"
                className="w-full rounded border border-zinc-300 px-3 py-2 text-sm"
              />
            </label>
            <label className="text-sm">
              <span className="mb-1 block text-xs font-medium text-zinc-700">Slug (optional)</span>
              <input
                name="slug"
                maxLength={140}
                placeholder="auto-from-title-if-empty"
                className="w-full rounded border border-zinc-300 px-3 py-2 text-sm"
              />
            </label>
          </div>
          <label className="text-sm">
            <span className="mb-1 block text-xs font-medium text-zinc-700">Excerpt (optional)</span>
            <input
              name="excerpt"
              maxLength={300}
              placeholder="Short summary for homepage and blog list."
              className="w-full rounded border border-zinc-300 px-3 py-2 text-sm"
            />
          </label>
          <BlogFeaturedImageField />
          <label className="text-sm">
            <span className="mb-1 block text-xs font-medium text-zinc-700">HTML content</span>
            <textarea
              name="htmlContent"
              required
              rows={14}
              placeholder="<h1>...</h1><p>...</p>"
              className="w-full rounded border border-zinc-300 px-3 py-2 font-mono text-xs"
            />
          </label>
          <label className="inline-flex items-center gap-2 text-sm text-zinc-700">
            <input type="checkbox" name="published" defaultChecked />
            Publish immediately
          </label>
          <div>
            <button type="submit" className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-semibold text-white hover:bg-zinc-800">
              Create post
            </button>
          </div>
        </form>

        <div className="mt-5 overflow-x-auto rounded-lg border border-zinc-200">
          <table className="min-w-full text-sm">
            <thead className="text-left text-xs uppercase tracking-wide text-zinc-500">
              <tr>
                <th className="py-2 px-3">Post</th>
                <th className="py-2 px-3">Status</th>
                <th className="py-2 px-3">Published</th>
                <th className="py-2 px-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {blogPosts.length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-5 px-3 text-sm text-zinc-500">No blog posts yet.</td>
                </tr>
              ) : (
                blogPosts.map((p) => (
                  <tr key={p.id} className="border-t border-zinc-100">
                    <td className="py-2 px-3">
                      <p className="font-medium text-zinc-900">{p.title}</p>
                      <p className="font-mono text-xs text-zinc-500">/blog/{p.slug}</p>
                    </td>
                    <td className="py-2 px-3">
                      {p.published ? (
                        <span className="rounded bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-800">Published</span>
                      ) : (
                        <span className="rounded bg-zinc-100 px-2 py-0.5 text-xs font-medium text-zinc-700">Draft</span>
                      )}
                    </td>
                    <td className="py-2 px-3 text-zinc-600">
                      {(p.publishedAt ?? p.createdAt).toISOString().slice(0, 10)}
                    </td>
                    <td className="py-2 px-3">
                      <div className="flex flex-wrap gap-2">
                        <Link href={`/blog/${p.slug}`} target="_blank" className="rounded border border-zinc-300 px-2 py-1 text-xs hover:bg-zinc-50">
                          View
                        </Link>
                        <Link
                          href={`/dashboard/admin/blog/${p.id}/edit`}
                          className="rounded border border-zinc-300 px-2 py-1 text-xs hover:bg-zinc-50"
                        >
                          Edit
                        </Link>
                        <form action={adminSetBlogPublishedAction}>
                          <input type="hidden" name="id" value={p.id} />
                          <input type="hidden" name="published" value={p.published ? "0" : "1"} />
                          <button type="submit" className="rounded border border-zinc-300 px-2 py-1 text-xs hover:bg-zinc-50">
                            {p.published ? "Unpublish" : "Publish"}
                          </button>
                        </form>
                        <form action={adminDeleteBlogPostAction}>
                          <input type="hidden" name="id" value={p.id} />
                          <button type="submit" className="rounded border border-rose-300 px-2 py-1 text-xs text-rose-800 hover:bg-rose-50">
                            Delete
                          </button>
                        </form>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="mt-8 rounded-xl border border-zinc-200 bg-white p-4">
        <h2 className="text-lg font-semibold text-zinc-900">Notifications &amp; email alerts</h2>
        <p className="mt-1 text-sm text-zinc-600">
          In-app notifications are stored per user. Operational email is optional and currently used for yard
          enquiries only.
        </p>
        <div className="mt-4 grid gap-6 lg:grid-cols-2">
          <div className="rounded-lg border border-zinc-200 bg-zinc-50/80 p-4">
            <h3 className="text-sm font-semibold text-zinc-900">Email (Stackmail SMTP)</h3>
            <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-zinc-700">
              <li>
                Status:{" "}
                <span className={smtpConfigured ? "font-medium text-emerald-800" : "font-medium text-amber-800"}>
                  {smtpConfigured ? "Configured (SMTP user/pass present)" : "Not configured — yard enquiry emails are skipped"}
                </span>
              </li>
              <li>
                Default / configured <code className="rounded bg-zinc-200 px-1 text-xs">MAIL_FROM</code>:{" "}
                <span className="break-all">{smtpFromPreview}</span>
              </li>
              <li>
                Code path: <code className="rounded bg-zinc-200 px-1 text-xs">sendYardEnquiryEmail</code> — in-app
                notification to the yard is always created; email sends only when{" "}
                <code className="rounded bg-zinc-200 px-1 text-xs">SMTP_USER</code> and{" "}
                <code className="rounded bg-zinc-200 px-1 text-xs">SMTP_PASS</code> are set.
              </li>
            </ul>
          </div>
          <div className="rounded-lg border border-zinc-200 bg-zinc-50/80 p-4">
            <h3 className="text-sm font-semibold text-zinc-900">In-app notifications</h3>
            <p className="mt-2 text-sm text-zinc-700">
              <span className="font-medium text-zinc-900">{notificationTotal.toLocaleString()}</span> total rows ·{" "}
              <span className="font-medium text-zinc-900">{notificationUnread.toLocaleString()}</span> unread
            </p>
            <p className="mt-2 text-xs text-zinc-600">
              Users manage their own feed under{" "}
              <Link href="/dashboard/notifications" className="font-medium text-brand hover:underline">
                Dashboard → Notifications
              </Link>
              .
            </p>
          </div>
        </div>

        <div className="mt-6">
          <h3 className="text-sm font-semibold text-zinc-900">Notification types (last 30 days)</h3>
          {notifByTypeSorted.length === 0 ? (
            <p className="mt-2 text-sm text-zinc-500">No notifications in the last 30 days.</p>
          ) : (
            <div className="mt-2 overflow-x-auto rounded-lg border border-zinc-200">
              <table className="min-w-full text-sm">
                <thead className="text-left text-xs uppercase tracking-wide text-zinc-500">
                  <tr>
                    <th className="py-2 px-3">Type</th>
                    <th className="py-2 px-3">Count</th>
                  </tr>
                </thead>
                <tbody>
                  {notifByTypeSorted.map((row) => (
                    <tr key={row.type} className="border-t border-zinc-100">
                      <td className="py-2 px-3 font-mono text-xs text-zinc-800">{row.type}</td>
                      <td className="py-2 px-3 text-zinc-700">{row._count.id}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="mt-6">
          <h3 className="text-sm font-semibold text-zinc-900">Recent notifications (all users)</h3>
          <p className="mt-1 text-xs text-zinc-600">Up to 20 rows, newest first. Search by type, title, body, user id/email, or notification id.</p>
          <form action="/dashboard/admin#notifications" className="mt-3 flex flex-wrap items-center gap-2">
            <input type="hidden" name="userQ" value={userQ} />
            <input type="hidden" name="yardQ" value={yardQ} />
            <input type="hidden" name="listingQ" value={listingQ} />
            <input
              name="notifQ"
              defaultValue={notifQ}
              placeholder="Search notifications"
              className="w-full max-w-sm rounded border border-zinc-300 px-3 py-2 text-sm"
            />
            <button type="submit" className="rounded border border-zinc-300 px-3 py-2 text-sm hover:bg-zinc-50">
              Search
            </button>
            <Link
              href={`/dashboard/admin${userQ || yardQ || listingQ ? `?${new URLSearchParams({ ...(userQ ? { userQ } : {}), ...(yardQ ? { yardQ } : {}), ...(listingQ ? { listingQ } : {}) }).toString()}` : ""}#notifications`}
              className="rounded border border-zinc-300 px-3 py-2 text-sm hover:bg-zinc-50"
            >
              Clear
            </Link>
          </form>
          <div className="mt-3 overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="text-left text-xs uppercase tracking-wide text-zinc-500">
                <tr>
                  <th className="py-2 pr-3">When</th>
                  <th className="py-2 pr-3">User</th>
                  <th className="py-2 pr-3">Type</th>
                  <th className="py-2 pr-3">Title</th>
                  <th className="py-2 pr-3">Read</th>
                </tr>
              </thead>
              <tbody>
                {recentNotifications.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-6 text-center text-sm text-zinc-500">
                      No notifications match this search.
                    </td>
                  </tr>
                ) : (
                  recentNotifications.map((n) => (
                    <tr key={n.id} className="border-t border-zinc-100 align-top">
                      <td className="py-2 pr-3 text-xs text-zinc-600">
                        {n.createdAt.toISOString().replace("T", " ").slice(0, 16)}
                      </td>
                      <td className="py-2 pr-3 text-xs text-zinc-700">
                        <span className="break-all">{n.user.email ?? n.user.id}</span>
                      </td>
                      <td className="py-2 pr-3 font-mono text-[11px] text-zinc-800">{n.type}</td>
                      <td className="py-2 pr-3">
                        <p className="font-medium text-zinc-900">{n.title}</p>
                        <p className="mt-0.5 line-clamp-2 text-xs text-zinc-600">{n.body}</p>
                        <p className="mt-1 font-mono text-[10px] text-zinc-500">ID: {n.id}</p>
                      </td>
                      <td className="py-2 pr-3 text-zinc-700">{n.readAt ? "Yes" : "No"}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="mt-6 rounded-lg border border-amber-200 bg-amber-50/60 p-4">
          <h3 className="text-sm font-semibold text-amber-950">Housekeeping: purge old read notifications</h3>
          <p className="mt-1 text-xs text-amber-900/90">
            Permanently deletes <strong>read</strong> in-app notifications older than the age you select. Unread rows
            are never removed.
          </p>
          <form action={adminPurgeReadNotificationsAction} className="mt-3 flex flex-wrap items-end gap-3">
            <div>
              <label htmlFor="olderThanDays" className="block text-xs font-medium text-amber-950">
                Older than (days)
              </label>
              <select
                id="olderThanDays"
                name="olderThanDays"
                defaultValue="90"
                className="mt-1 rounded border border-amber-300 bg-white px-2 py-1.5 text-sm text-amber-950"
              >
                <option value="90">90</option>
                <option value="180">180</option>
                <option value="365">365</option>
              </select>
            </div>
            <label className="flex max-w-md items-start gap-2 text-xs text-amber-950">
              <input type="checkbox" name="confirm" value="on" className="mt-0.5" required />
              <span>I understand this permanently deletes matching read notifications.</span>
            </label>
            <button
              type="submit"
              className="rounded-lg border border-amber-800 bg-amber-900 px-3 py-2 text-sm font-semibold text-white hover:bg-amber-950"
            >
              Run purge
            </button>
          </form>
        </div>
      </section>

      <section id="users" className="mt-8 rounded-xl border border-zinc-200 bg-white p-4">
        <h2 className="text-lg font-semibold text-zinc-900">Users</h2>
        <p className="mt-1 text-sm text-zinc-600">
          Showing up to 20 recent users. Search by email, name, yard details, or user ID.
        </p>
        <form action="/dashboard/admin#users" className="mt-3 flex flex-wrap items-center gap-2">
          <input type="hidden" name="yardQ" value={yardQ} />
          <input type="hidden" name="listingQ" value={listingQ} />
          <input type="hidden" name="notifQ" value={notifQ} />
          <input
            name="userQ"
            defaultValue={userQ}
            placeholder="Search users"
            className="w-full max-w-sm rounded border border-zinc-300 px-3 py-2 text-sm"
          />
          <button type="submit" className="rounded border border-zinc-300 px-3 py-2 text-sm hover:bg-zinc-50">
            Search
          </button>
          <Link
            href={`/dashboard/admin${yardQ || listingQ || notifQ ? `?${new URLSearchParams({ ...(yardQ ? { yardQ } : {}), ...(listingQ ? { listingQ } : {}), ...(notifQ ? { notifQ } : {}) }).toString()}` : ""}#users`}
            className="rounded border border-zinc-300 px-3 py-2 text-sm hover:bg-zinc-50"
          >
            Clear
          </Link>
        </form>
        <div className="mt-4 overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="text-left text-xs uppercase tracking-wide text-zinc-500">
              <tr>
                <th className="py-2 pr-3">User</th>
                <th className="py-2 pr-3">Role</th>
                <th className="py-2 pr-3">Listings</th>
                <th className="py-2 pr-3">Yard</th>
                <th className="py-2 pr-3">Status</th>
                <th className="py-2">Action</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id} className="border-t border-zinc-100 align-top">
                  <td className="py-2 pr-3">
                    <p className="font-medium text-zinc-900">{u.name || "Unnamed user"}</p>
                    <p className="text-xs text-zinc-500">{u.email || u.id}</p>
                  </td>
                  <td className="py-2 pr-3 text-zinc-700">{u.role || "buyer only"}</td>
                  <td className="py-2 pr-3 text-zinc-700">{u._count.listings}</td>
                  <td className="py-2 pr-3 text-zinc-700">
                    {u.sellerProfile?.yardSlug ? (
                      <Link href={`/yards/${u.sellerProfile.yardSlug}`} target="_blank" className="text-brand underline">
                        {u.sellerProfile.businessName || u.sellerProfile.displayName}
                      </Link>
                    ) : (
                      u.sellerProfile?.displayName || "—"
                    )}
                  </td>
                  <td className="py-2 pr-3">
                    {u.suspendedAt ? (
                      <span className="rounded bg-rose-100 px-2 py-0.5 text-xs font-medium text-rose-800">Suspended</span>
                    ) : (
                      <span className="rounded bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-800">Active</span>
                    )}
                  </td>
                  <td className="py-2">
                    <div className="flex flex-col gap-2">
                      <form action={adminSetUserRoleAction} className="flex items-center gap-1">
                        <input type="hidden" name="userId" value={u.id} />
                        <select
                          name="role"
                          defaultValue={u.role ?? "individual"}
                          className="rounded border border-zinc-300 px-1 py-1 text-xs"
                        >
                          <option value="individual">individual</option>
                          <option value="dealer">dealer</option>
                          <option value="reclamation_yard">reclamation_yard</option>
                        </select>
                        <button
                          type="submit"
                          className="rounded border border-zinc-300 px-2 py-1 text-xs hover:bg-zinc-50"
                        >
                          Save role
                        </button>
                      </form>
                      <form action={adminToggleUserSuspensionAction} className="flex flex-col gap-2">
                        <input type="hidden" name="userId" value={u.id} />
                        <input type="hidden" name="mode" value={u.suspendedAt ? "unsuspend" : "suspend"} />
                        {!u.suspendedAt ? (
                          <input
                            name="reason"
                            placeholder="Reason (optional)"
                            className="w-52 rounded border border-zinc-300 px-2 py-1 text-xs"
                          />
                        ) : null}
                        <button
                          type="submit"
                          className={`rounded px-2 py-1 text-xs font-medium ${
                            u.suspendedAt
                              ? "border border-emerald-300 text-emerald-800 hover:bg-emerald-50"
                              : "border border-rose-300 text-rose-800 hover:bg-rose-50"
                          }`}
                        >
                          {u.suspendedAt ? "Unsuspend user" : "Suspend user"}
                        </button>
                      </form>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section id="yards" className="mt-8 rounded-xl border border-zinc-200 bg-white p-4">
        <h2 className="text-lg font-semibold text-zinc-900">Yards and related listings</h2>
        <p className="mt-1 text-sm text-zinc-600">
          Showing up to 20 recent yards. Search by yard name/slug, postcode, user email, or ID.
        </p>
        <form action="/dashboard/admin#yards" className="mt-3 flex flex-wrap items-center gap-2">
          <input type="hidden" name="userQ" value={userQ} />
          <input type="hidden" name="listingQ" value={listingQ} />
          <input type="hidden" name="notifQ" value={notifQ} />
          <input
            name="yardQ"
            defaultValue={yardQ}
            placeholder="Search yards"
            className="w-full max-w-sm rounded border border-zinc-300 px-3 py-2 text-sm"
          />
          <button type="submit" className="rounded border border-zinc-300 px-3 py-2 text-sm hover:bg-zinc-50">
            Search
          </button>
          <Link
            href={`/dashboard/admin${userQ || listingQ || notifQ ? `?${new URLSearchParams({ ...(userQ ? { userQ } : {}), ...(listingQ ? { listingQ } : {}), ...(notifQ ? { notifQ } : {}) }).toString()}` : ""}#yards`}
            className="rounded border border-zinc-300 px-3 py-2 text-sm hover:bg-zinc-50"
          >
            Clear
          </Link>
        </form>
        <div className="mt-4 overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="text-left text-xs uppercase tracking-wide text-zinc-500">
              <tr>
                <th className="py-2 pr-3">Yard</th>
                <th className="py-2 pr-3">User email</th>
                <th className="py-2 pr-3">Postcode</th>
                <th className="py-2 pr-3">Listings</th>
                <th className="py-2 pr-3">Suspended</th>
              </tr>
            </thead>
            <tbody>
              {yards.map((y) => (
                <tr key={y.id} className="border-t border-zinc-100">
                  <td className="py-2 pr-3">
                    {y.yardSlug ? (
                      <Link href={`/yards/${y.yardSlug}`} target="_blank" className="font-medium text-brand underline">
                        {y.businessName || y.displayName}
                      </Link>
                    ) : (
                      <span className="font-medium text-zinc-900">{y.businessName || y.displayName}</span>
                    )}
                  </td>
                  <td className="py-2 pr-3 text-zinc-700">{y.user.email || y.user.id}</td>
                  <td className="py-2 pr-3 text-zinc-700">{y.postcode}</td>
                  <td className="py-2 pr-3 text-zinc-700">{y.user._count.listings}</td>
                  <td className="py-2 pr-3 text-zinc-700">{y.user.suspendedAt ? "Yes" : "No"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section id="listings" className="mt-8 rounded-xl border border-zinc-200 bg-white p-4">
        <h2 className="text-lg font-semibold text-zinc-900">My listings (quick manage)</h2>
        <p className="mt-1 text-sm text-zinc-600">
          Fast access to your own listings before reviewing all marketplace rows.
        </p>
        {myListings.length === 0 ? (
          <p className="mt-3 text-sm text-zinc-500">You don&apos;t have listings on this admin account yet.</p>
        ) : (
          <div className="mt-4 overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="text-left text-xs uppercase tracking-wide text-zinc-500">
                <tr>
                  <th className="py-2 pr-3">Listing</th>
                  <th className="py-2 pr-3">Category</th>
                  <th className="py-2 pr-3">Status</th>
                  <th className="py-2 pr-3">Visible</th>
                  <th className="py-2 pr-3">Updated</th>
                  <th className="py-2">Actions</th>
                </tr>
              </thead>
              <tbody>
                {myListings.map((l) => (
                  <tr key={l.id} className="border-t border-zinc-100 align-top">
                    <td className="py-2 pr-3">
                      <Link href={`/listings/${l.id}`} target="_blank" className="font-medium text-brand underline">
                        {l.title}
                      </Link>
                      <p className="text-xs text-zinc-500">ID: {l.id}</p>
                    </td>
                    <td className="py-2 pr-3 text-zinc-700">{l.category.name}</td>
                    <td className="py-2 pr-3 text-zinc-700">{l.status}</td>
                    <td className="py-2 pr-3 text-zinc-700">{l.visibleOnMarketplace ? "Yes" : "No"}</td>
                    <td className="py-2 pr-3 text-zinc-500">{l.updatedAt.toISOString().slice(0, 10)}</td>
                    <td className="py-2">
                      <div className="flex flex-wrap gap-2">
                        <form action={adminSetListingVisibilityAction}>
                          <input type="hidden" name="listingId" value={l.id} />
                          <input type="hidden" name="visible" value={l.visibleOnMarketplace ? "0" : "1"} />
                          <button type="submit" className="rounded border border-zinc-300 px-2 py-1 text-xs hover:bg-zinc-50">
                            {l.visibleOnMarketplace ? "Hide" : "Unhide"}
                          </button>
                        </form>
                        <Link
                          href={`/dashboard/listings/${l.id}/edit`}
                          className="rounded border border-zinc-300 px-2 py-1 text-xs hover:bg-zinc-50"
                        >
                          Edit
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="mt-8 rounded-xl border border-zinc-200 bg-white p-4">
        <h2 className="text-lg font-semibold text-zinc-900">Listings moderation</h2>
        <p className="mt-1 text-sm text-zinc-600">
          Showing up to 20 recent listings. Search by listing ID/title, seller email, category, or status.
        </p>
        <form action="/dashboard/admin#listings" className="mt-3 flex flex-wrap items-center gap-2">
          <input type="hidden" name="userQ" value={userQ} />
          <input type="hidden" name="yardQ" value={yardQ} />
          <input type="hidden" name="notifQ" value={notifQ} />
          <input
            name="listingQ"
            defaultValue={listingQ}
            placeholder="Search listings"
            className="w-full max-w-sm rounded border border-zinc-300 px-3 py-2 text-sm"
          />
          <button type="submit" className="rounded border border-zinc-300 px-3 py-2 text-sm hover:bg-zinc-50">
            Search
          </button>
          <Link
            href={`/dashboard/admin${userQ || yardQ || notifQ ? `?${new URLSearchParams({ ...(userQ ? { userQ } : {}), ...(yardQ ? { yardQ } : {}), ...(notifQ ? { notifQ } : {}) }).toString()}` : ""}#listings`}
            className="rounded border border-zinc-300 px-3 py-2 text-sm hover:bg-zinc-50"
          >
            Clear
          </Link>
        </form>
        <div className="mt-4 overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="text-left text-xs uppercase tracking-wide text-zinc-500">
              <tr>
                <th className="py-2 pr-3">Listing</th>
                <th className="py-2 pr-3">Seller</th>
                <th className="py-2 pr-3">Kind</th>
                <th className="py-2 pr-3">Status</th>
                <th className="py-2 pr-3">Visible</th>
                <th className="py-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {listings.map((l) => (
                <tr key={l.id} className="border-t border-zinc-100 align-top">
                  <td className="py-2 pr-3">
                    <Link href={`/listings/${l.id}`} target="_blank" className="font-medium text-brand underline">
                      {l.title}
                    </Link>
                    <p className="text-xs text-zinc-500">{l.category.name}</p>
                    <p className="text-xs text-zinc-500">ID: {l.id}</p>
                  </td>
                  <td className="py-2 pr-3 text-zinc-700">
                    {l.seller.email || l.seller.id}
                    {l.seller.suspendedAt ? (
                      <span className="ml-2 rounded bg-rose-100 px-1.5 py-0.5 text-[10px] text-rose-800">Suspended</span>
                    ) : null}
                  </td>
                  <td className="py-2 pr-3 text-zinc-700">{l.listingKind}</td>
                  <td className="py-2 pr-3 text-zinc-700">{l.status}</td>
                  <td className="py-2 pr-3 text-zinc-700">{l.visibleOnMarketplace ? "Yes" : "No"}</td>
                  <td className="py-2">
                    <div className="flex flex-wrap gap-2">
                      <Link
                        href={`/dashboard/listings/${l.id}/edit`}
                        className="rounded border border-zinc-300 px-2 py-1 text-xs hover:bg-zinc-50"
                      >
                        Edit
                      </Link>
                      <form action={adminSetListingVisibilityAction}>
                        <input type="hidden" name="listingId" value={l.id} />
                        <input type="hidden" name="visible" value={l.visibleOnMarketplace ? "0" : "1"} />
                        <button type="submit" className="rounded border border-zinc-300 px-2 py-1 text-xs hover:bg-zinc-50">
                          {l.visibleOnMarketplace ? "Hide" : "Unhide"}
                        </button>
                      </form>
                      <form action={adminSetListingStatusAction} className="flex items-center gap-1">
                        <input type="hidden" name="listingId" value={l.id} />
                        <select name="status" defaultValue={l.status} className="rounded border border-zinc-300 px-1 py-1 text-xs">
                          <option value="draft">draft</option>
                          <option value="active">active</option>
                          <option value="payment_pending">payment_pending</option>
                          <option value="ended">ended</option>
                          <option value="sold">sold</option>
                        </select>
                        <button type="submit" className="rounded border border-zinc-300 px-2 py-1 text-xs hover:bg-zinc-50">
                          Save
                        </button>
                      </form>
                      <form action={adminDeleteListingAction}>
                        <input type="hidden" name="listingId" value={l.id} />
                        <button type="submit" className="rounded border border-rose-300 px-2 py-1 text-xs text-rose-800 hover:bg-rose-50">
                          Delete
                        </button>
                      </form>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="mt-8 rounded-xl border border-zinc-200 bg-white p-4">
        <h2 className="text-lg font-semibold text-zinc-900">Auction logs</h2>
        <p className="mt-1 text-sm text-zinc-600">Recent bids and closed-auction outcomes for operations follow-up.</p>
        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          <div className="overflow-x-auto rounded-lg border border-zinc-200">
            <p className="border-b border-zinc-200 bg-zinc-50 px-3 py-2 text-sm font-medium text-zinc-900">Recent bids</p>
            <table className="min-w-full text-sm">
              <thead className="text-left text-xs uppercase tracking-wide text-zinc-500">
                <tr>
                  <th className="py-2 px-3">At</th>
                  <th className="py-2 px-3">Listing</th>
                  <th className="py-2 px-3">Bidder</th>
                  <th className="py-2 px-3">Amount</th>
                </tr>
              </thead>
              <tbody>
                {bids.map((b) => (
                  <tr key={b.id} className="border-t border-zinc-100">
                    <td className="py-2 px-3 text-xs text-zinc-600">{b.createdAt.toISOString().replace("T", " ").slice(0, 16)}</td>
                    <td className="py-2 px-3">
                      <Link href={`/listings/${b.listingId}`} target="_blank" className="text-brand underline">
                        {b.listing.title.slice(0, 42)}
                      </Link>
                      <p className="text-xs text-zinc-500">ID: {b.listingId}</p>
                    </td>
                    <td className="py-2 px-3 text-zinc-700">{b.bidder.email || b.bidder.id}</td>
                    <td className="py-2 px-3 font-medium text-zinc-900">£{(b.amountPence / 100).toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="overflow-x-auto rounded-lg border border-zinc-200">
            <p className="border-b border-zinc-200 bg-zinc-50 px-3 py-2 text-sm font-medium text-zinc-900">Closed auctions</p>
            <table className="min-w-full text-sm">
              <thead className="text-left text-xs uppercase tracking-wide text-zinc-500">
                <tr>
                  <th className="py-2 px-3">Listing</th>
                  <th className="py-2 px-3">Seller</th>
                  <th className="py-2 px-3">Top bid</th>
                  <th className="py-2 px-3">Order</th>
                </tr>
              </thead>
              <tbody>
                {endedAuctions.map((a) => (
                  <tr key={a.id} className="border-t border-zinc-100">
                    <td className="py-2 px-3">
                      <Link href={`/listings/${a.id}`} target="_blank" className="text-brand underline">
                        {a.title.slice(0, 40)}
                      </Link>
                      <p className="text-xs text-zinc-500">{a.status}</p>
                      <p className="text-xs text-zinc-500">ID: {a.id}</p>
                    </td>
                    <td className="py-2 px-3 text-zinc-700">{a.seller.email || a.seller.id}</td>
                    <td className="py-2 px-3 text-zinc-700">
                      {a.bids[0] ? `£${(a.bids[0].amountPence / 100).toFixed(2)}` : "—"}
                    </td>
                    <td className="py-2 px-3 text-zinc-700">
                      {a.orders[0] ? `${a.orders[0].status} · £${(a.orders[0].amount / 100).toFixed(2)}` : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <section className="mt-8 rounded-xl border border-zinc-200 bg-white p-4">
        <h2 className="text-lg font-semibold text-zinc-900">Settings snapshot</h2>
        <ul className="mt-2 list-disc pl-5 text-sm text-zinc-700">
          <li>Commission settings: currently code-configured (auction settlement constants).</li>
          <li>SEO settings: currently per-yard profile and category content, not global editable settings.</li>
          <li>Admin access controlled by <code className="rounded bg-zinc-100 px-1">ADMIN_EMAILS</code>.</li>
          <li>
            PWA: web app manifest is served automatically; mobile visitors see an install prompt (Chrome) or
            Add-to-Home-Screen instructions (Safari).
          </li>
        </ul>
      </section>

      <section className="mt-8 rounded-xl border border-zinc-200 bg-white p-4">
        <h2 className="text-lg font-semibold text-zinc-900">Analytics (GA4)</h2>
        <p className="mt-1 text-sm text-zinc-600">
          Google Analytics is injected globally in <code className="rounded bg-zinc-100 px-1">src/app/layout.tsx</code>
          when <code className="rounded bg-zinc-100 px-1">NEXT_PUBLIC_GA_MEASUREMENT_ID</code> is present.
        </p>
        <div className="mt-4 grid gap-6 lg:grid-cols-2">
          <div className="rounded-lg border border-zinc-200 bg-zinc-50/80 p-4">
            <h3 className="text-sm font-semibold text-zinc-900">Connection status</h3>
            <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-zinc-700">
              <li>
                Tracking:{" "}
                <span className={gaConnected ? "font-medium text-emerald-800" : "font-medium text-amber-800"}>
                  {gaConnected ? "Enabled" : "Not configured"}
                </span>
              </li>
              <li>
                Measurement ID:{" "}
                <code className="rounded bg-zinc-200 px-1 text-xs">
                  {gaMeasurementId || "missing (set NEXT_PUBLIC_GA_MEASUREMENT_ID)"}
                </code>
              </li>
              <li>
                GA4 Property ID:{" "}
                <code className="rounded bg-zinc-200 px-1 text-xs">
                  {gaPropertyId || "optional (set NEXT_PUBLIC_GA_PROPERTY_ID for deep links)"}
                </code>
              </li>
            </ul>
          </div>
          <div className="rounded-lg border border-zinc-200 bg-zinc-50/80 p-4">
            <h3 className="text-sm font-semibold text-zinc-900">Reporting links</h3>
            <p className="mt-2 text-sm text-zinc-700">
              Open GA dashboards for traffic, acquisition, and conversion monitoring.
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <a
                href={gaRealtimeUrl}
                target="_blank"
                rel="noreferrer"
                className="rounded border border-zinc-300 px-3 py-1.5 text-sm hover:bg-zinc-100"
              >
                Open Realtime
              </a>
              <a
                href={gaReportsUrl}
                target="_blank"
                rel="noreferrer"
                className="rounded border border-zinc-300 px-3 py-1.5 text-sm hover:bg-zinc-100"
              >
                Open Reports
              </a>
              <a
                href="https://analytics.google.com/analytics/web/"
                target="_blank"
                rel="noreferrer"
                className="rounded border border-zinc-300 px-3 py-1.5 text-sm hover:bg-zinc-100"
              >
                Open GA Home
              </a>
            </div>
            <p className="mt-3 text-xs text-zinc-600">
              Set env vars in Vercel project settings (Production/Preview as needed), then redeploy.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}

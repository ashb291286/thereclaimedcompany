import Link from "next/link";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { isCarbonAdmin } from "@/lib/admin";
import {
  adminDeleteListingAction,
  adminSetListingStatusAction,
  adminSetListingVisibilityAction,
  adminToggleUserSuspensionAction,
} from "@/lib/actions/admin-overview";

export default async function AdminOverviewPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; userQ?: string; yardQ?: string; listingQ?: string }>;
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

  const { error, userQ: rawUserQ, yardQ: rawYardQ, listingQ: rawListingQ } = await searchParams;
  const userQ = rawUserQ?.trim() ?? "";
  const yardQ = rawYardQ?.trim() ?? "";
  const listingQ = rawListingQ?.trim() ?? "";
  const [users, yards, listings, bids, endedAuctions, myListings, stats] = await Promise.all([
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
  ]);

  const [userCount, suspendedCount, yardCount, listingCount, activeListingCount, activeAuctionCount] = stats;

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

      <section className="mt-8 rounded-xl border border-zinc-200 bg-white p-4">
        <h2 className="text-lg font-semibold text-zinc-900">Users</h2>
        <p className="mt-1 text-sm text-zinc-600">
          Showing up to 20 recent users. Search by email, name, yard details, or user ID.
        </p>
        <form className="mt-3 flex flex-wrap items-center gap-2">
          <input type="hidden" name="yardQ" value={yardQ} />
          <input type="hidden" name="listingQ" value={listingQ} />
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
            href={`/dashboard/admin${yardQ || listingQ ? `?${new URLSearchParams({ ...(yardQ ? { yardQ } : {}), ...(listingQ ? { listingQ } : {}) }).toString()}` : ""}`}
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
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="mt-8 rounded-xl border border-zinc-200 bg-white p-4">
        <h2 className="text-lg font-semibold text-zinc-900">Yards and related listings</h2>
        <p className="mt-1 text-sm text-zinc-600">
          Showing up to 20 recent yards. Search by yard name/slug, postcode, user email, or ID.
        </p>
        <form className="mt-3 flex flex-wrap items-center gap-2">
          <input type="hidden" name="userQ" value={userQ} />
          <input type="hidden" name="listingQ" value={listingQ} />
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
            href={`/dashboard/admin${userQ || listingQ ? `?${new URLSearchParams({ ...(userQ ? { userQ } : {}), ...(listingQ ? { listingQ } : {}) }).toString()}` : ""}`}
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

      <section className="mt-8 rounded-xl border border-zinc-200 bg-white p-4">
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
        <form className="mt-3 flex flex-wrap items-center gap-2">
          <input type="hidden" name="userQ" value={userQ} />
          <input type="hidden" name="yardQ" value={yardQ} />
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
            href={`/dashboard/admin${userQ || yardQ ? `?${new URLSearchParams({ ...(userQ ? { userQ } : {}), ...(yardQ ? { yardQ } : {}) }).toString()}` : ""}`}
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
        </ul>
      </section>
    </div>
  );
}

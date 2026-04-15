"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

type Item = {
  href: string;
  label: string;
  accent?: "default" | "prop" | "admin";
  badge?: string | null;
};

function itemClass(active: boolean, accent: Item["accent"] = "default"): string {
  if (active) {
    if (accent === "prop") return "border-amber-300 bg-amber-50 text-amber-900";
    if (accent === "admin") return "border-emerald-300 bg-emerald-50 text-emerald-900";
    return "border-brand/30 bg-brand-soft text-zinc-900";
  }
  if (accent === "prop") return "border-transparent text-amber-900 hover:bg-amber-50";
  if (accent === "admin") return "border-transparent text-emerald-900 hover:bg-emerald-50";
  return "border-transparent text-zinc-700 hover:bg-zinc-100";
}

export function DashboardSidebar({
  isYardAccount,
  carbonAdmin,
  unreadCount,
  myBidsOutbidUnread = 0,
}: {
  isYardAccount: boolean;
  carbonAdmin: boolean;
  unreadCount: number;
  /** Unread “you’ve been outbid” notifications — surfaced on My bids. */
  myBidsOutbidUnread?: number;
}) {
  const pathname = usePathname();

  const items: Item[] = [
    { href: "/dashboard", label: "Overview" },
    { href: "/dashboard/account", label: "Account management" },
    { href: "/dashboard/sell", label: "Sell" },
    { href: "/dashboard/offers", label: "Offers" },
    {
      href: "/dashboard/my-bids",
      label: "My bids",
      badge: myBidsOutbidUnread > 0 ? String(Math.min(99, myBidsOutbidUnread)) : null,
    },
    { href: "/dashboard/wanted", label: "My wanted" },
    { href: "/dashboard/stock-alerts", label: "Stock alerts" },
    { href: "/dashboard/demolition-alerts", label: "Demolition alerts" },
    { href: "/orders", label: "Orders" },
    { href: "/dashboard/notifications", label: "Notifications", badge: unreadCount > 0 ? String(Math.min(99, unreadCount)) : null },
  ];

  if (isYardAccount) {
    items.push({ href: "/dashboard/nearby-stock", label: "Nearby stock" });
    items.push({ href: "/dashboard/seller-profile", label: "Yard profile" });
    items.push({ href: "/dashboard/prop-yard", label: "Prop Yard", accent: "prop" });
  }
  if (carbonAdmin) {
    items.push({ href: "/dashboard/admin", label: "Admin overview", accent: "admin" });
    items.push({ href: "/dashboard/admin/carbon-factors", label: "Carbon data", accent: "admin" });
    items.push({ href: "/dashboard/admin/seen-on-screen", label: "Seen on screen queue", accent: "admin" });
    items.push({ href: "/dashboard/admin/marketplace-categories", label: "Categories", accent: "admin" });
    items.push({ href: "/dashboard/admin/woocommerce-sync", label: "WooCommerce sync", accent: "admin" });
  }

  return (
    <aside className="md:sticky md:top-20 md:self-start">
      <div className="rounded-xl border border-zinc-200 bg-white p-3">
        <p className="px-2 pb-2 text-xs font-semibold uppercase tracking-wide text-zinc-500">Dashboard</p>
        <nav className="space-y-1">
          {items.map((item) => {
            const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center justify-between rounded-lg border px-2.5 py-2 text-sm transition ${itemClass(active, item.accent)}`}
              >
                <span>{item.label}</span>
                {item.badge ? (
                  <span className="ml-2 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-brand px-1.5 text-[10px] font-bold text-white">
                    {item.badge}
                  </span>
                ) : null}
              </Link>
            );
          })}
        </nav>
      </div>
    </aside>
  );
}

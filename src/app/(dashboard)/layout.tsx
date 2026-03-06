import { auth } from "@/auth";
import Link from "next/link";
import { signOut } from "@/auth";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  return (
    <div className="min-h-screen bg-zinc-50">
      <header className="border-b border-zinc-200 bg-white">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4">
          <Link href="/" className="font-semibold text-zinc-900">
            Reclaimed Marketplace
          </Link>
          <nav className="flex items-center gap-6">
            <Link href="/" className="text-sm text-zinc-600 hover:text-zinc-900">
              Browse
            </Link>
            <Link href="/dashboard" className="text-sm text-zinc-600 hover:text-zinc-900">
              Dashboard
            </Link>
            <Link href="/dashboard/sell" className="text-sm text-zinc-600 hover:text-zinc-900">
              Sell
            </Link>
            <span className="text-sm text-zinc-500">{session?.user?.email}</span>
            <form
              action={async () => {
                "use server";
                await signOut({ redirectTo: "/" });
              }}
            >
              <button type="submit" className="text-sm text-amber-600 hover:underline">
                Sign out
              </button>
            </form>
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-8">{children}</main>
    </div>
  );
}

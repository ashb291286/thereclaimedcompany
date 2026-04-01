import { auth } from "@/auth";
import { redirect } from "next/navigation";
import Link from "next/link";

export default async function OrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ session_id?: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect("/auth/signin");
  const { session_id } = await searchParams;

  return (
    <div>
      <h1 className="text-2xl font-semibold text-zinc-900">Order confirmation</h1>
      {session_id ? (
        <p className="mt-4 text-zinc-600">
          Thank you for your purchase. Your order has been confirmed.
        </p>
      ) : (
        <p className="mt-4 text-zinc-600">You have no recent orders to show.</p>
      )}
      <Link href="/" className="mt-6 inline-block text-brand hover:underline">
        Continue shopping
      </Link>
    </div>
  );
}

import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import Link from "next/link";
import { redirect } from "next/navigation";
import { BulkCsvUploadForm } from "./BulkCsvUploadForm";

export default async function SellBulkPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/auth/signin");

  const sellerProfile = await prisma.sellerProfile.findUnique({
    where: { userId: session.user.id },
    select: { id: true },
  });
  if (!sellerProfile) redirect("/dashboard/onboarding");

  return (
    <div>
      <Link
        href="/dashboard/sell"
        className="text-sm font-medium text-brand underline hover:text-brand-hover"
      >
        ← Back to list an item
      </Link>
      <h1 className="mt-4 text-2xl font-semibold text-zinc-900">Bulk upload (CSV)</h1>
      <p className="mt-1 text-zinc-600">
        Add many fixed-price listings at once. Imports are saved as drafts so you can check them before they go
        live.
      </p>
      <p className="mt-3 text-sm text-zinc-600">
        <a
          href="/templates/listings-bulk-upload-template.csv"
          download
          className="font-medium text-brand underline hover:text-brand-hover"
        >
          Download CSV template
        </a>{" "}
        (opens sample rows you can copy). Use <code className="rounded bg-zinc-100 px-1 text-xs">category_slug</code>{" "}
        like the picker (e.g. <code className="rounded bg-zinc-100 px-1 text-xs">other</code>) — if the slug is new,
        we create a top-level category automatically. Optional{" "}
        <code className="rounded bg-zinc-100 px-1 text-xs">category_name</code> sets the display name; otherwise we
        derive a title from the slug.
      </p>
      <BulkCsvUploadForm />
    </div>
  );
}

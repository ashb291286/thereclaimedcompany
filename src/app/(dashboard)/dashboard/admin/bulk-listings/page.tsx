import { auth } from "@/auth";
import Link from "next/link";
import { redirect } from "next/navigation";
import { isCarbonAdmin } from "@/lib/admin";
import { AdminBulkCsvUploadForm } from "./AdminBulkCsvUploadForm";

export default async function AdminBulkListingsPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/auth/signin");
  if (!isCarbonAdmin(session)) {
    return (
      <div className="rounded-xl border border-amber-200 bg-amber-50 p-6 text-sm text-amber-950">
        You don&apos;t have access. Add your email to{" "}
        <code className="rounded bg-amber-100 px-1">ADMIN_EMAILS</code>.
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-900">Bulk listings (admin CSV)</h1>
          <p className="mt-1 max-w-2xl text-sm text-zinc-600">
            Import draft listings for any seller by email. New users get a seller profile and credentials; existing
            sellers are matched by email. For your own account only, sellers can use{" "}
            <Link href="/dashboard/sell/bulk" className="font-medium text-brand hover:underline">
              seller bulk upload
            </Link>{" "}
            without the <code className="rounded bg-zinc-100 px-1">seller_email</code> column.
          </p>
        </div>
        <Link href="/dashboard" className="text-sm font-medium text-brand hover:underline">
          Dashboard
        </Link>
      </div>

      <p className="text-sm text-zinc-600">
        <a
          href="/templates/listings-bulk-upload-admin-template.csv"
          download
          className="font-medium text-brand underline hover:text-brand-hover"
        >
          Download admin CSV template
        </a>
      </p>

      <AdminBulkCsvUploadForm />

      <p className="mt-10 text-xs text-zinc-500">
        Columns: <strong>seller_email</strong> (required), optional <strong>seller_display_name</strong>,{" "}
        <strong>seller_role</strong> (individual | reclamation_yard), <strong>seller_business_name</strong>,{" "}
        <strong>seller_postcode</strong>; plus the same listing columns as the seller template (title, description,
        condition, category_slug, price_gbp, image_urls, etc.).
      </p>
    </div>
  );
}

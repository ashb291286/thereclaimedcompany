"use client";

import { useActionState } from "react";
import Link from "next/link";
import {
  adminBulkImportListingsCsvAction,
  type AdminBulkCsvImportState,
} from "@/lib/actions/bulk-listings-csv-admin";

const initial: AdminBulkCsvImportState = { status: "idle" };

export function AdminBulkCsvUploadForm() {
  const [state, formAction, pending] = useActionState(adminBulkImportListingsCsvAction, initial);

  return (
    <div className="mt-8 max-w-3xl space-y-6">
      <div className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm sm:p-6">
        <h2 className="text-lg font-semibold text-zinc-900">Upload admin CSV</h2>
        <p className="mt-2 text-sm text-zinc-600">
          Each row creates a <strong>draft</strong> listing for <code className="rounded bg-zinc-100 px-1">seller_email</code>.
          If that user does not exist, we create an account with a temporary password (shown below after import — copy it
          immediately; it is not emailed). Existing users keep their login; we only add a seller profile if they do not
          have one yet (using <code className="rounded bg-zinc-100 px-1">seller_postcode</code> or the row listing{" "}
          <code className="rounded bg-zinc-100 px-1">postcode</code>).
        </p>
        <form action={formAction} className="mt-4 space-y-4">
          <div>
            <label htmlFor="admin-csv-file" className="mb-1 block text-xs font-medium text-zinc-500">
              CSV file
            </label>
            <input
              id="admin-csv-file"
              name="csv"
              type="file"
              accept=".csv,text/csv"
              required
              disabled={pending}
              className="block w-full text-sm text-zinc-800 file:mr-3 file:rounded-lg file:border-0 file:bg-brand file:px-4 file:py-2 file:text-sm file:font-medium file:text-white hover:file:bg-brand-hover disabled:opacity-50"
            />
          </div>
          <button
            type="submit"
            disabled={pending}
            className="rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand-hover disabled:opacity-50"
          >
            {pending ? "Importing…" : "Import drafts"}
          </button>
        </form>
      </div>

      {state.status === "error" ? (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{state.message}</p>
      ) : null}

      {state.status === "success" ? (
        <div className="space-y-4">
          <div className="rounded-xl border border-zinc-200 bg-zinc-50/80 p-5">
            <p className="text-sm font-medium text-zinc-900">
              Created {state.created} draft listing{state.created !== 1 ? "s" : ""}.
            </p>
            {state.errors.length > 0 ? (
              <div className="mt-3">
                <p className="text-sm font-medium text-amber-900">
                  {state.errors.length} row{state.errors.length !== 1 ? "s" : ""} skipped:
                </p>
                <ul className="mt-2 max-h-48 list-inside list-disc space-y-1 overflow-y-auto text-sm text-zinc-700">
                  {state.errors.map((e, i) => (
                    <li key={i}>
                      Line {e.line}: {e.message}
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
            <Link
              href="/dashboard"
              className="mt-4 inline-block text-sm font-medium text-brand underline hover:text-brand-hover"
            >
              Go to dashboard
            </Link>
          </div>

          {state.newAccounts.length > 0 ? (
            <div className="rounded-xl border border-amber-300 bg-amber-50 p-5">
              <p className="text-sm font-semibold text-amber-950">New accounts — copy now</p>
              <p className="mt-1 text-xs text-amber-900/90">
                These passwords are shown once. Share them securely with the seller so they can sign in with email +
                password. Ask them to change the password after first login if you add that flow later.
              </p>
              <ul className="mt-3 space-y-2 font-mono text-xs text-amber-950 sm:text-sm">
                {state.newAccounts.map((a) => (
                  <li key={a.email} className="break-all rounded-lg bg-white/80 px-3 py-2 ring-1 ring-amber-200/80">
                    <span className="font-sans font-medium text-zinc-700">{a.email}</span>
                    <span className="mx-2 text-zinc-400">·</span>
                    {a.tempPassword}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

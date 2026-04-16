"use client";

import { useActionState } from "react";
import { adminImportSellerProfilesCsvAction, type SellerProfileImportState } from "@/lib/actions/seller-profile-import";

const initialState: SellerProfileImportState = { status: "idle" };

export function SellerProfileImportForm() {
  const [state, formAction, pending] = useActionState(adminImportSellerProfilesCsvAction, initialState);

  return (
    <section className="mt-8 rounded-xl border border-zinc-200 bg-white p-4">
      <h2 className="text-lg font-semibold text-zinc-900">Import yards / dealers (CSV)</h2>
      <p className="mt-1 text-sm text-zinc-600">
        Upload bootstrap rows for businesses before owners sign up. Each imported row gets a one-time claim code.
      </p>

      <form action={formAction} className="mt-4 grid gap-3 rounded-lg border border-zinc-200 p-4 md:grid-cols-2">
        <label className="text-sm">
          <span className="mb-1 block text-xs font-medium text-zinc-700">Default import type</span>
          <select
            name="importMode"
            defaultValue="reclamation_yard"
            disabled={pending}
            className="w-full rounded border border-zinc-300 px-3 py-2 text-sm"
          >
            <option value="reclamation_yard">Reclamation yards</option>
            <option value="dealer">Dealers</option>
          </select>
        </label>
        <label className="text-sm">
          <span className="mb-1 block text-xs font-medium text-zinc-700">CSV file</span>
          <input
            type="file"
            name="csv"
            accept=".csv,text/csv"
            required
            disabled={pending}
            className="block w-full text-sm text-zinc-800 file:mr-3 file:rounded-lg file:border-0 file:bg-brand file:px-4 file:py-2 file:text-sm file:font-medium file:text-white hover:file:bg-brand-hover disabled:opacity-50"
          />
        </label>
        <div className="md:col-span-2">
          <button
            type="submit"
            disabled={pending}
            className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-semibold text-white hover:bg-zinc-800 disabled:opacity-50"
          >
            {pending ? "Importing…" : "Import profiles"}
          </button>
        </div>
      </form>

      <p className="mt-3 text-xs text-zinc-500">
        Required columns: <strong>display_name</strong>, <strong>postcode</strong>. Optional:{" "}
        <strong>role</strong>, <strong>business_name</strong>, <strong>yard_slug</strong>, <strong>contact_email</strong>,{" "}
        <strong>phone</strong>, <strong>website</strong>, <strong>tagline</strong>, <strong>about</strong>,{" "}
        <strong>salvo_code_member</strong>, <strong>year_established</strong>, <strong>trade_public</strong>.
      </p>

      {state.status === "error" ? (
        <p className="mt-4 rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-800">{state.message}</p>
      ) : null}

      {state.status === "success" ? (
        <div className="mt-4 space-y-4">
          <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-3 text-sm text-zinc-700">
            <p>
              Imported <strong>{state.created}</strong> new profile{state.created === 1 ? "" : "s"} and updated{" "}
              <strong>{state.updated}</strong>.
            </p>
            <p className="mt-1">
              Claim codes generated: <strong>{state.claimRows.length}</strong>
            </p>
          </div>

          {state.errors.length > 0 ? (
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-3">
              <p className="text-sm font-medium text-amber-900">
                {state.errors.length} row{state.errors.length === 1 ? "" : "s"} skipped
              </p>
              <ul className="mt-2 max-h-44 list-inside list-disc space-y-1 overflow-y-auto text-xs text-amber-900">
                {state.errors.map((e, i) => (
                  <li key={`${e.line}-${i}`}>
                    Line {e.line}: {e.message}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          {state.claimRows.length > 0 ? (
            <div className="overflow-x-auto rounded-lg border border-zinc-200">
              <table className="min-w-full text-sm">
                <thead className="text-left text-xs uppercase tracking-wide text-zinc-500">
                  <tr>
                    <th className="px-3 py-2">Profile</th>
                    <th className="px-3 py-2">Type</th>
                    <th className="px-3 py-2">Public URL</th>
                    <th className="px-3 py-2">Claim code</th>
                  </tr>
                </thead>
                <tbody>
                  {state.claimRows.map((row) => (
                    <tr key={row.profileId} className="border-t border-zinc-100">
                      <td className="px-3 py-2 font-medium text-zinc-900">{row.displayName}</td>
                      <td className="px-3 py-2 text-zinc-700">{row.role}</td>
                      <td className="px-3 py-2">
                        <a href={row.publicPath} target="_blank" className="text-brand underline">
                          {row.publicPath}
                        </a>
                      </td>
                      <td className="px-3 py-2 font-mono text-xs text-zinc-900">{row.claimCode}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}


import Link from "next/link";
import type { Metadata } from "next";
import { LEGAL_DOCS } from "@/lib/legal-docs";

export const metadata: Metadata = {
  title: "Legal hub",
  description: "Core legal terms, policies, and registration agreements for Reclaimed Marketplace.",
};

export default function LegalHubPage() {
  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-8 sm:px-6 sm:py-10">
      <h1 className="text-3xl font-semibold tracking-tight text-zinc-900 sm:text-4xl">Legal hub</h1>
      <p className="mt-3 text-sm leading-relaxed text-zinc-600 sm:text-base">
        These are the legal documents users agree to when creating an account and using the platform.
      </p>

      <div className="mt-6 rounded-xl border border-zinc-200 bg-white p-4">
        <p className="text-sm text-zinc-700">
          Registration consent is captured as one single confirmation: <strong>&ldquo;I agree to the Legal hub documents&rdquo;</strong>.
        </p>
      </div>

      <ul className="mt-6 space-y-2">
        {LEGAL_DOCS.map((doc) => (
          <li key={doc.fileName}>
            <a
              href={`/legal-hub/docs/${encodeURIComponent(doc.fileName)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="block rounded-lg border border-zinc-200 bg-white px-4 py-3 text-sm font-medium text-zinc-900 transition hover:border-brand/40 hover:text-brand"
            >
              {doc.title}
              <span className="ml-2 text-xs font-normal text-zinc-500">PDF</span>
            </a>
          </li>
        ))}
      </ul>

      <p className="mt-8 text-sm text-zinc-600">
        Need help? Contact us through your dashboard or main support channels.
      </p>
      <Link href="/" className="mt-2 inline-block text-sm font-medium text-brand hover:underline">
        Back to homepage
      </Link>
    </div>
  );
}

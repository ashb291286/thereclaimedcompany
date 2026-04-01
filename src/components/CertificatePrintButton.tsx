"use client";

export function CertificatePrintButton() {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="rounded-lg bg-emerald-700 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-emerald-800 print:hidden"
    >
      Print / save as PDF
    </button>
  );
}

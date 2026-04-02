"use client";

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";

export function DrivenDocumentDropzone({ vehicleId, entryId }: { vehicleId: string; entryId: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const onFiles = useCallback(
    async (files: FileList | null) => {
      if (!files?.length) return;
      setBusy(true);
      setMessage(null);
      try {
        for (let i = 0; i < files.length; i++) {
          const file = files[i];
          const fd = new FormData();
          fd.append("file", file);
          fd.append("vehicleId", vehicleId);
          fd.append("entryId", entryId);
          const res = await fetch("/api/driven/documents", { method: "POST", body: fd });
          if (!res.ok) {
            const j = (await res.json()) as { error?: string };
            throw new Error(j.error ?? "Upload failed");
          }
        }
        setMessage("Uploaded. Refreshing record…");
        router.refresh();
      } catch (e) {
        setMessage(e instanceof Error ? e.message : "Upload failed");
      } finally {
        setBusy(false);
      }
    },
    [entryId, router, vehicleId]
  );

  return (
    <div className="border border-dashed border-driven-muted bg-driven-accent-light/30 px-4 py-8 text-center">
      <label className="cursor-pointer font-[family-name:var(--font-driven-mono)] text-xs uppercase tracking-wide text-driven-ink">
        <input
          type="file"
          multiple
          accept=".pdf,.jpg,.jpeg,.png,.webp,.heic"
          className="sr-only"
          disabled={busy}
          onChange={(e) => void onFiles(e.target.files)}
        />
        {busy ? "Uploading…" : "+ Drop invoice, photo, or PDF — or click to choose"}
      </label>
      {message ? <p className="mt-3 text-xs text-driven-muted">{message}</p> : null}
    </div>
  );
}

import Link from "next/link";
import { notFound } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { createLineageEntryDraftAction } from "@/app/driven/actions";
import { DrivenDocumentDropzone } from "@/components/driven/DrivenDocumentDropzone";

const CATEGORIES = [
  { value: "FACTORY", label: "Factory" },
  { value: "OWNERSHIP", label: "Ownership" },
  { value: "SERVICE", label: "Service" },
  { value: "BODYWORK", label: "Bodywork" },
  { value: "RESTORATION", label: "Restoration" },
  { value: "COMPETITION", label: "Competition" },
  { value: "DOCUMENT", label: "Document" },
] as const;

const ERROR_MESSAGES: Record<string, string> = {
  "missing-fields": "Title and date are required.",
  "invalid-date": "Could not parse the date.",
  "invalid-category": "Pick a valid category.",
};

type Props = {
  params: Promise<{ vehicleId: string }>;
  searchParams: Promise<{ entryId?: string; error?: string }>;
};

export default async function DrivenGarageUploadPage({ params, searchParams }: Props) {
  const { vehicleId } = await params;
  const sp = await searchParams;
  const session = await auth();
  if (!session?.user?.id) notFound();

  const vehicle = await prisma.drivenVehicle.findUnique({
    where: { id: vehicleId },
    select: { ownerId: true, registration: true },
  });
  if (!vehicle || vehicle.ownerId !== session.user.id) notFound();

  const entryId = sp.entryId?.trim();
  if (entryId) {
    const entry = await prisma.drivenLineageEntry.findFirst({
      where: { id: entryId, vehicleId },
      select: { id: true, title: true },
    });
    if (!entry) notFound();
  }

  const error = sp.error ? (ERROR_MESSAGES[sp.error] ?? sp.error) : null;

  return (
    <div>
      <nav className="font-[family-name:var(--font-driven-mono)] text-[10px] uppercase tracking-wide text-driven-muted">
        <Link href="/driven/garage" className="hover:text-driven-ink">
          Garage
        </Link>
        <span className="mx-2">/</span>
        <Link href={`/driven/garage/${vehicleId}/record`} className="hover:text-driven-ink">
          {vehicle.registration}
        </Link>
        <span className="mx-2">/</span>
        <span className="text-driven-ink">Upload</span>
      </nav>

      <h1 className="mt-6 font-[family-name:var(--font-driven-display)] text-3xl italic text-driven-ink">
        {entryId ? "Attach documents" : "New history entry"}
      </h1>
      <p className="mt-2 max-w-xl text-sm text-driven-muted">
        {entryId
          ? "Upload invoices, photos, or PDFs to this entry. Files go to secure storage and update your passport score."
          : "Describe the event first, then upload proof on the next step."}
      </p>

      {error ? (
        <p className="mt-4 font-[family-name:var(--font-driven-mono)] text-xs text-driven-accent">{error}</p>
      ) : null}

      {!entryId ? (
        <form action={createLineageEntryDraftAction} className="mx-auto mt-10 max-w-lg space-y-4 border border-driven-warm bg-white p-6">
          <input type="hidden" name="vehicleId" value={vehicleId} />
          <div>
            <label htmlFor="cat" className="font-[family-name:var(--font-driven-mono)] text-[10px] uppercase text-driven-muted">
              Category
            </label>
            <select
              id="cat"
              name="category"
              required
              className="mt-1 w-full border border-driven-warm bg-driven-paper px-3 py-2 text-sm"
            >
              {CATEGORIES.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="title" className="font-[family-name:var(--font-driven-mono)] text-[10px] uppercase text-driven-muted">
              Title
            </label>
            <input id="title" name="title" required className="mt-1 w-full border border-driven-warm bg-driven-paper px-3 py-2 text-sm" />
          </div>
          <div>
            <label htmlFor="date" className="font-[family-name:var(--font-driven-mono)] text-[10px] uppercase text-driven-muted">
              Date
            </label>
            <input id="date" name="date" type="date" required className="mt-1 w-full border border-driven-warm bg-driven-paper px-3 py-2 text-sm" />
          </div>
          <div>
            <label htmlFor="mileage" className="font-[family-name:var(--font-driven-mono)] text-[10px] uppercase text-driven-muted">
              Mileage at time
            </label>
            <input id="mileage" name="mileageAtTime" type="number" className="mt-1 w-full border border-driven-warm bg-driven-paper px-3 py-2 text-sm" />
          </div>
          <div>
            <label htmlFor="desc" className="font-[family-name:var(--font-driven-mono)] text-[10px] uppercase text-driven-muted">
              Description
            </label>
            <textarea id="desc" name="description" rows={3} className="mt-1 w-full border border-driven-warm bg-driven-paper px-3 py-2 text-sm" />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="cost" className="font-[family-name:var(--font-driven-mono)] text-[10px] uppercase text-driven-muted">
                Cost (pence)
              </label>
              <input id="cost" name="cost" type="number" className="mt-1 w-full border border-driven-warm bg-driven-paper px-3 py-2 text-sm" />
            </div>
            <div>
              <label htmlFor="workshop" className="font-[family-name:var(--font-driven-mono)] text-[10px] uppercase text-driven-muted">
                Workshop
              </label>
              <input id="workshop" name="workshop" className="mt-1 w-full border border-driven-warm bg-driven-paper px-3 py-2 text-sm" />
            </div>
          </div>
          <button
            type="submit"
            className="w-full border border-driven-ink bg-driven-ink py-3 font-[family-name:var(--font-driven-mono)] text-xs uppercase tracking-wide text-driven-paper"
          >
            Continue to upload
          </button>
        </form>
      ) : (
        <div className="mx-auto mt-10 max-w-lg space-y-6">
          <DrivenDocumentDropzone vehicleId={vehicleId} entryId={entryId} />
          <p className="text-center text-xs text-driven-muted">
            <Link href={`/driven/garage/${vehicleId}/record`} className="underline">
              Back to full record
            </Link>
            {" · "}
            <Link href={`/driven/garage/${vehicleId}/upload`} className="underline">
              Create another entry
            </Link>
          </p>
        </div>
      )}
    </div>
  );
}

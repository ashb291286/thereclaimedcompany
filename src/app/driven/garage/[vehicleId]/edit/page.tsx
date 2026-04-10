import Link from "next/link";
import { notFound } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { DrivenGarageVehicleEditForm } from "@/components/driven/DrivenGarageVehicleEditForm";

const ERROR_MESSAGES: Record<string, string> = {
  "missing-fields": "Registration, make, model, and year are required.",
  "delete-missing-confirm": "Type the registration exactly to confirm deletion.",
  "delete-active-auction": "You cannot delete a vehicle while its auction is live. End or withdraw the auction first.",
  "delete-reg-mismatch": "The registration you typed does not match this vehicle. Try again.",
};

type Props = {
  params: Promise<{ vehicleId: string }>;
  searchParams: Promise<{ saved?: string; error?: string }>;
};

export default async function DrivenGarageEditVehiclePage({ params, searchParams }: Props) {
  const { vehicleId } = await params;
  const session = await auth();
  if (!session?.user?.id) notFound();

  const vehicle = await prisma.drivenVehicle.findUnique({
    where: { id: vehicleId },
    include: { auction: { select: { id: true, status: true } } },
  });

  if (!vehicle || vehicle.ownerId !== session.user.id) notFound();

  const sp = await searchParams;
  const saved = sp.saved === "1";
  const errorKey = sp.error;
  const error = errorKey ? (ERROR_MESSAGES[errorKey] ?? errorKey) : null;

  const auctionActive = vehicle.auction?.status === "ACTIVE";
  const canDelete = !auctionActive;
  const deleteBlockedReason = auctionActive
    ? "This vehicle has a live auction. You cannot delete it until the auction has ended or been withdrawn."
    : null;

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
        <span className="text-driven-ink">Edit</span>
      </nav>

      <header className="mt-6">
        <h1 className="font-[family-name:var(--font-driven-display)] text-3xl italic text-driven-ink">
          Edit vehicle
        </h1>
        <p className="mt-2 max-w-xl text-sm text-driven-muted">
          Update core details shown on your passport and in the garage. Your timeline and documents are not changed here.
        </p>
      </header>

      {saved ? (
        <p className="mt-6 rounded-sm border border-driven-warm bg-driven-accent-light/30 px-3 py-2 text-sm text-driven-ink">
          Saved.
        </p>
      ) : null}
      {error ? (
        <p className="mt-6 rounded-sm border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">{error}</p>
      ) : null}

      <div className="mx-auto mt-8 max-w-2xl">
        <DrivenGarageVehicleEditForm
          vehicleId={vehicle.id}
          registration={vehicle.registration}
          make={vehicle.make}
          model={vehicle.model}
          year={vehicle.year}
          colour={vehicle.colour}
          mileage={vehicle.mileage}
          vin={vehicle.vin}
          canDelete={canDelete}
          deleteBlockedReason={deleteBlockedReason}
        />
      </div>
    </div>
  );
}

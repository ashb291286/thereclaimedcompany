"use client";

import { useFormStatus } from "react-dom";
import {
  deleteDrivenVehicleFromGarageAction,
  updateDrivenVehicleFromGarageAction,
} from "@/app/driven/actions";
import Link from "next/link";

function SaveLabel() {
  const { pending } = useFormStatus();
  return pending ? "Saving…" : "Save changes";
}

function DeleteLabel() {
  const { pending } = useFormStatus();
  return pending ? "Deleting…" : "Delete vehicle permanently";
}

export function DrivenGarageVehicleEditForm(props: {
  vehicleId: string;
  registration: string;
  make: string;
  model: string;
  year: number;
  colour: string | null;
  mileage: number | null;
  vin: string | null;
  canDelete: boolean;
  deleteBlockedReason: string | null;
}) {
  const {
    vehicleId,
    registration,
    make,
    model,
    year,
    colour,
    mileage,
    vin,
    canDelete,
    deleteBlockedReason,
  } = props;

  return (
    <div className="space-y-10">
      <form action={updateDrivenVehicleFromGarageAction} className="space-y-5 border border-driven-warm bg-white p-6">
        <input type="hidden" name="vehicleId" value={vehicleId} />
        <h2 className="font-[family-name:var(--font-driven-mono)] text-[10px] uppercase tracking-[0.2em] text-driven-muted">
          Vehicle details
        </h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label htmlFor="edit-reg" className="font-[family-name:var(--font-driven-mono)] text-[10px] uppercase text-driven-muted">
              Registration
            </label>
            <input
              id="edit-reg"
              name="registration"
              required
              defaultValue={registration}
              className="mt-1 w-full border border-driven-warm bg-driven-paper px-3 py-2 font-[family-name:var(--font-driven-mono)] text-sm uppercase text-driven-ink"
            />
          </div>
          <div>
            <label htmlFor="edit-make" className="font-[family-name:var(--font-driven-mono)] text-[10px] uppercase text-driven-muted">
              Make
            </label>
            <input
              id="edit-make"
              name="make"
              required
              defaultValue={make}
              className="mt-1 w-full border border-driven-warm bg-driven-paper px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label htmlFor="edit-model" className="font-[family-name:var(--font-driven-mono)] text-[10px] uppercase text-driven-muted">
              Model
            </label>
            <input
              id="edit-model"
              name="model"
              required
              defaultValue={model}
              className="mt-1 w-full border border-driven-warm bg-driven-paper px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label htmlFor="edit-year" className="font-[family-name:var(--font-driven-mono)] text-[10px] uppercase text-driven-muted">
              Year
            </label>
            <input
              id="edit-year"
              name="year"
              type="number"
              required
              defaultValue={year}
              className="mt-1 w-full border border-driven-warm bg-driven-paper px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label htmlFor="edit-colour" className="font-[family-name:var(--font-driven-mono)] text-[10px] uppercase text-driven-muted">
              Colour
            </label>
            <input
              id="edit-colour"
              name="colour"
              defaultValue={colour ?? ""}
              className="mt-1 w-full border border-driven-warm bg-driven-paper px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label htmlFor="edit-mileage" className="font-[family-name:var(--font-driven-mono)] text-[10px] uppercase text-driven-muted">
              Mileage
            </label>
            <input
              id="edit-mileage"
              name="mileage"
              type="number"
              defaultValue={mileage ?? ""}
              className="mt-1 w-full border border-driven-warm bg-driven-paper px-3 py-2 text-sm"
            />
          </div>
          <div className="sm:col-span-2">
            <label htmlFor="edit-vin" className="font-[family-name:var(--font-driven-mono)] text-[10px] uppercase text-driven-muted">
              VIN (optional)
            </label>
            <input
              id="edit-vin"
              name="vin"
              defaultValue={vin ?? ""}
              className="mt-1 w-full border border-driven-warm bg-driven-paper px-3 py-2 font-[family-name:var(--font-driven-mono)] text-sm"
            />
          </div>
        </div>
        <button
          type="submit"
          className="border border-driven-ink bg-driven-ink px-5 py-2.5 font-[family-name:var(--font-driven-mono)] text-[10px] uppercase tracking-wide text-driven-paper hover:bg-driven-accent disabled:opacity-50"
        >
          <SaveLabel />
        </button>
      </form>

      <section className="border-2 border-red-800/80 bg-red-950/5 p-6">
        <h2 className="font-[family-name:var(--font-driven-display)] text-xl italic text-red-950">Danger zone</h2>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-red-950/90">
          Deleting this vehicle <strong>cannot be undone</strong>. Your entire Driven passport for it will be removed:
          timeline entries, uploaded documents, inspection data, valuations, and any auction listing and Q&amp;A tied to
          this record. Other people who saved this car to their garage will lose that link too.
        </p>
        {canDelete ? (
          <form action={deleteDrivenVehicleFromGarageAction} className="mt-6 max-w-md space-y-4">
            <input type="hidden" name="vehicleId" value={vehicleId} />
            <div>
              <label htmlFor="confirm-delete-reg" className="font-[family-name:var(--font-driven-mono)] text-[10px] uppercase text-red-900">
                Type the registration to confirm
              </label>
              <p className="mt-1 text-xs text-driven-muted">
                Enter <span className="font-mono font-semibold text-driven-ink">{registration}</span> (spaces optional;
                we match ignoring spaces).
              </p>
              <input
                id="confirm-delete-reg"
                name="confirmRegistration"
                type="text"
                autoComplete="off"
                placeholder="e.g. AB12CDE"
                className="mt-2 w-full border border-red-800/60 bg-white px-3 py-2 font-[family-name:var(--font-driven-mono)] text-sm uppercase text-driven-ink"
              />
            </div>
            <button
              type="submit"
              className="w-full border border-red-800 bg-red-800 px-4 py-3 font-[family-name:var(--font-driven-mono)] text-[10px] uppercase tracking-wide text-white hover:bg-red-900 disabled:opacity-50"
            >
              <DeleteLabel />
            </button>
          </form>
        ) : (
          <p className="mt-6 rounded-sm border border-red-800/40 bg-white/80 px-3 py-2 text-sm text-red-950">
            {deleteBlockedReason ??
              "This vehicle cannot be deleted while it has an active auction. End or withdraw the auction first, then try again."}
          </p>
        )}
        <p className="mt-6 text-xs text-driven-muted">
          <Link href={`/driven/garage/${vehicleId}/record`} className="text-driven-accent underline">
            Back to record
          </Link>
          {" · "}
          <Link href="/driven/garage" className="text-driven-accent underline">
            Garage
          </Link>
        </p>
      </section>
    </div>
  );
}

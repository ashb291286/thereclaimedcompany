"use client";

import { useState } from "react";
import { OpeningHoursEditor } from "@/components/OpeningHoursEditor";

export function YardFieldsToggle({
  initialSellerType = "individual",
  initialBusinessName = "",
  initialYearEstablished = "",
}: {
  initialSellerType?: "individual" | "reclamation_yard" | "dealer";
  initialBusinessName?: string;
  initialYearEstablished?: string;
}) {
  const [sellerType, setSellerType] = useState<"individual" | "reclamation_yard" | "dealer">(
    initialSellerType
  );
  const [vatRegistered, setVatRegistered] = useState(false);
  const [vatNumber, setVatNumber] = useState("");
  const [salvoCodeMember, setSalvoCodeMember] = useState(false);
  const [isRegisteredCharity, setIsRegisteredCharity] = useState(false);
  const [charityNumber, setCharityNumber] = useState("");
  const [businessName, setBusinessName] = useState(initialBusinessName);
  const [yearEstablished, setYearEstablished] = useState(initialYearEstablished);
  const showBusiness = sellerType === "reclamation_yard" || sellerType === "dealer";
  const showSalvo = sellerType === "reclamation_yard";

  return (
    <>
      <div>
        <label className="block text-sm font-medium text-zinc-700 mb-2">
          I am selling as
        </label>
        <input type="hidden" name="sellerType" value={sellerType} />
        <input type="hidden" name="vatRegistered" value={vatRegistered ? "yes" : "no"} />
        <input type="hidden" name="vatNumber" value={vatNumber} />
        <input type="hidden" name="salvoCodeMember" value={salvoCodeMember ? "yes" : "no"} />
        <input type="hidden" name="isRegisteredCharity" value={isRegisteredCharity ? "yes" : "no"} />
        <input type="hidden" name="charityNumber" value={charityNumber} />
        <div className="grid gap-3 sm:grid-cols-3">
          <button
            type="button"
            onClick={() => setSellerType("individual")}
            className={`rounded-xl border p-4 text-left transition ${
              sellerType === "individual"
                ? "border-brand bg-brand-soft/60 ring-1 ring-brand/25"
                : "border-zinc-200 bg-white hover:border-zinc-300"
            }`}
          >
            <p className="text-sm font-semibold text-zinc-900">Individual seller</p>
            <p className="mt-1 text-xs text-zinc-600">Selling your own reclaimed items.</p>
          </button>
          <button
            type="button"
            onClick={() => setSellerType("reclamation_yard")}
            className={`rounded-xl border p-4 text-left transition ${
              sellerType === "reclamation_yard"
                ? "border-brand bg-brand-soft/60 ring-1 ring-brand/25"
                : "border-zinc-200 bg-white hover:border-zinc-300"
            }`}
          >
            <p className="text-sm font-semibold text-zinc-900">Reclamation yard</p>
            <p className="mt-1 text-xs text-zinc-600">Business inventory and yard details.</p>
          </button>
          <button
            type="button"
            onClick={() => setSellerType("dealer")}
            className={`rounded-xl border p-4 text-left transition ${
              sellerType === "dealer"
                ? "border-brand bg-brand-soft/60 ring-1 ring-brand/25"
                : "border-zinc-200 bg-white hover:border-zinc-300"
            }`}
          >
            <p className="text-sm font-semibold text-zinc-900">Dealer</p>
            <p className="mt-1 text-xs text-zinc-600">Antiques dealer profile and business details.</p>
          </button>
        </div>
      </div>
      {showBusiness && (
        <div className="space-y-4">
          <div>
            <label htmlFor="businessName" className="block text-sm font-medium text-zinc-700 mb-1">
              Business name
            </label>
            <input
              id="businessName"
              name="businessName"
              type="text"
              value={businessName}
              onChange={(e) => setBusinessName(e.target.value)}
              placeholder={sellerType === "dealer" ? "Your dealer business name" : "Your reclamation yard name"}
              className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-zinc-900 focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
            />
          </div>
          <div>
            <label htmlFor="yearEstablished" className="block text-sm font-medium text-zinc-700 mb-1">
              Year established (optional)
            </label>
            <input
              id="yearEstablished"
              name="yearEstablished"
              type="number"
              min={1800}
              max={new Date().getFullYear()}
              value={yearEstablished}
              onChange={(e) => setYearEstablished(e.target.value)}
              placeholder="e.g. 1998"
              className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-zinc-900 focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
            />
          </div>
          <fieldset className="rounded-xl border border-zinc-200 bg-zinc-50/80 p-4">
            <legend className="px-1 text-sm font-semibold text-zinc-900">VAT (UK)</legend>
            <p className="mt-1 text-xs text-zinc-600">
              VAT-registered yards enter prices <strong>excluding</strong> VAT. Buyers pay 20% UK VAT at checkout; we
              show them the total.
            </p>
            <div className="mt-3 space-y-2">
              <label className="flex cursor-pointer gap-3 rounded-lg border border-zinc-200 bg-white p-3 text-sm has-[:checked]:border-brand has-[:checked]:ring-1 has-[:checked]:ring-brand/25">
                <input
                  type="radio"
                  name="vatChoice"
                  className="mt-0.5"
                  checked={!vatRegistered}
                  onChange={() => {
                    setVatRegistered(false);
                    setVatNumber("");
                  }}
                />
                <span>
                  <span className="font-medium text-zinc-900">Not VAT registered</span>
                  <span className="mt-0.5 block text-xs text-zinc-600">
                    Prices you enter are the full amount buyers pay.
                  </span>
                </span>
              </label>
              <label className="flex cursor-pointer gap-3 rounded-lg border border-zinc-200 bg-white p-3 text-sm has-[:checked]:border-brand has-[:checked]:ring-1 has-[:checked]:ring-brand/25">
                <input
                  type="radio"
                  name="vatChoice"
                  className="mt-0.5"
                  checked={vatRegistered}
                  onChange={() => setVatRegistered(true)}
                />
                <span>
                  <span className="font-medium text-zinc-900">VAT registered</span>
                  <span className="mt-0.5 block text-xs text-zinc-600">
                    Prices exclude VAT — 20% is added for buyers at checkout.
                  </span>
                </span>
              </label>
            </div>
            {vatRegistered ? (
              <div className="mt-3">
                <label htmlFor="vatNumber" className="block text-xs font-semibold text-zinc-800">
                  VAT number
                </label>
                <input
                  id="vatNumber"
                  type="text"
                  value={vatNumber}
                  onChange={(e) => setVatNumber(e.target.value.toUpperCase())}
                  placeholder="e.g. GB123456789"
                  className="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
                />
                <p className="mt-1 text-xs text-zinc-600">
                  We will save this against your seller profile for invoicing/compliance records.
                </p>
              </div>
            ) : null}
          </fieldset>
          <fieldset className="rounded-xl border border-zinc-200 bg-zinc-50/80 p-4">
            <legend className="px-1 text-sm font-semibold text-zinc-900">Charity support</legend>
            <p className="mt-1 text-xs text-zinc-600">
              Registered charities can list without seller fees. You only pay Stripe transaction charges.
            </p>
            <div className="mt-3 space-y-2">
              <label className="flex cursor-pointer gap-3 rounded-lg border border-zinc-200 bg-white p-3 text-sm has-[:checked]:border-brand has-[:checked]:ring-1 has-[:checked]:ring-brand/25">
                <input
                  type="radio"
                  name="charityChoice"
                  className="mt-0.5"
                  checked={!isRegisteredCharity}
                  onChange={() => {
                    setIsRegisteredCharity(false);
                    setCharityNumber("");
                  }}
                />
                <span>
                  <span className="font-medium text-zinc-900">Not a registered charity</span>
                  <span className="mt-0.5 block text-xs text-zinc-600">
                    Standard marketplace seller fees apply.
                  </span>
                </span>
              </label>
              <label className="flex cursor-pointer gap-3 rounded-lg border border-zinc-200 bg-white p-3 text-sm has-[:checked]:border-brand has-[:checked]:ring-1 has-[:checked]:ring-brand/25">
                <input
                  type="radio"
                  name="charityChoice"
                  className="mt-0.5"
                  checked={isRegisteredCharity}
                  onChange={() => setIsRegisteredCharity(true)}
                />
                <span>
                  <span className="font-medium text-zinc-900">Registered charity</span>
                  <span className="mt-0.5 block text-xs text-zinc-600">
                    We show a “Charity Support” pill on your profile and listings.
                  </span>
                </span>
              </label>
            </div>
            {isRegisteredCharity ? (
              <div className="mt-3">
                <label htmlFor="charityNumber" className="block text-xs font-semibold text-zinc-800">
                  Charity number
                </label>
                <input
                  id="charityNumber"
                  type="text"
                  value={charityNumber}
                  onChange={(e) => setCharityNumber(e.target.value.toUpperCase())}
                  placeholder="e.g. 1234567"
                  className="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
                />
                <p className="mt-1 text-xs text-zinc-600">Please enter your registered charity number.</p>
              </div>
            ) : null}
          </fieldset>
          {showSalvo ? (
            <fieldset className="rounded-xl border border-zinc-200 bg-zinc-50/80 p-4">
              <legend className="px-1 text-sm font-semibold text-zinc-900">Salvo Code</legend>
              <p className="mt-1 text-xs text-zinc-600">
                Are you a part of the Salvo Code? If yes, we show a <strong>Salvo Code Member</strong> badge on
                your profile and listings.
              </p>
              <div className="mt-3 space-y-2">
                <label className="flex cursor-pointer gap-3 rounded-lg border border-zinc-200 bg-white p-3 text-sm has-[:checked]:border-brand has-[:checked]:ring-1 has-[:checked]:ring-brand/25">
                  <input
                    type="radio"
                    name="salvoCodeChoice"
                    className="mt-0.5"
                    checked={!salvoCodeMember}
                    onChange={() => setSalvoCodeMember(false)}
                  />
                  <span>
                    <span className="font-medium text-zinc-900">No</span>
                    <span className="mt-0.5 block text-xs text-zinc-600">
                      No Salvo badge shown.
                    </span>
                  </span>
                </label>
                <label className="flex cursor-pointer gap-3 rounded-lg border border-zinc-200 bg-white p-3 text-sm has-[:checked]:border-brand has-[:checked]:ring-1 has-[:checked]:ring-brand/25">
                  <input
                    type="radio"
                    name="salvoCodeChoice"
                    className="mt-0.5"
                    checked={salvoCodeMember}
                    onChange={() => setSalvoCodeMember(true)}
                  />
                  <span>
                    <span className="font-medium text-zinc-900">Yes</span>
                    <span className="mt-0.5 block text-xs text-zinc-600">
                      Show “Salvo Code Member” on public yard and listing views.
                    </span>
                  </span>
                </label>
              </div>
            </fieldset>
          ) : null}
          <OpeningHoursEditor />
        </div>
      )}
    </>
  );
}

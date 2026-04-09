"use client";

import { DISPLAY_CURRENCIES, parseDisplayCurrency } from "@/lib/display-currency";
import { useDisplayCurrency } from "./CurrencyProvider";

export function CurrencySwitcher() {
  const { currency, setCurrency, ratesLoaded } = useDisplayCurrency();

  return (
    <div className="flex flex-col gap-0.5">
      <label htmlFor="display-currency" className="sr-only">
        Display currency
      </label>
      <select
        id="display-currency"
        value={currency}
        onChange={(e) => setCurrency(parseDisplayCurrency(e.target.value))}
        className="max-w-[7.5rem] rounded-md border border-zinc-200 bg-white py-1 pl-2 pr-6 text-xs font-medium text-zinc-800 shadow-sm focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand sm:max-w-none sm:text-sm"
        title="Approximate conversion for browsing — checkout is in GBP"
      >
        {DISPLAY_CURRENCIES.map(({ code, label }) => (
          <option key={code} value={code}>
            {label}
          </option>
        ))}
      </select>
      {!ratesLoaded ? (
        <span className="hidden text-[10px] text-zinc-400 sm:block">Loading rates…</span>
      ) : currency !== "GBP" ? (
        <span className="hidden text-[10px] leading-tight text-zinc-400 sm:block">
          Estimates · pay in £
        </span>
      ) : null}
    </div>
  );
}

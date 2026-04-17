"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  type DisplayCurrencyCode,
  DISPLAY_CURRENCY_STORAGE_KEY,
  FALLBACK_RATES_FROM_GBP,
  convertPenceGbpToMajor,
  formatMajorUnits,
  parseDisplayCurrency,
} from "@/lib/display-currency";

type Rates = Partial<Record<Exclude<DisplayCurrencyCode, "GBP">, number>>;

type CurrencyContextValue = {
  currency: DisplayCurrencyCode;
  setCurrency: (c: DisplayCurrencyCode) => void;
  rates: Rates | null;
  ratesLoaded: boolean;
  /** Formatted for UI; non-GBP prefixed with ~ (approximate). */
  formatPence: (penceGbp: number) => string;
};

const CurrencyContext = createContext<CurrencyContextValue | null>(null);

async function fetchFrankfurterRates(): Promise<Rates> {
  const res = await fetch("/api/exchange-rates");
  if (!res.ok) throw new Error("rates fetch failed");
  const data = (await res.json()) as { USD?: number; EUR?: number };
  if (data.USD == null || data.EUR == null) throw new Error("invalid rates");
  return { USD: data.USD, EUR: data.EUR };
}

export function CurrencyProvider({ children }: { children: ReactNode }) {
  const [currency, setCurrencyState] = useState<DisplayCurrencyCode>("GBP");
  const [rates, setRates] = useState<Rates | null>(null);
  const [ratesLoaded, setRatesLoaded] = useState(false);

  useEffect(() => {
    try {
      const stored = parseDisplayCurrency(
        typeof window !== "undefined" ? localStorage.getItem(DISPLAY_CURRENCY_STORAGE_KEY) : null
      );
      setCurrencyState(stored);
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const r = await fetchFrankfurterRates();
        if (!cancelled) setRates(r);
      } catch {
        if (!cancelled) setRates({ ...FALLBACK_RATES_FROM_GBP });
      } finally {
        if (!cancelled) setRatesLoaded(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const setCurrency = useCallback((c: DisplayCurrencyCode) => {
    setCurrencyState(c);
    try {
      localStorage.setItem(DISPLAY_CURRENCY_STORAGE_KEY, c);
    } catch {
      /* ignore */
    }
  }, []);

  const formatPence = useCallback(
    (penceGbp: number) => {
      const major = convertPenceGbpToMajor(penceGbp, currency, rates);
      const formatted = formatMajorUnits(major, currency);
      return currency === "GBP" ? formatted : `~${formatted}`;
    },
    [currency, rates]
  );

  const value = useMemo(
    () => ({
      currency,
      setCurrency,
      rates,
      ratesLoaded,
      formatPence,
    }),
    [currency, setCurrency, rates, ratesLoaded, formatPence]
  );

  return <CurrencyContext.Provider value={value}>{children}</CurrencyContext.Provider>;
}

export function useDisplayCurrency(): CurrencyContextValue {
  const ctx = useContext(CurrencyContext);
  if (!ctx) {
    throw new Error("useDisplayCurrency must be used within CurrencyProvider");
  }
  return ctx;
}

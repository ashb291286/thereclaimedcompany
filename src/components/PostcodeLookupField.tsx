"use client";

import { useCallback, useEffect, useId, useRef, useState, type KeyboardEventHandler } from "react";

type Suggestion = {
  postcode: string;
  adminDistrict: string | null;
  region: string | null;
  postcodeLocality: string | null;
};

type Props = {
  id?: string;
  name?: string;
  defaultValue?: string;
  required?: boolean;
  optional?: boolean;
  placeholder?: string;
  className?: string;
  "aria-describedby"?: string;
  /** Fired when the postcode value changes (typing, pick, or successful lookup). */
  onValueChange?: (value: string) => void;
  /** When false, the grey “Start typing for suggestions…” line is omitted unless there is a lookup hint. */
  showDefaultAssistiveText?: boolean;
  /** Marks the input for `document.querySelector("[data-search-postcode]")` (e.g. browse Apply button). */
  dataSearchPostcode?: boolean;
  onKeyDown?: KeyboardEventHandler<HTMLInputElement>;
};

export function PostcodeLookupField({
  id: idProp,
  name = "postcode",
  defaultValue = "",
  required,
  optional,
  placeholder = "e.g. SW1A 1AA",
  className = "",
  "aria-describedby": ariaDescribedBy,
  onValueChange,
  showDefaultAssistiveText = true,
  dataSearchPostcode,
  onKeyDown,
}: Props) {
  const onValueChangeRef = useRef(onValueChange);
  useEffect(() => {
    onValueChangeRef.current = onValueChange;
  }, [onValueChange]);

  const genId = useId();
  const inputId = idProp ?? genId;
  const [value, setValue] = useState(defaultValue);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [open, setOpen] = useState(false);
  const [hint, setHint] = useState<string | null>(null);
  const [hintOk, setHintOk] = useState<boolean | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const runSuggest = useCallback((q: string) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      if (q.trim().length < 2) {
        setSuggestions([]);
        return;
      }
      try {
        const res = await fetch(`/api/postcodes/suggest?q=${encodeURIComponent(q.trim())}`);
        const data = (await res.json()) as { suggestions?: Suggestion[] };
        setSuggestions(data.suggestions ?? []);
      } catch {
        setSuggestions([]);
      }
    }, 200);
  }, []);

  const runLookup = useCallback(async (input: string) => {
    const t = input.trim();
    if (!t) {
      if (optional) {
        setHint(null);
        setHintOk(null);
      }
      return;
    }
    if (optional && t.length < 5) {
      setHint(null);
      setHintOk(null);
      return;
    }
    try {
      const res = await fetch(`/api/postcodes/lookup?postcode=${encodeURIComponent(t)}`);
      const data = (await res.json()) as {
        ok?: boolean;
        postcode?: string;
        areaLine?: string;
        error?: string;
      };
      if (res.ok && data.ok && data.postcode) {
        setValue(data.postcode);
        onValueChangeRef.current?.(data.postcode);
        setHint(data.areaLine ? `${data.postcode} — ${data.areaLine}` : data.postcode);
        setHintOk(true);
      } else {
        setHint(
          optional
            ? "If you add a postcode, use a full UK one (e.g. SW1A 1AA)."
            : "We couldn't find that postcode. Try a full UK code."
        );
        setHintOk(false);
      }
    } catch {
      setHint("Lookup failed. Check your connection.");
      setHintOk(false);
    }
  }, [optional]);

  function pickSuggestion(s: Suggestion) {
    const line =
      s.postcodeLocality?.trim() || [s.adminDistrict, s.region].filter(Boolean).join(", ");
    setValue(s.postcode);
    onValueChangeRef.current?.(s.postcode);
    setSuggestions([]);
    setOpen(false);
    setHint(line ? `${s.postcode} — ${line}` : s.postcode);
    setHintOk(true);
  }

  return (
    <div className="relative">
      <input
        id={inputId}
        name={name}
        required={required}
        autoComplete="postal-code"
        value={value}
        {...(dataSearchPostcode ? { "data-search-postcode": true } : {})}
        onChange={(e) => {
          const v = e.target.value;
          setValue(v);
          onValueChangeRef.current?.(v);
          setHint(null);
          setHintOk(null);
          runSuggest(v);
          setOpen(true);
        }}
        onFocus={() => {
          if (value.trim().length >= 2) runSuggest(value);
        }}
        onKeyDown={(e) => {
          onKeyDown?.(e);
        }}
        onBlur={() => {
          setTimeout(() => setOpen(false), 200);
          const t = value.trim();
          if (!t && optional) return;
          if (t.length >= 5 || (!optional && t.length > 0)) runLookup(value);
        }}
        placeholder={placeholder}
        aria-describedby={ariaDescribedBy}
        className={
          className ||
          "w-full rounded-lg border border-zinc-300 px-3 py-2 text-zinc-900 focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
        }
      />
      {open && suggestions.length > 0 && (
        <ul
          className="absolute z-20 mt-1 max-h-52 w-full overflow-auto rounded-lg border border-zinc-200 bg-white py-1 shadow-lg"
          role="listbox"
        >
          {suggestions.map((s) => {
            const sub =
              s.postcodeLocality?.trim() || [s.adminDistrict, s.region].filter(Boolean).join(", ");
            return (
              <li key={s.postcode} role="option">
                <button
                  type="button"
                  className="w-full px-3 py-2 text-left text-sm hover:bg-zinc-50"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => pickSuggestion(s)}
                >
                  <span className="font-medium text-zinc-900">{s.postcode}</span>
                  {sub ? <span className="block text-xs text-zinc-500">{sub}</span> : null}
                </button>
              </li>
            );
          })}
        </ul>
      )}
      {hint ? (
        <p
          className={`mt-1 text-xs ${hintOk === true ? "text-emerald-700" : hintOk === false ? "text-red-600" : "text-zinc-500"}`}
          role="status"
        >
          {hint}
        </p>
      ) : showDefaultAssistiveText ? (
        <p className="mt-1 text-xs text-zinc-500">
          Start typing for suggestions. Uses free UK postcode data (town / city / region).
        </p>
      ) : null}
    </div>
  );
}

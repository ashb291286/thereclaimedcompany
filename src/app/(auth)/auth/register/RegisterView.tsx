"use client";

import Link from "next/link";
import { useState } from "react";
import { RegisterForm } from "./RegisterForm";

type RegisterAction = (formData: FormData) => Promise<{ error?: string } | void>;

const buyingBenefits = {
  eyebrow: "For buyers",
  title: "Find reclaimed stock you can actually use",
  subtitle:
    "Search the marketplace, save what you like, and check out when you are ready — with clear pricing and seller tools built in.",
  points: [
    "Browse fixed-price listings, auctions, and hire-ready Prop Yard items in one place.",
    "Save favourites and come back when you are ready to buy or hire.",
    "Make offers on eligible listings and respond if a seller sends a counter.",
    "See carbon and materials context on listings where sellers have added it.",
  ],
};

const sellingBenefits = {
  eyebrow: "For sellers",
  title: "Reach buyers and yards from a single listing",
  subtitle:
    "Publish reclaimed materials to the marketplace, take card payments safely, and keep offers and orders organised in your dashboard.",
  points: [
    "List once — buyers find you on the marketplace; nearby reclamation yards can be notified.",
    "Get paid with Stripe Connect; we route you through seller profile setup after sign up.",
    "Handle offers, accept or decline, and send counters without leaving your dashboard.",
    "Optionally surface items for film & TV hire through Prop Yard when you are ready.",
  ],
};

export function RegisterView({
  register,
  callbackUrl = "",
  sellerFlow = null,
}: {
  register: RegisterAction;
  /** Sanitized internal path only (from server). */
  callbackUrl?: string;
  sellerFlow?: "yard" | "dealer" | null;
}) {
  const flowLockedToSelling = sellerFlow === "yard" || sellerFlow === "dealer";
  const [accountIntent, setAccountIntent] = useState<"buying" | "selling">(
    flowLockedToSelling ? "selling" : "buying"
  );
  const yardBenefits = {
    eyebrow: "For reclamation yards",
    title: "Get your yard discovered by local buyers",
    subtitle:
      "Set up a dedicated yard profile, publish stock quickly, and grow repeat trade with a marketplace built around salvage.",
    points: [
      "Create a public yard profile with your opening hours and trust signals.",
      "List yard stock fast and reach buyers searching by postcode and distance.",
      "Receive enquiries, offers, and paid orders in one dashboard.",
      "Use fulfilment tools to manage collection and delivery handovers clearly.",
    ],
  };
  const dealerBenefits = {
    eyebrow: "For dealers",
    title: "Present high-value pieces with confidence",
    subtitle:
      "Build a premium dealer profile, capture provenance details, and run private deal threads before secure checkout.",
    points: [
      "Use dealer-tailored listing fields for dimensions, style, and provenance.",
      "Open private buyer discussions for premium pieces and present agreed deals.",
      "Issue authenticity certificates automatically on completed sales.",
      "Track invoicing, receipts, and handover progress in one place.",
    ],
  };
  const copy =
    sellerFlow === "yard"
      ? yardBenefits
      : sellerFlow === "dealer"
        ? dealerBenefits
        : accountIntent === "buying"
          ? buyingBenefits
          : sellingBenefits;
  const signInHref =
    callbackUrl !== "" ? `/auth/signin?callbackUrl=${encodeURIComponent(callbackUrl)}` : "/auth/signin";

  return (
    <div className="grid w-full grid-cols-1 gap-8 lg:grid-cols-2 lg:gap-10 lg:items-stretch">
      <aside className="order-2 flex flex-col justify-center rounded-2xl border border-zinc-200/90 bg-gradient-to-br from-brand-soft/50 via-white to-zinc-50 p-8 shadow-sm lg:order-1 lg:p-10">
        <div key={accountIntent}>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand">{copy.eyebrow}</p>
          <h2 className="mt-3 text-2xl font-semibold leading-tight text-zinc-900 lg:text-[1.65rem]">
            {copy.title}
          </h2>
          <p className="mt-3 text-sm leading-relaxed text-zinc-600">{copy.subtitle}</p>
          <ul className="mt-6 space-y-3">
            {copy.points.map((line) => (
              <li key={line} className="flex gap-3 text-sm text-zinc-700">
                <span
                  className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-brand"
                  aria-hidden
                />
                <span>{line}</span>
              </li>
            ))}
          </ul>
        </div>
      </aside>

      <div className="order-1 rounded-xl border border-zinc-200 bg-white p-8 shadow-sm lg:order-2">
        <p className="text-xs font-semibold uppercase tracking-wider text-brand">Welcome to The Reclaimed Company</p>
        <h1 className="mt-2 text-2xl font-semibold text-zinc-900">Create your account</h1>
        <p className="mt-1 text-sm text-zinc-600">
          {flowLockedToSelling
            ? sellerFlow === "yard"
              ? "Start your yard onboarding journey. We pre-configure this sign-up for reclamation yards."
              : "Start your dealer onboarding journey with the right setup from the first step."
            : "Choose how you plan to use the platform — you can always do both later."}
        </p>
        <div className="mt-6">
          <RegisterForm
            register={register}
            accountIntent={accountIntent}
            onAccountIntentChange={flowLockedToSelling ? undefined : setAccountIntent}
            callbackUrl={callbackUrl}
            sellerFlow={sellerFlow}
          />
        </div>
        <p className="mt-6 text-center text-sm text-zinc-600">
          Already have an account?{" "}
          <Link href={signInHref} className="font-medium text-brand hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}

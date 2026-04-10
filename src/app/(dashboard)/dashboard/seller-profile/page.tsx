import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { redirect } from "next/navigation";
import Link from "next/link";
import { OpeningHoursEditor } from "@/components/OpeningHoursEditor";
import { YardBrandingFields } from "@/components/YardBrandingFields";
import { updateYardProfileAction } from "@/lib/actions/seller-profile";
import { scheduleFromDbField } from "@/lib/opening-hours";
import { parseYardSocialJson } from "@/lib/yard-social";
import { publicSellerPath } from "@/lib/yard-public-path";
import { getSiteUrl } from "@/lib/yard-json-ld";
import { PostcodeLookupField } from "@/components/PostcodeLookupField";
import { formatUkLocationLine } from "@/lib/postcode-uk";
import { yardProfileCompletenessPercent } from "@/lib/yard-profile-completeness";
import { parseYardTrustFlagsJson } from "@/lib/yard-trust-flags";
import { parseYardDeliveryOptionsJson } from "@/lib/yard-delivery-options";

export default async function SellerProfileSettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ saved?: string; error?: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect("/auth/signin");

  const profile = await prisma.sellerProfile.findUnique({
    where: { userId: session.user.id },
    include: { user: { select: { role: true } } },
  });
  if (!profile) redirect("/dashboard/onboarding");
  const isYardAccount = (profile.user.role ?? session.user.role) === "reclamation_yard";
  if (!isYardAccount) redirect("/dashboard");

  const { saved, error } = await searchParams;
  const initialSchedule = scheduleFromDbField(profile.openingHoursSchedule);
  const social = parseYardSocialJson(profile.yardSocialJson);
  const previewHref = publicSellerPath({
    sellerId: session.user.id,
    role: profile.user.role,
    yardSlug: profile.yardSlug,
  });
  const siteUrl = getSiteUrl();
  const completeness = yardProfileCompletenessPercent(profile);
  const trustSaved = parseYardTrustFlagsJson(profile.yardTrustFlagsJson);
  const deliverySaved = parseYardDeliveryOptionsJson(profile.yardDeliveryOptionsJson);
  const mats = profile.yardPrimaryMaterials ?? [];

  return (
    <div className="mx-auto max-w-2xl">
      <Link href="/dashboard" className="text-sm font-medium text-brand hover:underline">
        ← Dashboard
      </Link>
      <h1 className="mt-4 text-2xl font-semibold text-zinc-900">Yard profile</h1>
      <p className="mt-1 text-sm text-zinc-600">
        Your public page is optimised for search engines and buyers. Set your <strong>location</strong>, URL,
        images, and keep hours and contact details up to date.
      </p>
      {saved === "1" ? (
        <p className="mt-4 rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-800">Saved.</p>
      ) : null}
      {error ? (
        <p className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
      ) : null}

      <div className="mt-4 rounded-xl border border-zinc-200 bg-white p-4">
        <div className="flex items-center justify-between gap-2">
          <p className="text-sm font-medium text-zinc-900">Profile strength</p>
          <p className="text-sm font-semibold text-brand">{completeness}%</p>
        </div>
        <div className="mt-2 h-2 overflow-hidden rounded-full bg-zinc-100">
          <div
            className="h-full rounded-full bg-brand transition-all"
            style={{ width: `${completeness}%` }}
          />
        </div>
        <p className="mt-2 text-xs text-zinc-500">
          Filled fields (long about, materials, hours, contact) help buyers and search.
        </p>
      </div>

      {profile.yardSlug ? (
        <p className="mt-4 rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm text-zinc-700">
          <span className="font-medium text-zinc-900">Live URL:</span>{" "}
          <Link href={previewHref} className="break-all text-brand hover:underline" target="_blank" rel="noreferrer">
            {siteUrl}
            {previewHref}
          </Link>
        </p>
      ) : null}

      <form action={updateYardProfileAction} className="mt-8 space-y-8">
        <section className="space-y-4">
          <h2 className="text-sm font-semibold text-zinc-900">Identity &amp; URL</h2>
          <div>
            <label htmlFor="displayName" className="mb-1 block text-sm font-medium text-zinc-700">
              Display name
            </label>
            <input
              id="displayName"
              name="displayName"
              type="text"
              required
              defaultValue={profile.displayName}
              className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-zinc-900 focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
            />
          </div>
          <div>
            <label htmlFor="businessName" className="mb-1 block text-sm font-medium text-zinc-700">
              Business name
            </label>
            <input
              id="businessName"
              name="businessName"
              type="text"
              defaultValue={profile.businessName ?? ""}
              placeholder="Official yard name (used in page title)"
              className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-zinc-900 focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
            />
          </div>
          <fieldset className="rounded-xl border border-zinc-200 bg-zinc-50/80 p-4">
            <legend className="px-1 text-sm font-semibold text-zinc-900">VAT on marketplace prices</legend>
            <p className="mt-1 text-xs text-zinc-600">
              If you are VAT registered, enter listing prices <strong>excluding</strong> VAT; buyers pay 20% at
              checkout. Otherwise your price is the full buyer total.
            </p>
            <div className="mt-3 space-y-2">
              <label className="flex cursor-pointer gap-3 rounded-lg border border-zinc-200 bg-white p-3 text-sm">
                <input
                  type="radio"
                  name="vatRegistered"
                  value="no"
                  defaultChecked={!profile.vatRegistered}
                  className="mt-0.5"
                />
                <span>Not VAT registered — my prices are the full amount buyers pay</span>
              </label>
              <label className="flex cursor-pointer gap-3 rounded-lg border border-zinc-200 bg-white p-3 text-sm">
                <input
                  type="radio"
                  name="vatRegistered"
                  value="yes"
                  defaultChecked={profile.vatRegistered}
                  className="mt-0.5"
                />
                <span>VAT registered — my prices exclude VAT (+20% for buyers)</span>
              </label>
            </div>
          </fieldset>
          <div>
            <label htmlFor="yardSlug" className="mb-1 block text-sm font-medium text-zinc-700">
              Public URL slug
            </label>
            <p className="mb-2 text-xs text-zinc-500">
              Lowercase letters, numbers and hyphens. This becomes part of your public link and helps Google
              understand your yard.
            </p>
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm text-zinc-500">{siteUrl}/yards/</span>
              <input
                id="yardSlug"
                name="yardSlug"
                type="text"
                required
                defaultValue={profile.yardSlug ?? ""}
                placeholder="your-yard-name"
                className="min-w-[12rem] flex-1 rounded-lg border border-zinc-300 px-3 py-2 text-zinc-900 focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
              />
            </div>
          </div>
        </section>

        <section className="space-y-4">
          <h2 className="text-sm font-semibold text-zinc-900">Location</h2>
          <p className="text-xs text-zinc-500">
            Your yard&apos;s postcode is used on your public page, in search and maps-style features, and in SEO
            (title, description, structured data). We resolve it to area and coordinates automatically.
          </p>
          <PostcodeLookupField
            id="yard-postcode"
            name="postcode"
            defaultValue={profile.postcode}
            required
            placeholder="e.g. M1 1AE"
          />
          {(profile.postcodeLocality || profile.adminDistrict || profile.region || profile.postcode) && (
            <p className="text-xs text-zinc-600">
              <span className="font-medium text-zinc-800">Shown to visitors:</span>{" "}
              {formatUkLocationLine({
                postcodeLocality: profile.postcodeLocality,
                adminDistrict: profile.adminDistrict,
                region: profile.region,
                postcode: profile.postcode,
              })}
            </p>
          )}
        </section>

        <section className="space-y-4">
          <h2 className="text-sm font-semibold text-zinc-900">Story for buyers &amp; Google</h2>
          <div>
            <label htmlFor="yardTagline" className="mb-1 block text-sm font-medium text-zinc-700">
              Tagline
            </label>
            <input
              id="yardTagline"
              name="yardTagline"
              type="text"
              defaultValue={profile.yardTagline ?? ""}
              placeholder="Short line under your name"
              className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-zinc-900 focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
            />
          </div>
          <div>
            <label htmlFor="yardAbout" className="mb-1 block text-sm font-medium text-zinc-700">
              About your yard
            </label>
            <p className="mb-2 text-xs text-zinc-500">
              If you add text here, use at least <strong>150 characters</strong> so buyers get a proper story (or leave
              blank for a default intro on your public page).
            </p>
            <textarea
              id="yardAbout"
              name="yardAbout"
              rows={6}
              defaultValue={profile.yardAbout ?? ""}
              placeholder="What you stock, how to visit, delivery, specialties — helps search and builds trust."
              className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-zinc-900 focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
            />
          </div>
        </section>

        <section className="space-y-4">
          <h2 className="text-sm font-semibold text-zinc-900">Specialisms &amp; trust</h2>
          <p className="text-xs text-zinc-500">
            Up to three short material labels (e.g. timber, brick, stone) — used for your public page heading.
          </p>
          <div className="grid gap-3 sm:grid-cols-3">
            <input
              name="yardMaterial1"
              type="text"
              defaultValue={mats[0] ?? ""}
              placeholder="Material 1"
              className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-900"
            />
            <input
              name="yardMaterial2"
              type="text"
              defaultValue={mats[1] ?? ""}
              placeholder="Material 2"
              className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-900"
            />
            <input
              name="yardMaterial3"
              type="text"
              defaultValue={mats[2] ?? ""}
              placeholder="Material 3"
              className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-900"
            />
          </div>
          <div>
            <label htmlFor="yardCustomTrustLine" className="mb-1 block text-sm font-medium text-zinc-700">
              Custom “why us” line (optional)
            </label>
            <input
              id="yardCustomTrustLine"
              name="yardCustomTrustLine"
              type="text"
              defaultValue={profile.yardCustomTrustLine ?? ""}
              placeholder="e.g. Family-run since 1982"
              className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-900"
            />
          </div>
          <fieldset className="rounded-lg border border-zinc-200 p-3">
            <legend className="px-1 text-xs font-semibold text-zinc-800">Trust badges</legend>
            <div className="mt-2 grid gap-2 sm:grid-cols-2">
              {(
                [
                  ["trust_familyRun", "familyRun", "Family run"],
                  ["trust_tradeCounter", "tradeCounter", "Trade counter"],
                  ["trust_delivery", "delivery", "Delivery available"],
                  ["trust_onsiteParking", "onsiteParking", "On-site parking"],
                  ["trust_inspectionWelcome", "inspectionWelcome", "Inspections welcome"],
                ] as const
              ).map(([name, key, label]) => (
                <label key={name} className="flex items-center gap-2 text-sm text-zinc-700">
                  <input type="checkbox" name={name} defaultChecked={Boolean(trustSaved[key])} className="rounded" />
                  {label}
                </label>
              ))}
            </div>
          </fieldset>
        </section>

        <section className="space-y-4">
          <h2 className="text-sm font-semibold text-zinc-900">Collection, delivery &amp; coverage</h2>
          <div className="flex flex-wrap gap-4">
            <label className="flex items-center gap-2 text-sm text-zinc-700">
              <input type="checkbox" name="delivery_collect" defaultChecked={Boolean(deliverySaved?.collection)} />
              Collection from yard
            </label>
            <label className="flex items-center gap-2 text-sm text-zinc-700">
              <input type="checkbox" name="delivery_deliver" defaultChecked={Boolean(deliverySaved?.delivery)} />
              Delivery offered
            </label>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-medium text-zinc-600">Delivery radius (miles, optional)</label>
              <input
                name="delivery_radius_miles"
                type="number"
                min={0}
                step={1}
                defaultValue={deliverySaved?.radiusMiles ?? ""}
                className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-zinc-600">Minimum order (£, optional)</label>
              <input
                name="delivery_min_order_gbp"
                type="number"
                min={0}
                step={1}
                defaultValue={deliverySaved?.minOrderGbp ?? ""}
                className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
              />
            </div>
          </div>
          <div>
            <label htmlFor="delivery_notes" className="mb-1 block text-sm font-medium text-zinc-700">
              Delivery / collection notes
            </label>
            <textarea
              id="delivery_notes"
              name="delivery_notes"
              rows={2}
              defaultValue={deliverySaved?.notes ?? ""}
              className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-900"
            />
          </div>
          <div>
            <label htmlFor="yardServiceAreas" className="mb-1 block text-sm font-medium text-zinc-700">
              Areas served (regions / counties)
            </label>
            <textarea
              id="yardServiceAreas"
              name="yardServiceAreas"
              rows={2}
              defaultValue={profile.yardServiceAreas ?? ""}
              placeholder="e.g. Greater Manchester, Cheshire, North Wales"
              className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-900"
            />
          </div>
        </section>

        <section className="space-y-4">
          <h2 className="text-sm font-semibold text-zinc-900">More details</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="yardWhatsApp" className="mb-1 block text-sm font-medium text-zinc-700">
                WhatsApp number
              </label>
              <input
                id="yardWhatsApp"
                name="yardWhatsApp"
                type="text"
                defaultValue={profile.yardWhatsApp ?? ""}
                placeholder="UK mobile, digits only ok"
                className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-900"
              />
            </div>
            <div>
              <label htmlFor="yearEstablished" className="mb-1 block text-sm font-medium text-zinc-700">
                Year established
              </label>
              <input
                id="yearEstablished"
                name="yearEstablished"
                type="number"
                min={1800}
                max={2100}
                defaultValue={profile.yearEstablished ?? ""}
                className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-900"
              />
            </div>
          </div>
          <fieldset className="rounded-lg border border-zinc-200 p-3">
            <legend className="px-1 text-xs font-semibold text-zinc-800">Who do you welcome?</legend>
            <div className="mt-2 space-y-2 text-sm text-zinc-700">
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  name="yardTradePublic"
                  value="both"
                  defaultChecked={!profile.yardTradePublic || profile.yardTradePublic === "both"}
                />
                Trade &amp; public
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  name="yardTradePublic"
                  value="trade"
                  defaultChecked={profile.yardTradePublic === "trade"}
                />
                Trade primarily
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  name="yardTradePublic"
                  value="public"
                  defaultChecked={profile.yardTradePublic === "public"}
                />
                Public / retail
              </label>
            </div>
          </fieldset>
          <div>
            <label htmlFor="yardResponseTimeNote" className="mb-1 block text-sm font-medium text-zinc-700">
              Response-time message (shown on enquiry form)
            </label>
            <input
              id="yardResponseTimeNote"
              name="yardResponseTimeNote"
              type="text"
              defaultValue={profile.yardResponseTimeNote ?? ""}
              placeholder="Typically responds within 24 hours"
              className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-900"
            />
          </div>
        </section>

        <section className="space-y-3">
          <h2 className="text-sm font-semibold text-zinc-900">Branding</h2>
          <YardBrandingFields
            initialLogoUrl={profile.yardLogoUrl}
            initialHeaderUrl={profile.yardHeaderImageUrl}
          />
        </section>

        <section className="space-y-4">
          <h2 className="text-sm font-semibold text-zinc-900">Contact</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="yardContactEmail" className="mb-1 block text-sm font-medium text-zinc-700">
                Email
              </label>
              <input
                id="yardContactEmail"
                name="yardContactEmail"
                type="email"
                defaultValue={profile.yardContactEmail ?? ""}
                placeholder="enquiries@..."
                className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-zinc-900 focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
              />
            </div>
            <div>
              <label htmlFor="yardContactPhone" className="mb-1 block text-sm font-medium text-zinc-700">
                Phone
              </label>
              <input
                id="yardContactPhone"
                name="yardContactPhone"
                type="text"
                defaultValue={profile.yardContactPhone ?? ""}
                placeholder="Displayed on your public page"
                className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-zinc-900 focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
              />
            </div>
          </div>
          <div>
            <label htmlFor="yardWebsiteUrl" className="mb-1 block text-sm font-medium text-zinc-700">
              Website
            </label>
            <input
              id="yardWebsiteUrl"
              name="yardWebsiteUrl"
              type="url"
              defaultValue={profile.yardWebsiteUrl ?? ""}
              placeholder="https://your-yard.co.uk"
              className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-zinc-900 focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
            />
          </div>
        </section>

        <section className="space-y-4">
          <h2 className="text-sm font-semibold text-zinc-900">Social links</h2>
          <p className="text-xs text-zinc-500">Full URLs work best (including https://).</p>
          <div className="grid gap-3 sm:grid-cols-2">
            {(
              [
                ["social_instagram", "Instagram", social.instagram],
                ["social_facebook", "Facebook", social.facebook],
                ["social_x", "X (Twitter)", social.x],
                ["social_linkedin", "LinkedIn", social.linkedin],
                ["social_tiktok", "TikTok", social.tiktok],
              ] as const
            ).map(([name, label, val]) => (
              <div key={name}>
                <label className="mb-1 block text-sm font-medium text-zinc-700">{label}</label>
                <input
                  name={name}
                  type="url"
                  defaultValue={val ?? ""}
                  placeholder="https://…"
                  className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-zinc-900 focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
                />
              </div>
            ))}
          </div>
        </section>

        <section className="space-y-3">
          <h2 className="text-sm font-semibold text-zinc-900">Opening hours</h2>
          <OpeningHoursEditor initialSchedule={initialSchedule} />
        </section>

        <button
          type="submit"
          className="w-full rounded-lg bg-brand px-4 py-2.5 font-medium text-white hover:bg-brand-hover focus:outline-none focus:ring-2 focus:ring-brand focus:ring-offset-2"
        >
          Save yard profile
        </button>
      </form>
    </div>
  );
}

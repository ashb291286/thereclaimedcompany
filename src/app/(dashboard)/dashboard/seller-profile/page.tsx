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
              <span className="text-sm text-zinc-500">{siteUrl}/reclamation-yard/</span>
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

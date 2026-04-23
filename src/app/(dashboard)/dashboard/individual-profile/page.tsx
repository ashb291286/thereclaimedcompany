import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { redirect } from "next/navigation";
import Link from "next/link";
import { YardBrandingFields } from "@/components/YardBrandingFields";
import { updateIndividualProfileBrandingAction } from "@/lib/actions/seller-profile";
import { publicSellerPath } from "@/lib/yard-public-path";
import { getSiteUrl } from "@/lib/yard-json-ld";

export default async function IndividualProfileSettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ saved?: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect("/auth/signin");

  const profile = await prisma.sellerProfile.findUnique({
    where: { userId: session.user.id },
    include: { user: { select: { role: true } } },
  });
  if (!profile) redirect("/dashboard/onboarding");
  if (profile.user.role !== "individual") redirect("/dashboard");

  const { saved } = await searchParams;
  const previewHref = publicSellerPath({
    sellerId: session.user.id,
    role: "individual",
    yardSlug: profile.yardSlug,
  });
  const siteUrl = getSiteUrl();

  return (
    <div className="mx-auto max-w-2xl">
      <Link href="/dashboard" className="text-sm font-medium text-brand hover:underline">
        ← Dashboard
      </Link>
      <h1 className="mt-4 text-2xl font-semibold text-zinc-900">Public profile</h1>
      <p className="mt-1 text-sm text-zinc-600">
        Add a <strong>profile photo</strong> and <strong>header image</strong> so buyers recognise you on your public
        page and when they open your listings. You can change these any time.
      </p>
      {saved === "1" ? (
        <p className="mt-4 rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-800">Saved.</p>
      ) : null}

      <p className="mt-6 rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm text-zinc-700">
        <span className="font-medium text-zinc-900">Preview:</span>{" "}
        <Link href={previewHref} className="break-all text-brand hover:underline" target="_blank" rel="noreferrer">
          {siteUrl}
          {previewHref}
        </Link>
      </p>

      <form action={updateIndividualProfileBrandingAction} className="mt-8 space-y-8">
        <section className="space-y-3">
          <h2 className="text-sm font-semibold text-zinc-900">Photos</h2>
          <YardBrandingFields
            initialLogoUrl={profile.yardLogoUrl}
            initialHeaderUrl={profile.yardHeaderImageUrl}
            variant="individual"
          />
        </section>

        <button
          type="submit"
          className="w-full rounded-lg bg-brand px-4 py-2.5 font-medium text-white hover:bg-brand-hover focus:outline-none focus:ring-2 focus:ring-brand focus:ring-offset-2"
        >
          Save
        </button>
      </form>
    </div>
  );
}

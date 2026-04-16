import Link from "next/link";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { notFound } from "next/navigation";
import { ClaimProfileForm } from "./ClaimProfileForm";

export const metadata = {
  title: "Claim seller profile",
};

export default async function ClaimProfilePage({
  searchParams,
}: {
  searchParams: Promise<{ sellerProfileId?: string }>;
}) {
  const sp = await searchParams;
  const sellerProfileId = (sp.sellerProfileId ?? "").trim();
  if (!sellerProfileId) notFound();

  const profile = await prisma.sellerProfile.findUnique({
    where: { id: sellerProfileId },
    select: {
      id: true,
      displayName: true,
      businessName: true,
      importedByAdmin: true,
      claimCode: true,
      user: { select: { id: true, role: true } },
    },
  });
  if (!profile || !profile.importedByAdmin || !profile.claimCode) notFound();

  const session = await auth();
  const me = session?.user?.id
    ? await prisma.user.findUnique({
        where: { id: session.user.id },
        select: { id: true, sellerProfile: { select: { id: true } } },
      })
    : null;

  return (
    <div className="mx-auto w-full max-w-xl px-4 py-10 sm:px-6">
      <h1 className="text-2xl font-semibold text-zinc-900">Claim this business profile</h1>
      <p className="mt-2 text-sm text-zinc-600">
        {profile.businessName || profile.displayName}
      </p>

      {!session?.user?.id ? (
        <div className="mt-5 rounded-xl border border-zinc-200 bg-white p-4 text-sm text-zinc-700">
          <p>You need an account before claiming this profile.</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Link
              href={`/auth/signin?callbackUrl=${encodeURIComponent(`/claim-profile?sellerProfileId=${sellerProfileId}`)}`}
              className="rounded border border-zinc-300 px-3 py-1.5 hover:bg-zinc-50"
            >
              Sign in
            </Link>
            <Link
              href={`/auth/register?callbackUrl=${encodeURIComponent(`/claim-profile?sellerProfileId=${sellerProfileId}`)}`}
              className="rounded bg-zinc-900 px-3 py-1.5 text-white hover:bg-zinc-800"
            >
              Create account
            </Link>
          </div>
        </div>
      ) : me?.sellerProfile ? (
        <div className="mt-5 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          This account already has a seller profile. Use a separate account to claim another imported business.
        </div>
      ) : (
        <ClaimProfileForm
          sellerProfileId={profile.id}
          profileLabel={profile.businessName || profile.displayName}
        />
      )}
    </div>
  );
}


import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { auth } from "@/auth";
import { isCarbonAdmin } from "@/lib/admin";
import { prisma } from "@/lib/db";
import { adminUpdateYardDetailsAction } from "@/lib/actions/admin-overview";

type Props = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ saved?: string; error?: string }>;
};

export default async function AdminYardEditPage({ params, searchParams }: Props) {
  const session = await auth();
  if (!session?.user?.id) redirect("/auth/signin");
  if (!isCarbonAdmin(session)) {
    return (
      <div className="rounded-xl border border-amber-200 bg-amber-50 p-6 text-sm text-amber-950">
        You don&apos;t have access. Add your email to{" "}
        <code className="rounded bg-amber-100 px-1">ADMIN_EMAILS</code>.
      </div>
    );
  }

  const { id } = await params;
  const { saved, error } = await searchParams;

  const yard = await prisma.sellerProfile.findUnique({
    where: { id },
    select: {
      id: true,
      userId: true,
      displayName: true,
      businessName: true,
      postcode: true,
      yardSlug: true,
      yardTagline: true,
      yardContactEmail: true,
      yardContactPhone: true,
      yardWebsiteUrl: true,
      vatRegistered: true,
      salvoCodeMember: true,
      isRegisteredCharity: true,
      charityNumber: true,
      user: { select: { role: true, email: true } },
    },
  });

  if (!yard || yard.user.role !== "reclamation_yard") notFound();

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-900">Edit reclamation yard</h1>
          <p className="mt-1 max-w-2xl text-sm text-zinc-600">
            Update core public yard details, location, and trust/compliance flags for this seller profile.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/dashboard/admin#yards" className="rounded-lg border border-zinc-300 px-3 py-1.5 text-sm hover:bg-zinc-50">
            Back to admin yards
          </Link>
          {yard.yardSlug ? (
            <Link
              href={`/yards/${yard.yardSlug}`}
              target="_blank"
              className="rounded-lg border border-zinc-300 px-3 py-1.5 text-sm hover:bg-zinc-50"
            >
              View yard page
            </Link>
          ) : (
            <Link
              href={`/sellers/${yard.userId}`}
              target="_blank"
              className="rounded-lg border border-zinc-300 px-3 py-1.5 text-sm hover:bg-zinc-50"
            >
              View seller page
            </Link>
          )}
        </div>
      </div>

      {saved === "1" ? (
        <p className="mb-4 rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-900">
          Yard details saved.
        </p>
      ) : null}
      {error === "required" ? (
        <p className="mb-4 rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-800">
          Display name and postcode are required.
        </p>
      ) : null}
      {error === "postcode" ? (
        <p className="mb-4 rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-800">
          Enter a valid full UK postcode (for example, SW1A 1AA).
        </p>
      ) : null}
      {error === "email" ? (
        <p className="mb-4 rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-800">
          Enter a valid contact email or leave it blank.
        </p>
      ) : null}
      {error === "slug" ? (
        <p className="mb-4 rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-800">
          Yard slug is invalid or already in use.
        </p>
      ) : null}
      {error === "charity_number" ? (
        <p className="mb-4 rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-800">
          Enter a valid charity number when registered charity is enabled.
        </p>
      ) : null}

      <form action={adminUpdateYardDetailsAction} className="grid max-w-4xl gap-3 rounded-xl border border-zinc-200 bg-white p-4">
        <input type="hidden" name="sellerProfileId" value={yard.id} />

        <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-3 text-xs text-zinc-600">
          <p>User role: <span className="font-semibold text-zinc-900">{yard.user.role}</span></p>
          <p>User email: <span className="font-mono text-zinc-800">{yard.user.email || yard.userId}</span></p>
          <p>User ID: <span className="font-mono text-zinc-800">{yard.userId}</span></p>
        </div>

        <div className="grid gap-3 md:grid-cols-2">
          <label className="text-sm">
            <span className="mb-1 block text-xs font-medium text-zinc-700">Display name</span>
            <input
              name="displayName"
              required
              defaultValue={yard.displayName}
              className="w-full rounded border border-zinc-300 px-3 py-2 text-sm"
            />
          </label>
          <label className="text-sm">
            <span className="mb-1 block text-xs font-medium text-zinc-700">Business name</span>
            <input
              name="businessName"
              defaultValue={yard.businessName ?? ""}
              className="w-full rounded border border-zinc-300 px-3 py-2 text-sm"
            />
          </label>
        </div>

        <div className="grid gap-3 md:grid-cols-2">
          <label className="text-sm">
            <span className="mb-1 block text-xs font-medium text-zinc-700">Postcode</span>
            <input
              name="postcode"
              required
              defaultValue={yard.postcode}
              className="w-full rounded border border-zinc-300 px-3 py-2 text-sm"
            />
          </label>
          <label className="text-sm">
            <span className="mb-1 block text-xs font-medium text-zinc-700">Yard slug</span>
            <input
              name="yardSlug"
              required
              defaultValue={yard.yardSlug ?? ""}
              className="w-full rounded border border-zinc-300 px-3 py-2 text-sm font-mono"
            />
          </label>
        </div>

        <label className="text-sm">
          <span className="mb-1 block text-xs font-medium text-zinc-700">Tagline</span>
          <input
            name="yardTagline"
            defaultValue={yard.yardTagline ?? ""}
            className="w-full rounded border border-zinc-300 px-3 py-2 text-sm"
          />
        </label>

        <div className="grid gap-3 md:grid-cols-3">
          <label className="text-sm">
            <span className="mb-1 block text-xs font-medium text-zinc-700">Contact email</span>
            <input
              name="yardContactEmail"
              type="email"
              defaultValue={yard.yardContactEmail ?? ""}
              className="w-full rounded border border-zinc-300 px-3 py-2 text-sm"
            />
          </label>
          <label className="text-sm">
            <span className="mb-1 block text-xs font-medium text-zinc-700">Contact phone</span>
            <input
              name="yardContactPhone"
              defaultValue={yard.yardContactPhone ?? ""}
              className="w-full rounded border border-zinc-300 px-3 py-2 text-sm"
            />
          </label>
          <label className="text-sm">
            <span className="mb-1 block text-xs font-medium text-zinc-700">Website</span>
            <input
              name="yardWebsiteUrl"
              defaultValue={yard.yardWebsiteUrl ?? ""}
              className="w-full rounded border border-zinc-300 px-3 py-2 text-sm"
            />
          </label>
        </div>

        <div className="grid gap-3 md:grid-cols-3">
          <label className="inline-flex items-center gap-2 rounded border border-zinc-200 px-3 py-2 text-sm">
            <input type="checkbox" name="vatRegistered" value="yes" defaultChecked={yard.vatRegistered} />
            VAT registered
          </label>
          <label className="inline-flex items-center gap-2 rounded border border-zinc-200 px-3 py-2 text-sm">
            <input type="checkbox" name="salvoCodeMember" value="yes" defaultChecked={yard.salvoCodeMember} />
            Salvo Code Member
          </label>
          <label className="inline-flex items-center gap-2 rounded border border-zinc-200 px-3 py-2 text-sm">
            <input type="checkbox" name="isRegisteredCharity" value="yes" defaultChecked={yard.isRegisteredCharity} />
            Registered charity
          </label>
        </div>

        <label className="text-sm">
          <span className="mb-1 block text-xs font-medium text-zinc-700">Charity number</span>
          <input
            name="charityNumber"
            defaultValue={yard.charityNumber ?? ""}
            className="w-full rounded border border-zinc-300 px-3 py-2 text-sm"
          />
        </label>

        <div className="flex flex-wrap gap-2">
          <button type="submit" className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-semibold text-white hover:bg-zinc-800">
            Save yard details
          </button>
          <Link href="/dashboard/admin#yards" className="rounded-lg border border-zinc-300 px-4 py-2 text-sm hover:bg-zinc-50">
            Cancel
          </Link>
        </div>
      </form>
    </div>
  );
}

import Link from "next/link";
import { completePasswordResetAction } from "@/lib/actions/password-reset";
import { safeInternalPath } from "@/lib/safe-internal-path";

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{
    token?: string;
    error?: string;
    callbackUrl?: string;
  }>;
}) {
  const { token, error, callbackUrl: rawCb } = await searchParams;
  const callbackUrl = safeInternalPath(rawCb) ?? "";
  const signInHref =
    callbackUrl !== ""
      ? `/auth/signin?callbackUrl=${encodeURIComponent(callbackUrl)}`
      : "/auth/signin";

  if (!token) {
    return (
      <div className="mx-auto w-full max-w-md rounded-xl border border-zinc-200 bg-white p-8 shadow-sm">
        <h1 className="mb-2 text-2xl font-semibold text-zinc-900">Reset password</h1>
        <p className="mb-4 text-sm text-rose-800">This reset link is missing a token. Request a new link from the forgot password page.</p>
        <Link href="/auth/forgot-password" className="text-sm font-medium text-brand hover:underline">
          Forgot password
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-md rounded-xl border border-zinc-200 bg-white p-8 shadow-sm">
      <h1 className="mb-2 text-2xl font-semibold text-zinc-900">Choose a new password</h1>
      <p className="mb-6 text-sm text-zinc-600">Use at least 8 characters.</p>

      {error === "weak_password" ? (
        <p className="mb-4 rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-800">Password must be at least 8 characters.</p>
      ) : null}
      {error === "mismatch" ? (
        <p className="mb-4 rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-800">Passwords do not match.</p>
      ) : null}
      {error === "invalid_or_expired" || error === "missing_token" ? (
        <p className="mb-4 rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-800">
          This reset link is invalid or has expired. Request a new one.
        </p>
      ) : null}

      <form action={completePasswordResetAction} className="space-y-4">
        <input type="hidden" name="token" value={token} />
        {callbackUrl ? <input type="hidden" name="callbackUrl" value={callbackUrl} /> : null}
        <div>
          <label htmlFor="password" className="mb-1 block text-sm font-medium text-zinc-700">
            New password
          </label>
          <input
            id="password"
            name="password"
            type="password"
            autoComplete="new-password"
            required
            minLength={8}
            className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-zinc-900 focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
          />
        </div>
        <div>
          <label htmlFor="confirmPassword" className="mb-1 block text-sm font-medium text-zinc-700">
            Confirm password
          </label>
          <input
            id="confirmPassword"
            name="confirmPassword"
            type="password"
            autoComplete="new-password"
            required
            minLength={8}
            className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-zinc-900 focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
          />
        </div>
        <button
          type="submit"
          className="w-full rounded-lg bg-brand px-4 py-2.5 font-medium text-white hover:bg-brand-hover focus:outline-none focus:ring-2 focus:ring-brand focus:ring-offset-2"
        >
          Update password
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-zinc-600">
        <Link href={signInHref} className="font-medium text-brand hover:underline">
          Back to sign in
        </Link>
      </p>
    </div>
  );
}

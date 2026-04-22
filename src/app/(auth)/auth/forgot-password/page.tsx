import Link from "next/link";
import { requestPasswordResetAction } from "@/lib/actions/password-reset";
import { safeInternalPath } from "@/lib/safe-internal-path";

export default async function ForgotPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{
    sent?: string;
    error?: string;
    callbackUrl?: string;
  }>;
}) {
  const { sent, error, callbackUrl: rawCb } = await searchParams;
  const callbackUrl = safeInternalPath(rawCb) ?? "";
  const signInHref =
    callbackUrl !== ""
      ? `/auth/signin?callbackUrl=${encodeURIComponent(callbackUrl)}`
      : "/auth/signin";

  return (
    <div className="mx-auto w-full max-w-md rounded-xl border border-zinc-200 bg-white p-8 shadow-sm">
      <h1 className="mb-2 text-2xl font-semibold text-zinc-900">Forgot password</h1>
      <p className="mb-6 text-sm text-zinc-600">
        Enter the email you used to register. If an account exists, we will send a reset link (when outbound email is
        configured).
      </p>

      {sent === "1" ? (
        <p className="mb-4 rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-900">
          If an account exists for that email, we have sent reset instructions. Check your inbox and spam folder.
        </p>
      ) : null}

      {error === "invalid_email" ? (
        <p className="mb-4 rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-800">Enter a valid email address.</p>
      ) : null}
      {error === "smtp" ? (
        <p className="mb-4 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-950">
          Password reset email could not be sent because SMTP is not configured on this deployment. Ask an
          administrator to set <code className="rounded bg-amber-100 px-1">SMTP_USER</code> and{" "}
          <code className="rounded bg-amber-100 px-1">SMTP_PASS</code>.
        </p>
      ) : null}

      <form action={requestPasswordResetAction} className="space-y-4">
        {callbackUrl ? <input type="hidden" name="callbackUrl" value={callbackUrl} /> : null}
        <div>
          <label htmlFor="email" className="mb-1 block text-sm font-medium text-zinc-700">
            Email
          </label>
          <input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            required
            className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-zinc-900 focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
          />
        </div>
        <button
          type="submit"
          className="w-full rounded-lg bg-brand px-4 py-2.5 font-medium text-white hover:bg-brand-hover focus:outline-none focus:ring-2 focus:ring-brand focus:ring-offset-2"
        >
          Send reset link
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

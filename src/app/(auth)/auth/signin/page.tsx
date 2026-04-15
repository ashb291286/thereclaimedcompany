import Link from "next/link";
import { signIn } from "@/auth";
import { redirect } from "next/navigation";
import { safeInternalPath } from "@/lib/safe-internal-path";

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; callbackUrl?: string }>;
}) {
  const { error, callbackUrl: rawCallback } = await searchParams;
  const callbackUrl = safeInternalPath(rawCallback) ?? "";
  const registerHref =
    callbackUrl !== "" ? `/auth/register?callbackUrl=${encodeURIComponent(callbackUrl)}` : "/auth/register";
  return (
    <div className="mx-auto w-full max-w-md rounded-xl border border-zinc-200 bg-white p-8 shadow-sm">
      <h1 className="text-2xl font-semibold text-zinc-900 mb-6">Sign in</h1>
      {error && (
        <p className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      )}
      <form
        action={async (formData) => {
          "use server";
          try {
            const cb = safeInternalPath(String(formData.get("callbackUrl") ?? ""));
            await signIn("credentials", {
              email: formData.get("email") as string,
              password: formData.get("password") as string,
              redirectTo: cb ?? "/",
            });
          } catch {
            const q = new URLSearchParams({ error: "Invalid email or password" });
            if (callbackUrl) q.set("callbackUrl", callbackUrl);
            redirect(`/auth/signin?${q.toString()}`);
          }
        }}
        className="space-y-4"
      >
        {callbackUrl ? <input type="hidden" name="callbackUrl" value={callbackUrl} /> : null}
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-zinc-700 mb-1">
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
        <div>
          <label htmlFor="password" className="block text-sm font-medium text-zinc-700 mb-1">
            Password
          </label>
          <input
            id="password"
            name="password"
            type="password"
            autoComplete="current-password"
            required
            className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-zinc-900 focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
          />
        </div>
        <button
          type="submit"
          className="w-full rounded-lg bg-brand px-4 py-2.5 font-medium text-white hover:bg-brand-hover focus:outline-none focus:ring-2 focus:ring-brand focus:ring-offset-2"
        >
          Sign in
        </button>
      </form>
      <p className="mt-6 text-center text-sm text-zinc-600">
        Don&apos;t have an account?{" "}
        <Link href={registerHref} className="font-medium text-brand hover:underline">
          Sign up
        </Link>
      </p>
    </div>
  );
}

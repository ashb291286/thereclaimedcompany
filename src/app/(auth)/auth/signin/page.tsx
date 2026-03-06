import Link from "next/link";
import { signIn } from "@/auth";
import { redirect } from "next/navigation";

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  return (
    <div className="bg-white rounded-xl shadow-sm border border-zinc-200 p-8">
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
            await signIn("credentials", {
              email: formData.get("email") as string,
              password: formData.get("password") as string,
              redirectTo: "/",
            });
          } catch {
            redirect("/auth/signin?error=Invalid+email+or+password");
          }
        }}
        className="space-y-4"
      >
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
            className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-zinc-900 focus:border-amber-600 focus:outline-none focus:ring-1 focus:ring-amber-600"
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
            className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-zinc-900 focus:border-amber-600 focus:outline-none focus:ring-1 focus:ring-amber-600"
          />
        </div>
        <button
          type="submit"
          className="w-full rounded-lg bg-amber-600 px-4 py-2.5 font-medium text-white hover:bg-amber-700 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-2"
        >
          Sign in
        </button>
      </form>
      <p className="mt-6 text-center text-sm text-zinc-600">
        Don&apos;t have an account?{" "}
        <Link href="/auth/register" className="font-medium text-amber-600 hover:underline">
          Sign up
        </Link>
      </p>
    </div>
  );
}

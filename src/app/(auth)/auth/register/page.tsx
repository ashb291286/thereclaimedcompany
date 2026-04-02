import Link from "next/link";
import { register } from "@/lib/actions/auth";
import { RegisterForm } from "./RegisterForm";

export default function RegisterPage() {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-zinc-200 p-8">
      <p className="text-xs font-semibold uppercase tracking-wider text-brand">Welcome to The Reclaimed Company</p>
      <h1 className="mt-2 text-2xl font-semibold text-zinc-900 mb-2">
        Join the reclaimed marketplace
      </h1>
      <p className="mb-6 text-sm text-zinc-600">
        Buy reclaimed materials or start selling to buyers and local reclamation yards.
      </p>
      <RegisterForm register={register} />
      <p className="mt-6 text-center text-sm text-zinc-600">
        Already have an account?{" "}
        <Link href="/auth/signin" className="font-medium text-brand hover:underline">
          Sign in
        </Link>
      </p>
    </div>
  );
}

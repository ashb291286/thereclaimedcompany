import Link from "next/link";
import { register } from "@/lib/actions/auth";
import { RegisterForm } from "./RegisterForm";

export default function RegisterPage() {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-zinc-200 p-8">
      <h1 className="text-2xl font-semibold text-zinc-900 mb-6">
        Create an account
      </h1>
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

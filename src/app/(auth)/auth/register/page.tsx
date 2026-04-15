import { register } from "@/lib/actions/auth";
import { safeInternalPath } from "@/lib/safe-internal-path";
import { RegisterView } from "./RegisterView";

export default async function RegisterPage({
  searchParams,
}: {
  searchParams: Promise<{ callbackUrl?: string }>;
}) {
  const sp = await searchParams;
  const callbackUrl = safeInternalPath(sp.callbackUrl) ?? "";
  return <RegisterView register={register} callbackUrl={callbackUrl} />;
}

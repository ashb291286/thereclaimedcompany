import { register } from "@/lib/actions/auth";
import { safeInternalPath } from "@/lib/safe-internal-path";
import { RegisterView } from "./RegisterView";

export default async function RegisterPage({
  searchParams,
}: {
  searchParams: Promise<{ callbackUrl?: string; sellerFlow?: string }>;
}) {
  const sp = await searchParams;
  const callbackUrl = safeInternalPath(sp.callbackUrl) ?? "";
  const sellerFlow =
    sp.sellerFlow === "yard" || sp.sellerFlow === "dealer" ? sp.sellerFlow : null;
  return <RegisterView register={register} callbackUrl={callbackUrl} sellerFlow={sellerFlow} />;
}

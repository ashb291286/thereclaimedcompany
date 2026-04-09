import { register } from "@/lib/actions/auth";
import { RegisterView } from "./RegisterView";

export default function RegisterPage() {
  return <RegisterView register={register} />;
}

import { redirect } from "next/navigation";

/** @deprecated Use /prop-yard/sets and set builder */
export default function PropYardBasketRedirectPage() {
  redirect("/prop-yard/sets");
}

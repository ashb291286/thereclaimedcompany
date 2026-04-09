import { auth } from "@/auth";
import { MarketingShell } from "./MarketingShell";

export default async function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  return <MarketingShell session={session}>{children}</MarketingShell>;
}

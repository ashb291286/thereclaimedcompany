import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
export default async function NewPropOnlyPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/auth/signin");

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { role: true, sellerProfile: { select: { id: true } } },
  });
  const allowed = user?.role === "reclamation_yard" || !!user?.sellerProfile;
  if (!user || !allowed) {
    redirect("/dashboard?error=" + encodeURIComponent("Seller profile required to add hire-only props."));
  }
  redirect("/dashboard/prop-yard/wizard?mode=hire_only");
}

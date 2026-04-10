import type { UserRole } from "@/generated/prisma/client";

/** Public URL path for seller/yard (no trailing slash). */
export function publicSellerPath(input: {
  sellerId: string;
  role: UserRole | null;
  yardSlug: string | null | undefined;
}): string {
  if (input.role === "reclamation_yard" && input.yardSlug) {
    return `/yards/${input.yardSlug}`;
  }
  return `/sellers/${input.sellerId}`;
}

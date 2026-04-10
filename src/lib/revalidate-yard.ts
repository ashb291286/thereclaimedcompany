import { revalidatePath } from "next/cache";

/** Invalidate public yard profile (canonical + legacy path cached separately). */
export function revalidateYardPublicPaths(yardSlug: string | null | undefined): void {
  const s = yardSlug?.trim();
  if (!s) return;
  revalidatePath(`/yards/${s}`);
  revalidatePath(`/reclamation-yard/${s}`);
}

import type { Condition } from "@/generated/prisma/client";

export const CONDITION_LABELS: Record<Condition, string> = {
  like_new: "Like new",
  used: "Used",
  worn: "Worn",
  parts_not_working: "Parts / not working",
  refurbished: "Refurbished",
  upcycled: "Upcycled",
  collectable: "Collectable",
};

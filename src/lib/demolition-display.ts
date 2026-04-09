export function formatDemolitionPricePence(pence: number | null | undefined): string {
  if (pence == null) return "—";
  return `£${(pence / 100).toFixed(2)}`;
}

export function maskEmailForOrganizer(email: string | null | undefined): string {
  if (!email) return "Member";
  const [local, domain] = email.split("@");
  if (!domain) return "Member";
  const vis = local.slice(0, 3);
  return `${vis}…@${domain}`;
}

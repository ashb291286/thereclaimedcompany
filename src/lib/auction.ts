/** Smallest allowed next bid (pence) after the current high bid. */
export function minimumNextBidPence(startingPence: number, topBidPence: number | null): number {
  if (topBidPence == null) return startingPence;
  const step = Math.max(50, Math.round(startingPence * 0.05));
  return topBidPence + step;
}

/** Fields copied onto Order at checkout so buyer totals stay stable if listing edits. */
export function purchaseCarbonSnapshotFromListing(listing: {
  carbonSavedKg: number | null;
  carbonWasteDivertedKg: number | null;
}): {
  purchaseCarbonSavedKg: number | null;
  purchaseWasteDivertedKg: number | null;
} {
  return {
    purchaseCarbonSavedKg: listing.carbonSavedKg ?? null,
    purchaseWasteDivertedKg: listing.carbonWasteDivertedKg ?? null,
  };
}

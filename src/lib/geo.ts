/** Earth radius in miles */
const R_MI = 3959;

export function haversineMiles(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R_MI * c;
}

/** Rough bounding box for pre-filtering before Haversine (degrees). */
export function latLngBoundingBoxMiles(lat: number, lng: number, miles: number) {
  const latDelta = miles / 69;
  const cosLat = Math.cos((lat * Math.PI) / 180);
  const lngDelta = cosLat > 0.01 ? miles / (69 * cosLat) : miles / 69;
  return {
    minLat: lat - latDelta,
    maxLat: lat + latDelta,
    minLng: lng - lngDelta,
    maxLng: lng + lngDelta,
  };
}

export function formatMiles(miles: number): string {
  if (miles < 10) return `${miles.toFixed(1)} mi`;
  return `${Math.round(miles)} mi`;
}

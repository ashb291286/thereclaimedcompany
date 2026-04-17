/**
 * WordPress often returns 403 for direct browser loads of /wp-content/uploads/* from another
 * app origin (hotlink / referrer rules). Rewriting those URLs to our same-origin proxy avoids that.
 */
const WP_UPLOADS =
  /^https?:\/\/(www\.)?thereclaimedcompany\.com(\/wp-content\/uploads\/[^?#]+)$/i;

export function proxiedListingImageSrc(url: string): string {
  const t = url.trim();
  const m = t.match(WP_UPLOADS);
  if (!m) return t;
  const path = m[2];
  if (path.includes("..") || path.includes("\\")) return t;
  return `/api/media/wordpress?path=${encodeURIComponent(path)}`;
}

export function withProxiedListingImages<L extends { images: string[] }>(listing: L): L {
  if (!listing.images.length) return listing;
  return { ...listing, images: listing.images.map((u) => proxiedListingImageSrc(u)) };
}

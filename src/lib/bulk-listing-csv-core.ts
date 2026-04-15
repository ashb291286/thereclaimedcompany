import { prisma } from "@/lib/db";
import { lookupUkPostcode } from "@/lib/postcode-uk";
import { syncListingLocalYardAlerts } from "@/lib/listing-local-yard-alerts";
import { syncListingToWooCommerce } from "@/lib/listing-woocommerce-sync";
import { afterMarketplaceListingPersisted } from "@/lib/yard-listing-hooks";
import {
  ListingPricingMode,
  ListingStatus,
  Prisma,
  type Condition,
} from "@/generated/prisma/client";
import { computeListingCarbonSnapshot } from "@/lib/carbon/listing";
import { slugifyCategoryName } from "@/lib/category-suggest";

function displayNameFromCategorySlug(slug: string): string {
  const n = slug
    .split("-")
    .filter(Boolean)
    .map((w) => (w ? w.charAt(0).toUpperCase() + w.slice(1).toLowerCase() : ""))
    .join(" ")
    .trim();
  return (n || slug).slice(0, 120);
}

/** Resolve category id; create top-level category when slug is new (mutates cache). */
export async function resolveOrCreateBulkCategoryId(
  slugRaw: string,
  categoryNameOverride: string | null,
  cache: Map<string, string>
): Promise<{ ok: true; id: string } | { ok: false; message: string }> {
  const canonical = slugifyCategoryName(slugRaw);
  if (!canonical) {
    return {
      ok: false,
      message: "category_slug is not valid — use letters, numbers, and hyphens (e.g. reclaimed-doors).",
    };
  }

  const hit = cache.get(canonical);
  if (hit) return { ok: true, id: hit };

  const name =
    (categoryNameOverride?.trim() && categoryNameOverride.trim().slice(0, 120)) ||
    displayNameFromCategorySlug(canonical);

  const row = await prisma.category.upsert({
    where: { slug: canonical },
    create: { slug: canonical, name: name || canonical },
    update: {},
    select: { id: true },
  });

  cache.set(canonical, row.id);
  return { ok: true, id: row.id };
}

export const BULK_CSV_MAX_ROWS = 150;
export const BULK_CSV_MAX_FILE_BYTES = 2 * 1024 * 1024;

export const BULK_CSV_VALID_CONDITIONS: Condition[] = [
  "like_new",
  "used",
  "worn",
  "parts_not_working",
  "refurbished",
  "upcycled",
  "collectable",
];

export function bulkCsvNormalizeHeader(raw: string): string {
  return raw
    .replace(/^\uFEFF/, "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "_");
}

export function bulkCsvParseBoolLoose(raw: string | undefined): boolean {
  const v = (raw ?? "").trim().toLowerCase();
  return v === "true" || v === "1" || v === "yes" || v === "y";
}

export function bulkCsvSplitImageUrls(raw: string): string[] {
  return raw
    .split(/[|;]+/g)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

export type BulkImportRowSeller = {
  sellerId: string;
  sellerRole: "individual" | "reclamation_yard" | null;
  defaultPostcode: string;
};

export type BulkCsvSellerResolveResult =
  | { ok: true; seller: BulkImportRowSeller }
  | { ok: false; message: string };

export type BulkListingCarbonSnap = Awaited<ReturnType<typeof computeListingCarbonSnapshot>>;

export async function runBulkListingCsvImport(options: {
  matrix: string[][];
  headerCells: string[];
  /** Mutable slug → id; seeded with existing categories; new slugs are inserted and cached. */
  categoryIdBySlugCache: Map<string, string>;
  carbon: BulkListingCarbonSnap;
  resolveSeller: (
    row: Record<string, string>,
    lineNo: number
  ) => Promise<BulkCsvSellerResolveResult>;
}): Promise<{ created: number; errors: { line: number; message: string }[] }> {
  const { matrix, headerCells, categoryIdBySlugCache, carbon, resolveSeller } = options;
  const errors: { line: number; message: string }[] = [];
  let created = 0;

  for (let r = 1; r < matrix.length; r++) {
    const lineNo = r + 1;
    const cells = matrix[r];
    if (!cells.some((c) => c.trim())) continue;

    const row: Record<string, string> = {};
    for (let c = 0; c < headerCells.length; c++) {
      row[headerCells[c]] = (cells[c] ?? "").trim();
    }

    const title = row.title ?? "";
    const description = row.description ?? "";
    const condition = (row.condition ?? "") as Condition;
    const categorySlug = (row.category_slug ?? "").trim();
    const categoryNameOverride = (row.category_name ?? "").trim() || null;
    const priceRaw = (row.price_gbp ?? "").trim();
    const imageRaw = row.image_urls ?? "";
    const postcodeInput = (row.postcode ?? "").trim();
    const sellerRefRaw = (row.seller_reference ?? "").trim();
    const pricingModeRaw = (row.pricing_mode ?? "LOT").trim().toUpperCase();
    const unitsRaw = (row.units_available ?? "").trim();
    const freeToCollector = bulkCsvParseBoolLoose(row.free_to_collector);
    const visibleRaw = row.visible_on_marketplace;

    if (!title || !description) {
      errors.push({ line: lineNo, message: "Title and description are required." });
      continue;
    }
    if (!BULK_CSV_VALID_CONDITIONS.includes(condition)) {
      errors.push({
        line: lineNo,
        message: `Invalid condition "${row.condition}". Use one of: ${BULK_CSV_VALID_CONDITIONS.join(", ")}.`,
      });
      continue;
    }
    if (!categorySlug) {
      errors.push({ line: lineNo, message: "category_slug is required." });
      continue;
    }

    const catRes = await resolveOrCreateBulkCategoryId(
      categorySlug,
      categoryNameOverride,
      categoryIdBySlugCache
    );
    if (!catRes.ok) {
      errors.push({ line: lineNo, message: catRes.message });
      continue;
    }
    const resolvedCategoryId = catRes.id;

    let pricePence = Math.round(parseFloat(priceRaw) * 100);
    if (freeToCollector) {
      pricePence = 0;
    } else if (Number.isNaN(pricePence) || pricePence < 0) {
      errors.push({ line: lineNo, message: "price_gbp must be a valid number (or use free_to_collector)." });
      continue;
    }

    const images = bulkCsvSplitImageUrls(imageRaw);
    if (images.length === 0) {
      errors.push({ line: lineNo, message: "image_urls must include at least one URL (use | between URLs)." });
      continue;
    }
    let invalidImage = false;
    for (const url of images) {
      if (!/^https?:\/\//i.test(url)) {
        errors.push({
          line: lineNo,
          message: `Invalid image URL (must start with http/https): ${url.slice(0, 80)}`,
        });
        invalidImage = true;
        break;
      }
    }
    if (invalidImage) continue;

    let pricingMode: ListingPricingMode = ListingPricingMode.LOT;
    let unitsAvailable: number | null = null;
    if (freeToCollector) {
      pricingMode = ListingPricingMode.LOT;
      unitsAvailable = null;
    } else if (pricingModeRaw === "PER_UNIT") {
      pricingMode = ListingPricingMode.PER_UNIT;
      const u = parseInt(unitsRaw, 10);
      if (!Number.isFinite(u) || u < 1) {
        errors.push({ line: lineNo, message: "For pricing_mode PER_UNIT, units_available must be a whole number ≥ 1." });
        continue;
      }
      unitsAvailable = u;
    } else if (pricingModeRaw !== "LOT" && pricingModeRaw !== "") {
      errors.push({ line: lineNo, message: 'pricing_mode must be LOT or PER_UNIT (or leave blank for LOT).' });
      continue;
    }

    const sellerRes = await resolveSeller(row, lineNo);
    if (!sellerRes.ok) {
      errors.push({ line: lineNo, message: sellerRes.message });
      continue;
    }
    const seller = sellerRes.seller;

    const postcodeForLookup = postcodeInput || seller.defaultPostcode;
    const resolvedPostcode = await lookupUkPostcode(postcodeForLookup);
    if (!resolvedPostcode) {
      errors.push({
        line: lineNo,
        message: `Invalid UK postcode "${postcodeForLookup || "(empty)"}". Use a full outward + inward code.`,
      });
      continue;
    }

    const sellerReference =
      sellerRefRaw.length === 0 ? null : sellerRefRaw.length > 120 ? sellerRefRaw.slice(0, 120) : sellerRefRaw;

    const isYard = seller.sellerRole === "reclamation_yard";
    const visibleOnMarketplace =
      isYard && !freeToCollector
        ? visibleRaw === undefined || visibleRaw === ""
          ? true
          : bulkCsvParseBoolLoose(visibleRaw)
        : true;

    try {
      const createdRow = await prisma.listing.create({
        data: {
          sellerId: seller.sellerId,
          title: title.trim(),
          sellerReference,
          description: description.trim(),
          price: pricePence,
          condition,
          categoryId: resolvedCategoryId,
          pricingMode,
          unitsAvailable,
          postcode: resolvedPostcode.postcode,
          lat: resolvedPostcode.lat,
          lng: resolvedPostcode.lng,
          adminDistrict: resolvedPostcode.adminDistrict,
          region: resolvedPostcode.region,
          postcodeLocality: resolvedPostcode.postcodeLocality,
          images,
          listingKind: "sell",
          freeToCollector,
          notifyLocalYards: false,
          visibleOnMarketplace,
          offersDelivery: false,
          deliveryNotes: null,
          deliveryCostPence: null,
          deliveryOptions: Prisma.DbNull,
          auctionEndsAt: null,
          auctionReservePence: null,
          materialType: carbon.materialType,
          materialQuantity: carbon.materialQuantity,
          materialUnit: carbon.materialUnit,
          distanceSavedKm: carbon.distanceSavedKm,
          carbonSavedKg: carbon.carbonSavedKg,
          carbonWasteDivertedKg: carbon.carbonWasteDivertedKg,
          carbonImpactJson:
            carbon.carbonImpactJson === null
              ? Prisma.DbNull
              : (carbon.carbonImpactJson as Prisma.InputJsonValue),
          status: ListingStatus.draft,
        },
      });

      await syncListingLocalYardAlerts(createdRow.id);
      await syncListingToWooCommerce(createdRow.id);
      await afterMarketplaceListingPersisted(seller.sellerId, createdRow.id, { wasLive: false });
      created++;
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Database error";
      errors.push({ line: lineNo, message: msg });
    }
  }

  return { created, errors };
}

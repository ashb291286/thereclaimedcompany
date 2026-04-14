"use server";

import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { parseCsvToMatrix } from "@/lib/csv-parse";
import { lookupUkPostcode } from "@/lib/postcode-uk";
import { computeListingCarbonSnapshot } from "@/lib/carbon/listing";
import { syncListingLocalYardAlerts } from "@/lib/listing-local-yard-alerts";
import { syncListingToWooCommerce } from "@/lib/listing-woocommerce-sync";
import { afterMarketplaceListingPersisted } from "@/lib/yard-listing-hooks";
import {
  ListingPricingMode,
  ListingStatus,
  Prisma,
  type Condition,
} from "@/generated/prisma/client";

const MAX_ROWS = 150;
const MAX_FILE_BYTES = 2 * 1024 * 1024;

const VALID_CONDITIONS: Condition[] = [
  "like_new",
  "used",
  "worn",
  "parts_not_working",
  "refurbished",
  "upcycled",
  "collectable",
];

function normalizeHeader(raw: string): string {
  return raw
    .replace(/^\uFEFF/, "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "_");
}

function parseBoolLoose(raw: string | undefined): boolean {
  const v = (raw ?? "").trim().toLowerCase();
  return v === "true" || v === "1" || v === "yes" || v === "y";
}

function splitImageUrls(raw: string): string[] {
  return raw
    .split(/[|;]+/g)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

export type BulkCsvImportState =
  | { status: "idle" }
  | { status: "error"; message: string }
  | {
      status: "success";
      created: number;
      errors: { line: number; message: string }[];
    };

export async function bulkImportListingsCsvAction(
  _prev: BulkCsvImportState,
  formData: FormData
): Promise<BulkCsvImportState> {
  const session = await auth();
  if (!session?.user?.id) {
    return { status: "error", message: "You need to be signed in." };
  }

  const sellerProfile = await prisma.sellerProfile.findUnique({
    where: { userId: session.user.id },
    select: { postcode: true },
  });
  if (!sellerProfile) {
    return { status: "error", message: "Complete seller onboarding before bulk upload." };
  }

  const dbUser = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { role: true },
  });

  const file = formData.get("csv");
  if (!(file instanceof File) || file.size === 0) {
    return { status: "error", message: "Choose a non-empty CSV file." };
  }
  if (file.size > MAX_FILE_BYTES) {
    return { status: "error", message: `File is too large (max ${MAX_FILE_BYTES / 1024 / 1024} MB).` };
  }

  let text: string;
  try {
    text = await file.text();
  } catch {
    return { status: "error", message: "Could not read the uploaded file." };
  }

  const matrix = parseCsvToMatrix(text);
  if (matrix.length < 2) {
    return { status: "error", message: "CSV needs a header row and at least one data row." };
  }

  const headerCells = matrix[0].map(normalizeHeader);
  const required = ["title", "description", "condition", "category_slug", "price_gbp", "image_urls"];
  for (const col of required) {
    if (!headerCells.includes(col)) {
      return {
        status: "error",
        message: `Missing required column "${col.replace(/_/g, " ")}". Download the template for the correct headers.`,
      };
    }
  }

  const carbon = await computeListingCarbonSnapshot({
    materialType: null,
    materialQuantity: null,
    materialUnit: null,
    distanceSavedKm: null,
  });

  const categoriesBySlug = new Map(
    (await prisma.category.findMany({ select: { id: true, slug: true } })).map((c) => [c.slug, c.id])
  );

  const errors: { line: number; message: string }[] = [];
  let created = 0;
  const dataRowCount = matrix.length - 1;
  if (dataRowCount > MAX_ROWS) {
    return { status: "error", message: `Too many rows (max ${MAX_ROWS} data rows per upload).` };
  }

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
    const priceRaw = (row.price_gbp ?? "").trim();
    const imageRaw = row.image_urls ?? "";
    const postcodeInput = (row.postcode ?? "").trim();
    const sellerRefRaw = (row.seller_reference ?? "").trim();
    const pricingModeRaw = (row.pricing_mode ?? "LOT").trim().toUpperCase();
    const unitsRaw = (row.units_available ?? "").trim();
    const freeToCollector = parseBoolLoose(row.free_to_collector);
    const visibleRaw = row.visible_on_marketplace;

    if (!title || !description) {
      errors.push({ line: lineNo, message: "Title and description are required." });
      continue;
    }
    if (!VALID_CONDITIONS.includes(condition)) {
      errors.push({
        line: lineNo,
        message: `Invalid condition "${row.condition}". Use one of: ${VALID_CONDITIONS.join(", ")}.`,
      });
      continue;
    }
    if (!categorySlug) {
      errors.push({ line: lineNo, message: "category_slug is required." });
      continue;
    }

    const resolvedCategoryId = categoriesBySlug.get(categorySlug);
    if (!resolvedCategoryId) {
      errors.push({ line: lineNo, message: `Unknown category_slug "${categorySlug}".` });
      continue;
    }

    let pricePence = Math.round(parseFloat(priceRaw) * 100);
    if (freeToCollector) {
      pricePence = 0;
    } else if (Number.isNaN(pricePence) || pricePence < 0) {
      errors.push({ line: lineNo, message: "price_gbp must be a valid number (or use free_to_collector)." });
      continue;
    }

    const images = splitImageUrls(imageRaw);
    if (images.length === 0) {
      errors.push({ line: lineNo, message: "image_urls must include at least one URL (use | between URLs)." });
      continue;
    }
    for (const url of images) {
      if (!/^https?:\/\//i.test(url)) {
        errors.push({ line: lineNo, message: `Invalid image URL (must start with http): ${url.slice(0, 60)}…` });
        continue;
      }
    }
    if (errors.some((e) => e.line === lineNo)) continue;

    let pricingMode: ListingPricingMode = ListingPricingMode.LOT;
    let unitsAvailable: number | null = null;
    if (pricingModeRaw === "PER_UNIT") {
      pricingMode = ListingPricingMode.PER_UNIT;
      const u = parseInt(unitsRaw, 10);
      if (!Number.isFinite(u) || u < 1) {
        errors.push({ line: lineNo, message: "For pricing_mode PER_UNIT, units_available must be a whole number ≥ 1." });
        continue;
      }
      unitsAvailable = u;
    } else if (pricingModeRaw !== "LOT") {
      errors.push({ line: lineNo, message: 'pricing_mode must be LOT or PER_UNIT (or leave blank for LOT).' });
      continue;
    }

    const postcodeForLookup = postcodeInput || sellerProfile.postcode;
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

    const isYard = dbUser?.role === "reclamation_yard";
    const visibleOnMarketplace =
      isYard && !freeToCollector
        ? visibleRaw === undefined || visibleRaw === ""
          ? true
          : parseBoolLoose(visibleRaw)
        : true;

    try {
      const createdRow = await prisma.listing.create({
        data: {
          sellerId: session.user.id,
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
      await afterMarketplaceListingPersisted(session.user.id, createdRow.id, { wasLive: false });
      created++;
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Database error";
      errors.push({ line: lineNo, message: msg });
    }
  }

  return { status: "success", created, errors };
}

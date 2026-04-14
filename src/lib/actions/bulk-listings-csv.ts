"use server";

import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { parseCsvToMatrix } from "@/lib/csv-parse";
import { computeListingCarbonSnapshot } from "@/lib/carbon/listing";
import {
  BULK_CSV_MAX_FILE_BYTES,
  BULK_CSV_MAX_ROWS,
  bulkCsvNormalizeHeader,
  runBulkListingCsvImport,
} from "@/lib/bulk-listing-csv-core";

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
  if (file.size > BULK_CSV_MAX_FILE_BYTES) {
    return {
      status: "error",
      message: `File is too large (max ${BULK_CSV_MAX_FILE_BYTES / 1024 / 1024} MB).`,
    };
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

  const headerCells = matrix[0].map(bulkCsvNormalizeHeader);
  const required = ["title", "description", "condition", "category_slug", "price_gbp", "image_urls"];
  for (const col of required) {
    if (!headerCells.includes(col)) {
      return {
        status: "error",
        message: `Missing required column "${col.replace(/_/g, " ")}". Download the template for the correct headers.`,
      };
    }
  }

  const dataRowCount = matrix.length - 1;
  if (dataRowCount > BULK_CSV_MAX_ROWS) {
    return { status: "error", message: `Too many rows (max ${BULK_CSV_MAX_ROWS} data rows per upload).` };
  }

  const carbon = await computeListingCarbonSnapshot({
    materialType: null,
    materialQuantity: null,
    materialUnit: null,
    distanceSavedKm: null,
  });

  const categoryIdBySlugCache = new Map(
    (await prisma.category.findMany({ select: { id: true, slug: true } })).map((c) => [c.slug, c.id])
  );

  const { created, errors } = await runBulkListingCsvImport({
    matrix,
    headerCells,
    categoryIdBySlugCache,
    carbon,
    resolveSeller: async () => ({
      ok: true,
      seller: {
        sellerId: session.user.id,
        sellerRole: dbUser?.role ?? null,
        defaultPostcode: sellerProfile.postcode,
      },
    }),
  });

  return { status: "success", created, errors };
}

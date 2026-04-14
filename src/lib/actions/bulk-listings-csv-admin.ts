"use server";

import { randomBytes } from "node:crypto";
import { hash } from "bcryptjs";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { parseCsvToMatrix } from "@/lib/csv-parse";
import { computeListingCarbonSnapshot } from "@/lib/carbon/listing";
import { isCarbonAdmin } from "@/lib/admin";
import { lookupUkPostcode } from "@/lib/postcode-uk";
import { defaultYardOpeningHours, parseOpeningHoursSchedule } from "@/lib/opening-hours";
import { allocateYardSlug } from "@/lib/yard-slug";
import {
  BULK_CSV_MAX_FILE_BYTES,
  BULK_CSV_MAX_ROWS,
  bulkCsvNormalizeHeader,
  runBulkListingCsvImport,
  type BulkCsvSellerResolveResult,
  type BulkImportRowSeller,
} from "@/lib/bulk-listing-csv-core";
import { Prisma, type UserRole } from "@/generated/prisma/client";

export type AdminBulkCsvImportState =
  | { status: "idle" }
  | { status: "error"; message: string }
  | {
      status: "success";
      created: number;
      errors: { line: number; message: string }[];
      /** One-time passwords for brand-new accounts only — share securely with sellers. */
      newAccounts: { email: string; tempPassword: string }[];
    };

function generateTempPassword(): string {
  return `${randomBytes(10).toString("base64url")}aA1`;
}

async function resolveSellerForAdminRow(
  row: Record<string, string>,
  _lineNo: number,
  newAccountEmails: Map<string, string>
): Promise<BulkCsvSellerResolveResult> {
  const sellerEmailRaw = (row.seller_email ?? "").trim();
  if (!sellerEmailRaw) {
    return { ok: false, message: "seller_email is required for admin bulk import." };
  }
  const sellerEmail = sellerEmailRaw.toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(sellerEmail)) {
    return { ok: false, message: "seller_email is not a valid email address." };
  }

  const listingPostcode = (row.postcode ?? "").trim();
  const sellerPostcode = (row.seller_postcode ?? "").trim();
  const postcodeForProfile = sellerPostcode || listingPostcode;

  const sellerRoleRaw = (row.seller_role ?? "individual").trim().toLowerCase();
  if (sellerRoleRaw !== "individual" && sellerRoleRaw !== "reclamation_yard") {
    return { ok: false, message: 'seller_role must be "individual" or "reclamation_yard".' };
  }
  const sellerRole = sellerRoleRaw as UserRole;

  const displayName =
    (row.seller_display_name ?? "").trim() || sellerEmail.split("@")[0] || "Seller";
  const businessName = (row.seller_business_name ?? "").trim();

  const existing = await prisma.user.findFirst({
    where: { email: { equals: sellerEmail, mode: "insensitive" } },
    include: { sellerProfile: true },
  });

  if (existing) {
    if (existing.sellerProfile) {
      const seller: BulkImportRowSeller = {
        sellerId: existing.id,
        sellerRole: existing.role,
        defaultPostcode: existing.sellerProfile.postcode,
      };
      return { ok: true, seller };
    }

    if (!postcodeForProfile) {
      return {
        ok: false,
        message:
          "This user has no seller profile yet — set seller_postcode or listing postcode so we can create one.",
      };
    }
    const resolved = await lookupUkPostcode(postcodeForProfile);
    if (!resolved) {
      return { ok: false, message: "Invalid seller_postcode / postcode for seller profile setup." };
    }

    let openingHoursSchedule: Prisma.InputJsonValue | undefined;
    if (sellerRole === "reclamation_yard") {
      const parsed = parseOpeningHoursSchedule(defaultYardOpeningHours());
      if (parsed) {
        openingHoursSchedule = parsed as unknown as Prisma.InputJsonValue;
      }
    }
    const yardSlug =
      sellerRole === "reclamation_yard"
        ? await allocateYardSlug(prisma, businessName || displayName, existing.id)
        : null;

    await prisma.$transaction([
      prisma.user.update({
        where: { id: existing.id },
        data: { role: sellerRole },
      }),
      prisma.sellerProfile.create({
        data: {
          userId: existing.id,
          displayName: displayName.slice(0, 200),
          postcode: resolved.postcode,
          lat: resolved.lat,
          lng: resolved.lng,
          adminDistrict: resolved.adminDistrict,
          region: resolved.region,
          postcodeLocality: resolved.postcodeLocality,
          businessName: sellerRole === "reclamation_yard" ? businessName || null : null,
          openingHours: null,
          openingHoursSchedule,
          yardSlug,
          vatRegistered: false,
        },
      }),
    ]);

    return {
      ok: true,
      seller: {
        sellerId: existing.id,
        sellerRole,
        defaultPostcode: resolved.postcode,
      },
    };
  }

  if (!postcodeForProfile) {
    return {
      ok: false,
      message: "New sellers need seller_postcode or listing postcode in the row for profile setup.",
    };
  }
  const resolved = await lookupUkPostcode(postcodeForProfile);
  if (!resolved) {
    return { ok: false, message: "Invalid seller_postcode / postcode for new seller." };
  }

  const tempPassword = generateTempPassword();
  const hashed = await hash(tempPassword, 12);

  let openingHoursSchedule: Prisma.InputJsonValue | undefined;
  if (sellerRole === "reclamation_yard") {
    const parsed = parseOpeningHoursSchedule(defaultYardOpeningHours());
    if (parsed) {
      openingHoursSchedule = parsed as unknown as Prisma.InputJsonValue;
    }
  }

  const createdUser = await prisma.user.create({
    data: {
      email: sellerEmail,
      password: hashed,
      name: displayName.slice(0, 200),
      registrationIntent: "selling",
      role: sellerRole,
      sellerProfile: {
        create: {
          displayName: displayName.slice(0, 200),
          postcode: resolved.postcode,
          lat: resolved.lat,
          lng: resolved.lng,
          adminDistrict: resolved.adminDistrict,
          region: resolved.region,
          postcodeLocality: resolved.postcodeLocality,
          businessName: sellerRole === "reclamation_yard" ? businessName || null : null,
          openingHours: null,
          ...(openingHoursSchedule !== undefined ? { openingHoursSchedule } : {}),
          yardSlug: null,
          vatRegistered: false,
        },
      },
    },
    select: { id: true },
  });

  if (sellerRole === "reclamation_yard") {
    const slug = await allocateYardSlug(prisma, businessName || displayName, createdUser.id);
    await prisma.sellerProfile.update({
      where: { userId: createdUser.id },
      data: { yardSlug: slug },
    });
  }

  newAccountEmails.set(sellerEmail, tempPassword);

  return {
    ok: true,
    seller: {
      sellerId: createdUser.id,
      sellerRole,
      defaultPostcode: resolved.postcode,
    },
  };
}

export async function adminBulkImportListingsCsvAction(
  _prev: AdminBulkCsvImportState,
  formData: FormData
): Promise<AdminBulkCsvImportState> {
  const session = await auth();
  if (!session?.user?.id) {
    return { status: "error", message: "You need to be signed in." };
  }
  if (!isCarbonAdmin(session)) {
    return { status: "error", message: "You do not have admin access." };
  }

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
  const required = [
    "seller_email",
    "title",
    "description",
    "condition",
    "category_slug",
    "price_gbp",
    "image_urls",
  ];
  for (const col of required) {
    if (!headerCells.includes(col)) {
      return {
        status: "error",
        message: `Missing required column "${col.replace(/_/g, " ")}". Download the admin CSV template.`,
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

  const categoriesBySlug = new Map(
    (await prisma.category.findMany({ select: { id: true, slug: true } })).map((c) => [c.slug, c.id])
  );

  const newAccountEmails = new Map<string, string>();

  const { created, errors } = await runBulkListingCsvImport({
    matrix,
    headerCells,
    categoriesBySlug,
    carbon,
    resolveSeller: (row, lineNo) => resolveSellerForAdminRow(row, lineNo, newAccountEmails),
  });

  const newAccounts = Array.from(newAccountEmails.entries()).map(([email, tempPassword]) => ({
    email,
    tempPassword,
  }));

  return { status: "success", created, errors, newAccounts };
}

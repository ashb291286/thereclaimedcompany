"use server";

import { randomBytes } from "node:crypto";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { parseCsvToMatrix } from "@/lib/csv-parse";
import { isCarbonAdmin } from "@/lib/admin";
import { lookupUkPostcode } from "@/lib/postcode-uk";
import { allocateYardSlug } from "@/lib/yard-slug";
import { defaultYardOpeningHours, parseOpeningHoursSchedule } from "@/lib/opening-hours";
import { revalidatePath } from "next/cache";
import { UserRole, type Prisma } from "@/generated/prisma/client";

type ImportMode = "reclamation_yard" | "dealer";

export type SellerProfileImportState =
  | { status: "idle" }
  | { status: "error"; message: string }
  | {
      status: "success";
      created: number;
      updated: number;
      errors: { line: number; message: string }[];
      claimRows: Array<{
        profileId: string;
        role: "reclamation_yard" | "dealer";
        displayName: string;
        claimCode: string;
        publicPath: string;
      }>;
    };

const MAX_ROWS = 1500;
const MAX_FILE_BYTES = 4 * 1024 * 1024;

function normalizeHeader(raw: string): string {
  return raw
    .replace(/^\uFEFF/, "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "_");
}

function boolLoose(raw: string | undefined): boolean {
  const v = (raw ?? "").trim().toLowerCase();
  return v === "1" || v === "true" || v === "yes" || v === "y";
}

function randomClaimCode(): string {
  return randomBytes(6).toString("hex").toUpperCase();
}

function toRole(raw: string | undefined, fallback: ImportMode): ImportMode | null {
  const v = (raw ?? "").trim().toLowerCase();
  if (!v) return fallback;
  if (v === "reclamation_yard" || v === "yard") return "reclamation_yard";
  if (v === "dealer") return "dealer";
  return null;
}

function toPublicPath(role: ImportMode, userId: string, yardSlug: string | null): string {
  if (role === "reclamation_yard" && yardSlug) return `/yards/${yardSlug}`;
  return `/sellers/${userId}`;
}

export async function adminImportSellerProfilesCsvAction(
  _prev: SellerProfileImportState,
  formData: FormData
): Promise<SellerProfileImportState> {
  const session = await auth();
  if (!session?.user?.id) return { status: "error", message: "You need to be signed in." };
  if (!isCarbonAdmin(session)) return { status: "error", message: "You do not have admin access." };

  const importModeRaw = String(formData.get("importMode") ?? "").trim();
  const importMode: ImportMode =
    importModeRaw === "dealer" ? "dealer" : "reclamation_yard";

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
    return { status: "error", message: "Could not read the uploaded CSV." };
  }

  const matrix = parseCsvToMatrix(text);
  if (matrix.length < 2) {
    return { status: "error", message: "CSV needs a header row and at least one data row." };
  }
  if (matrix.length - 1 > MAX_ROWS) {
    return { status: "error", message: `Too many rows (max ${MAX_ROWS}).` };
  }

  const headers = matrix[0].map(normalizeHeader);
  for (const required of ["display_name", "postcode"]) {
    if (!headers.includes(required)) {
      return { status: "error", message: `Missing required column "${required}".` };
    }
  }

  const errors: { line: number; message: string }[] = [];
  const claimRows: Array<{
    profileId: string;
    role: "reclamation_yard" | "dealer";
    displayName: string;
    claimCode: string;
    publicPath: string;
  }> = [];
  let created = 0;
  let updated = 0;

  for (let r = 1; r < matrix.length; r++) {
    const lineNo = r + 1;
    const cells = matrix[r];
    if (!cells.some((c) => c.trim())) continue;

    const row: Record<string, string> = {};
    for (let c = 0; c < headers.length; c++) row[headers[c]] = (cells[c] ?? "").trim();

    const role = toRole(row.role, importMode);
    if (!role) {
      errors.push({
        line: lineNo,
        message: 'Invalid role. Use "reclamation_yard", "yard", or "dealer".',
      });
      continue;
    }

    const displayName = (row.display_name ?? "").trim().slice(0, 200);
    if (!displayName) {
      errors.push({ line: lineNo, message: "display_name is required." });
      continue;
    }
    const postcodeRaw = (row.postcode ?? "").trim();
    if (!postcodeRaw) {
      errors.push({ line: lineNo, message: "postcode is required." });
      continue;
    }
    const postcode = await lookupUkPostcode(postcodeRaw);
    if (!postcode) {
      errors.push({ line: lineNo, message: `Invalid postcode "${postcodeRaw}".` });
      continue;
    }

    const businessName =
      role === "reclamation_yard" ? ((row.business_name ?? "").trim().slice(0, 200) || null) : null;
    const claimContactEmail = (row.contact_email ?? "").trim().toLowerCase() || null;
    const website = (row.website ?? "").trim() || null;
    const phone = (row.phone ?? "").trim() || null;
    const whatsapp = (row.whatsapp ?? "").trim() || null;
    const about = (row.about ?? "").trim() || null;
    const tagline = (row.tagline ?? "").trim().slice(0, 180) || null;
    const salvoCodeMember = boolLoose(row.salvo_code_member);
    const yearEstablishedRaw = parseInt((row.year_established ?? "").trim(), 10);
    const yearEstablished = Number.isFinite(yearEstablishedRaw) ? yearEstablishedRaw : null;
    const tradeRaw = (row.trade_public ?? "").trim().toLowerCase();
    const yardTradePublic =
      tradeRaw === "trade" || tradeRaw === "public" || tradeRaw === "both" ? tradeRaw : null;
    const inputSlug = role === "reclamation_yard" ? ((row.yard_slug ?? "").trim() || null) : null;

    const defaultOpening = parseOpeningHoursSchedule(defaultYardOpeningHours());
    const openingHoursSchedule =
      role === "reclamation_yard" && defaultOpening
        ? (defaultOpening as unknown as Prisma.InputJsonValue)
        : undefined;

    try {
      const existingBySlug =
        role === "reclamation_yard" && inputSlug
          ? await prisma.sellerProfile.findUnique({
              where: { yardSlug: inputSlug },
              select: { id: true, userId: true },
            })
          : null;

      if (existingBySlug?.id) {
        const claimCode = randomClaimCode();
        await prisma.sellerProfile.update({
          where: { id: existingBySlug.id },
          data: {
            displayName,
            postcode: postcode.postcode,
            lat: postcode.lat,
            lng: postcode.lng,
            adminDistrict: postcode.adminDistrict,
            region: postcode.region,
            postcodeLocality: postcode.postcodeLocality,
            businessName,
            yardTagline: tagline,
            yardAbout: about,
            yardWebsiteUrl: website,
            yardContactPhone: phone,
            yardWhatsApp: whatsapp,
            salvoCodeMember,
            yearEstablished,
            yardTradePublic,
            importedByAdmin: true,
            claimCode,
            claimContactEmail,
            claimedAt: null,
            ...(openingHoursSchedule !== undefined ? { openingHoursSchedule } : {}),
          },
        });
        claimRows.push({
          profileId: existingBySlug.id,
          role,
          displayName,
          claimCode,
          publicPath: toPublicPath(role, existingBySlug.userId, inputSlug),
        });
        updated++;
        continue;
      }

      const claimCode = randomClaimCode();
      const createdUser = await prisma.user.create({
        data: {
          email: null,
          password: null,
          name: displayName,
          role: role as UserRole,
          registrationIntent: "selling",
        },
        select: { id: true },
      });

      let yardSlug = inputSlug;
      if (role === "reclamation_yard" && !yardSlug) {
        yardSlug = await allocateYardSlug(prisma, businessName || displayName, createdUser.id);
      }

      const profile = await prisma.sellerProfile.create({
        data: {
          userId: createdUser.id,
          displayName,
          postcode: postcode.postcode,
          lat: postcode.lat,
          lng: postcode.lng,
          adminDistrict: postcode.adminDistrict,
          region: postcode.region,
          postcodeLocality: postcode.postcodeLocality,
          businessName,
          yardSlug,
          yardTagline: tagline,
          yardAbout: about,
          yardWebsiteUrl: website,
          yardContactPhone: phone,
          yardWhatsApp: whatsapp,
          salvoCodeMember,
          yearEstablished,
          yardTradePublic,
          importedByAdmin: true,
          claimCode,
          claimContactEmail,
          ...(openingHoursSchedule !== undefined ? { openingHoursSchedule } : {}),
        },
        select: { id: true },
      });

      claimRows.push({
        profileId: profile.id,
        role,
        displayName,
        claimCode,
        publicPath: toPublicPath(role, createdUser.id, yardSlug),
      });
      created++;
    } catch (e) {
      const message = e instanceof Error ? e.message : "Database error";
      errors.push({ line: lineNo, message });
    }
  }

  revalidatePath("/dashboard/admin");
  revalidatePath("/search");
  revalidatePath("/dealers");
  revalidatePath("/reclamation-yards");

  return { status: "success", created, updated, errors, claimRows };
}


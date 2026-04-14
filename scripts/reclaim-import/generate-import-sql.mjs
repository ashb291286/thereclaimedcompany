#!/usr/bin/env node
/**
 * Reads reclaim-2021 MySQL dump and emits PostgreSQL INSERTs for User, SellerProfile, Listing.
 *
 * Usage:
 *   node scripts/reclaim-import/generate-import-sql.mjs \
 *     --dump "thereclaimedcompany.com-99c2-2026-04-08/database_backups/reclaim-2021-3633a1ae.sql" \
 *     --out-dir "prisma/reclaim-import"
 *
 * Modes:
 *   --test   Only a small slice (few users + listings) for a dry run
 *
 * Prerequisites on target DB: run prisma migrate + seed (categories must exist).
 * Image URLs are prefixed with IMAGE_BASE (old CDN/site); change if you mirror uploads elsewhere.
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { parseValueTuples, splitTupleValues } from "./mysql-values-parser.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "../..");

const IMAGE_BASE = "https://thereclaimedcompany.com/uploads/images/";

/** Old categories.slug -> new marketplace Category.slug (from prisma/seed.ts) */
const CATEGORY_SLUG_MAP = {
  "building-materials": "other",
  "roofing-tiles": "roof-tiles-slates",
  "reclaimed-slates": "roof-tiles-slates",
  "beams-timber": "timber-wood",
  "scaffold-boards": "timber-wood",
  "railway-sleepers": "timber-wood",
  bricks: "bricks-blocks",
  "chimney-pots": "hardware-fixtures",
  "flagstones-and-tiles": "stone-paving",
  flooring: "flooring",
  "wooden-flooring": "flooring",
  fireplaces: "fireplaces",
  "doors-handles": "doors",
  "windows-accessories": "windows",
  outdoor: "other",
  furniture: "other",
  "furniture-16": "other",
  ornaments: "other",
  lighting: "hardware-fixtures",
  "indoor-lighting": "hardware-fixtures",
  "water-tanks": "other",
  bathroom: "other",
  kitchen: "other",
  emporium: "other",
  "home-living": "other",
  "garage-barn-finds": "other",
  curios: "other",
  collectables: "other",
  "collectables-art": "other",
  antiques: "other",
  motors: "other",
  tools: "hardware-fixtures",
  stoves: "fireplaces",
};

function pgQuote(str) {
  if (str === null || str === undefined) return "NULL";
  return "'" + String(str).replace(/\\/g, "\\\\").replace(/'/g, "''") + "'";
}

function pgTs(d) {
  if (!d || d === "0000-00-00 00:00:00") return "NULL";
  const s = String(d).replace(" ", "T");
  const iso = s.endsWith("Z") ? s : `${s}Z`;
  return `'${iso.replace(/'/g, "''")}'::timestamptz`;
}

function extractUkPostcode(zip, address) {
  const s = [zip, address].filter(Boolean).join(" ");
  const m = s.match(/[A-Z]{1,2}\d[A-Z\d]?\s*\d[A-Z]{2}/i);
  return m ? m[0].toUpperCase().replace(/\s+/g, " ").trim() : null;
}

function publicUploadUrl(relativePath) {
  if (!relativePath) return null;
  const p = String(relativePath).replace(/^\//, "");
  if (p.startsWith("http://") || p.startsWith("https://")) return p;
  return `https://thereclaimedcompany.com/${p}`;
}

function stripHtml(html) {
  if (!html) return "";
  return String(html)
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\s+/g, " ")
    .trim();
}

function parseArgs() {
  const a = process.argv.slice(2);
  const out = { test: false, dump: null, outDir: path.join(ROOT, "prisma", "reclaim-import") };
  for (let i = 0; i < a.length; i++) {
    if (a[i] === "--test") out.test = true;
    else if (a[i] === "--dump" && a[i + 1]) {
      out.dump = a[++i];
    } else if (a[i] === "--out-dir" && a[i + 1]) {
      out.outDir = a[++i];
    }
  }
  if (!out.dump) {
    out.dump = path.join(
      ROOT,
      "thereclaimedcompany.com-99c2-2026-04-08",
      "database_backups",
      "reclaim-2021-3633a1ae.sql"
    );
  }
  return out;
}

/**
 * mysqldump often wraps long INSERT lines; join through UNLOCK TABLES before parsing.
 */
function loadTable(sql, name) {
  const startMarker = `INSERT INTO \`${name}\` VALUES `;
  const i0 = sql.indexOf(startMarker);
  if (i0 < 0) return [];
  const unlock = sql.indexOf("\nUNLOCK TABLES", i0);
  const end = unlock > i0 ? unlock : sql.length;
  const flattened = sql.slice(i0, end).replace(/\r?\n/g, "");
  const valuePos = flattened.indexOf("VALUES ") + "VALUES ".length;
  const tuples = parseValueTuples(flattened, valuePos);
  return tuples.map((t) => splitTupleValues(t));
}

function main() {
  const { test, dump, outDir } = parseArgs();
  const dumpPath = path.isAbsolute(dump) ? dump : path.join(ROOT, dump);
  if (!fs.existsSync(dumpPath)) {
    console.error("Dump not found:", dumpPath);
    process.exit(1);
  }
  console.error("Reading", dumpPath, "...");
  const sql = fs.readFileSync(dumpPath, "utf8");

  const userRows = loadTable(sql, "users");
  const productRows = loadTable(sql, "products");
  const detailRows = loadTable(sql, "product_details");
  const catRows = loadTable(sql, "categories");
  const catLangRows = loadTable(sql, "categories_lang");
  const imageRows = loadTable(sql, "images");

  const catIdToSlug = new Map();
  for (const r of catRows) {
    const id = r[0];
    const slug = r[1];
    catIdToSlug.set(id, slug);
  }

  const productIdToDetails = new Map();
  for (const r of detailRows) {
    const productId = r[1];
    const langId = r[2];
    if (langId === 1) {
      productIdToDetails.set(productId, { title: r[3], description: r[4] });
    }
  }

  const productIdToImages = new Map();
  for (const r of imageRows) {
    const productId = r[1];
    const big = r[3] || r[2];
    if (!productId || !big) continue;
    const url = IMAGE_BASE + String(big).replace(/^\//, "");
    if (!productIdToImages.has(productId)) productIdToImages.set(productId, []);
    productIdToImages.get(productId).push({ url, isMain: r[5] === 1 });
  }
  for (const [, arr] of productIdToImages) {
    arr.sort((a, b) => (b.isMain ? 1 : 0) - (a.isMain ? 1 : 0));
  }

  function resolveCategorySlug(oldCatId) {
    const oldSlug = catIdToSlug.get(oldCatId) || "other";
    return CATEGORY_SLUG_MAP[oldSlug] || "other";
  }

  const userByOldId = new Map();
  for (const r of userRows) {
    userByOldId.set(r[0], r);
  }

  let usersOut = userRows.filter((r) => {
    if (r[17] === 1) return false;
    const email = r[3];
    if (!email || email === "name@domain.com") return false;
    return true;
  });

  if (test) {
    const keepIds = new Set();
    for (const pr of productRows) {
      const uid = pr[11];
      if (uid && userByOldId.has(uid)) keepIds.add(uid);
      if (keepIds.size >= 4) break;
    }
    usersOut = usersOut.filter((r) => keepIds.has(r[0])).slice(0, 5);
    if (usersOut.length === 0) {
      usersOut = userRows.filter((r) => r[17] !== 1 && r[3] && r[3] !== "name@domain.com").slice(0, 3);
    }
  }

  const selectedUserIds = new Set(usersOut.map((r) => r[0]));

  function productIsListable(pr) {
    if (pr[35] === 1) return false;
    if (pr[36] === 1) return false;
    if (pr[20] !== 1) return false;
    if (pr[12] !== 1) return false;
    const uid = pr[11];
    if (!uid || !selectedUserIds.has(uid)) return false;
    return true;
  }

  let productsOut = productRows.filter(productIsListable);

  if (test) {
    productsOut = productsOut.slice(0, 15);
  }

  const lines = [];
  lines.push(`-- Generated from legacy reclaim MySQL dump`);
  lines.push(`-- ${test ? "TEST slice" : "FULL import"} — review before production`);
  lines.push(`BEGIN;`);
  lines.push(`-- Optional: remove previous legacy import`);
  lines.push(`DELETE FROM "Listing" WHERE "id" LIKE 'legacy_l_%';`);
  lines.push(`DELETE FROM "SellerProfile" WHERE "userId" LIKE 'legacy_u_%';`);
  lines.push(`DELETE FROM "User" WHERE "id" LIKE 'legacy_u_%';`);
  lines.push(``);

  for (const r of usersOut) {
    const oldId = r[0];
    const email = r[3];
    const password = r[6];
    const roleOld = r[7];
    const first = r[18] || "";
    const last = r[19] || "";
    const name = [first, last].filter(Boolean).join(" ").trim() || r[1] || "User";
    const image = publicUploadUrl(r[14]);

    let role = "individual";
    if (roleOld === "vendor") role = "reclamation_yard";
    else if (roleOld === "admin" && r[20]) role = "reclamation_yard";

    const newId = `legacy_u_${oldId}`;
    lines.push(
      `INSERT INTO "User" ("id","email","emailVerified","name","image","password","role","createdAt","updatedAt") VALUES (${pgQuote(newId)}, ${pgQuote(email)}, NOW(), ${pgQuote(name)}, ${image ? pgQuote(image) : "NULL"}, ${password ? pgQuote(password) : "NULL"}, ${role === "reclamation_yard" ? "'reclamation_yard'" : "'individual'"}, NOW(), NOW());`
    );

    if (role === "reclamation_yard") {
      const shop = r[20] || name;
      const slugRaw = r[2] || `yard-${oldId}`;
      const postcode =
        extractUkPostcode(r[27], r[26]) || "YO1 7HD";
      const about = stripHtml(r[21] || "").slice(0, 20000) || null;
      const phone = r[22] ? String(r[22]) : null;
      const web = r[31] ? String(r[31]) : null;
      let yardSlug = String(slugRaw)
        .toLowerCase()
        .replace(/[^a-z0-9-]+/g, "-")
        .replace(/^-|-$/g, "")
        .slice(0, 80);
      if (!yardSlug) yardSlug = `yard-${oldId}`;
      yardSlug = `${yardSlug}-r${oldId}`;

      const social = {};
      if (r[32]) social.facebook = String(r[32]);
      if (r[33]) social.twitter = String(r[33]);
      if (r[34]) social.instagram = String(r[34]);
      if (r[38]) social.youtube = String(r[38]);

      const spId = `legacy_sp_${oldId}`;
      lines.push(
        `INSERT INTO "SellerProfile" ("id","userId","businessName","displayName","postcode","yardSlug","yardAbout","yardContactPhone","yardWebsiteUrl","yardSocialJson","verificationStatus","createdAt","updatedAt") VALUES (${pgQuote(spId)}, ${pgQuote(newId)}, ${pgQuote(shop)}, ${pgQuote(shop)}, ${pgQuote(postcode)}, ${pgQuote(yardSlug)}, ${about ? pgQuote(about) : "NULL"}, ${phone ? pgQuote(phone) : "NULL"}, ${web ? pgQuote(web) : "NULL"}, ${Object.keys(social).length ? pgQuote(JSON.stringify(social)) : "NULL"}, 'none', NOW(), NOW());`
      );
    }
  }

  lines.push(``);

  for (const pr of productsOut) {
    const pid = pr[0];
    const slug = pr[1];
    const listingType = pr[3];
    const sku = pr[4] ? String(pr[4]) : null;
    const categoryIdOld = pr[5];
    const pricePence = typeof pr[6] === "number" ? pr[6] : parseInt(pr[6], 10) || 0;
    const shipPence = typeof pr[7] === "number" ? pr[7] : parseInt(pr[7], 10) || 0;
    const sellerOld = pr[11];
    const stock = typeof pr[26] === "number" ? pr[26] : parseInt(pr[26], 10) || 1;
    const lat = pr[29];
    const lng = pr[30];
    const loc = pr[27] ? String(pr[27]) : null;
    const isSold = pr[34] === 1;
    const promoteEnd = pr[15];

    const det = productIdToDetails.get(pid) || {};
    let title = det.title || String(slug || "listing").replace(/-/g, " ");
    title = stripHtml(title).slice(0, 200) || `Product ${pid}`;
    let desc = stripHtml(det.description || title).slice(0, 32000);
    if (!desc) desc = title;

    const newSellerId = `legacy_u_${sellerOld}`;
    const newListingId = `legacy_l_${pid}`;
    const targetSlug = resolveCategorySlug(categoryIdOld);

    const imgs = productIdToImages.get(pid) || [];
    const imagesLiteral =
      imgs.length === 0
        ? "ARRAY[]::text[]"
        : `ARRAY[${imgs.map((x) => pgQuote(x.url)).join(",")}]::text[]`;

    let listingKind = listingType === "bidding" ? "auction" : "sell";
    let auctionEndsSql = "NULL";
    if (listingKind === "auction") {
      const pe = promoteEnd && String(promoteEnd) !== "0000-00-00 00:00:00" ? promoteEnd : null;
      if (pe) {
        auctionEndsSql = pgTs(pe);
      } else {
        listingKind = "sell";
      }
    }
    let status = "active";
    if (isSold) status = "sold";
    const offersDelivery = shipPence > 0;

    lines.push(`INSERT INTO "Listing" (`);
    lines.push(
      [
        `"id"`,
        `"sellerId"`,
        `"title"`,
        `"sellerReference"`,
        `"description"`,
        `"price"`,
        `"condition"`,
        `"categoryId"`,
        `"postcode"`,
        `"lat"`,
        `"lng"`,
        `"images"`,
        `"status"`,
        `"listingKind"`,
        `"pricingMode"`,
        `"unitsAvailable"`,
        `"offersDelivery"`,
        `"deliveryCostPence"`,
        `"auctionEndsAt"`,
        `"visibleOnMarketplace"`,
        `"createdAt"`,
        `"updatedAt"`,
      ].join(",")
    );
    lines.push(`) VALUES (`);
    const catExpr = `(SELECT "id" FROM "Category" WHERE "slug" = ${pgQuote(targetSlug)} LIMIT 1)`;
    const parts = [
      pgQuote(newListingId),
      pgQuote(newSellerId),
      pgQuote(title),
      sku ? pgQuote(sku.slice(0, 120)) : "NULL",
      pgQuote(desc),
      String(Math.max(0, pricePence)),
      "'used'",
      catExpr,
      loc ? pgQuote(loc.slice(0, 20)) : "NULL",
      typeof lat === "number" && !Number.isNaN(lat) ? String(lat) : "NULL",
      typeof lng === "number" && !Number.isNaN(lng) ? String(lng) : "NULL",
      imagesLiteral,
      `'${status}'`,
      `'${listingKind}'`,
      stock > 1 ? "'PER_UNIT'" : "'LOT'",
      stock > 1 ? String(stock) : "NULL",
      offersDelivery ? "true" : "false",
      offersDelivery ? String(shipPence) : "NULL",
      auctionEndsSql,
      "true",
      pgTs(pr[38]),
      pgTs(pr[38]),
    ];
    lines.push(parts.join(",") + `);`);
    lines.push(``);
  }

  lines.push(`COMMIT;`);

  fs.mkdirSync(outDir, { recursive: true });
  const name = test ? "reclaim-import-test.sql" : "reclaim-import-full.sql";
  const outPath = path.join(outDir, name);
  fs.writeFileSync(outPath, lines.join("\n"), "utf8");
  console.error("Wrote", outPath, `(${usersOut.length} users, ${productsOut.length} listings)`);
}

main();

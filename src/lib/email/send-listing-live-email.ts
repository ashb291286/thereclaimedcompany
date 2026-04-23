import nodemailer from "nodemailer";
import type { ListingKind } from "@/generated/prisma/client";
import { prisma } from "@/lib/db";
import { getSiteBaseUrl } from "@/lib/site-url";

const PASSPORT_THRESHOLD_PENCE = 250_000; // £2,500

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function formatListingPriceLine(
  pricePence: number,
  listingKind: ListingKind,
  freeToCollector: boolean
): string {
  if (freeToCollector) return "Free to collector";
  if (pricePence === 0) return "Free";
  const g = (pricePence / 100).toFixed(2);
  if (listingKind === "auction") return `From £${g}`;
  return `£${g}`;
}

function formatPublishedLondon(date: Date): { dateStr: string; timeStr: string } {
  return {
    dateStr: new Intl.DateTimeFormat("en-GB", {
      timeZone: "Europe/London",
      day: "numeric",
      month: "long",
      year: "numeric",
    }).format(date),
    timeStr: new Intl.DateTimeFormat("en-GB", {
      timeZone: "Europe/London",
      hour: "2-digit",
      minute: "2-digit",
    }).format(date),
  };
}

function buildThumbInner(firstImageUrl: string | undefined): string {
  if (firstImageUrl?.trim()) {
    const u = firstImageUrl.trim();
    return `<img src="${escapeHtml(u)}" alt="" width="68" height="68" style="display:block;width:68px;height:68px;object-fit:cover;border-radius:6px;border:0" />`;
  }
  return '<span style="font-size:26px">🪑</span>';
}

function buildListingLiveHtml(input: {
  titleHtml: string;
  categoryHtml: string;
  dateStr: string;
  timeStr: string;
  priceLineHtml: string;
  idLabelHtml: string;
  publicUrlDisplayHtml: string;
  thumbInner: string;
  showPassportNudge: boolean;
  urls: {
    logo: string;
    listing: string;
    edit: string;
    facebook: string;
    pinterest: string;
    mailto: string;
    home: string;
    search: string;
    dealers: string;
    legal: string;
    insta: string;
    privacy: string;
    unsubscribe: string;
  };
}): string {
  const y = new Date().getFullYear();
  const { urls, showPassportNudge } = input;
  const nudge = showPassportNudge
    ? `    <div class="nudge">
      <div class="nudge-tag">Your piece qualifies</div>
      <div class="nudge-title">This sale will include a Piece Passport</div>
      <div class="nudge-desc">Because your listing is above £2,500, every sale will automatically generate a Piece Passport — a permanent, co-signed provenance record issued to the buyer in physical and digital form. Your name becomes part of the permanent history of this piece. Buyers at this price point know what this means, and it builds significant confidence. The sale will also be handled through a Private Deal Thread — a secure conversation where the buyer can ask every question before payment is taken.</div>
    </div>`
    : "";

  return `<!DOCTYPE html>
<html lang="en" xmlns="http://www.w3.org/1999/xhtml">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<meta http-equiv="X-UA-Compatible" content="IE=edge">
<title>Your Listing is Live — The Reclaimed Company</title>
<link href="https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,700;0,900;1,400&family=Source+Serif+4:wght@300;400;600&family=DM+Mono:wght@400;500&display=swap" rel="stylesheet">
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { background: #f0ece4; font-family: 'Source Serif 4', Georgia, serif; -webkit-font-smoothing: antialiased; }
  .email-wrap { max-width: 620px; margin: 40px auto; background: #ffffff; border-radius: 4px; overflow: hidden; box-shadow: 0 4px 40px rgba(0,0,0,0.10); }
  .header { background: #004e6d; position: relative; overflow: hidden; }
  .hx { position: absolute; inset: 0; background: repeating-linear-gradient(90deg,transparent,transparent 80px,rgba(255,255,255,0.018) 80px,rgba(255,255,255,0.018) 81px),repeating-linear-gradient(0deg,transparent,transparent 80px,rgba(255,255,255,0.01) 80px,rgba(255,255,255,0.01) 81px); pointer-events:none; }
  .hg1 { position:absolute; top:-80px; right:-60px; width:280px; height:280px; border-radius:50%; background:radial-gradient(circle,rgba(0,95,133,0.55) 0%,transparent 65%); pointer-events:none; }
  .hg2 { position:absolute; bottom:-50px; left:-30px; width:180px; height:180px; border-radius:50%; background:radial-gradient(circle,rgba(196,149,106,0.1) 0%,transparent 70%); pointer-events:none; }
  .hi { position:relative; z-index:1; padding:36px 48px 40px; }
  .logo-row { display:flex; align-items:center; gap:12px; margin-bottom:30px; padding-bottom:20px; border-bottom:1px solid rgba(255,255,255,0.1); }
  .logo-img img { display:block; max-height:38px; max-width:200px; width:auto; border:0; }
  .lt { font-family:'Source Serif 4',Georgia,serif; font-size:14px; font-weight:600; color:rgba(255,255,255,0.88); line-height:1.2; }
  .lt span { display:block; font-size:9px; font-weight:300; color:rgba(255,255,255,0.38); letter-spacing:2.5px; text-transform:uppercase; font-family:'DM Mono',monospace; margin-top:2px; }
  .live-pill { display:inline-flex; align-items:center; gap:8px; background:rgba(255,255,255,0.1); border:1px solid rgba(255,255,255,0.18); border-radius:20px; padding:5px 14px; margin-bottom:18px; }
  .live-dot { width:7px; height:7px; border-radius:50%; background:#6dd9a0; flex-shrink:0; box-shadow:0 0 0 3px rgba(109,217,160,0.25); }
  .live-text { font-family:'DM Mono',monospace; font-size:10px; letter-spacing:2px; text-transform:uppercase; color:rgba(255,255,255,0.75); }
  .header h1 { font-family:'Playfair Display',serif; font-size:34px; font-weight:900; color:#fff; line-height:1.1; letter-spacing:-1px; margin-bottom:24px; }
  .header h1 em { color:#c4956a; font-style:normal; }
  .lc { background:rgba(255,255,255,0.08); border:1px solid rgba(255,255,255,0.14); border-radius:10px; padding:18px 20px; display:flex; gap:16px; align-items:center; margin-bottom:18px; }
  .lc-thumb { width:68px; min-width:68px; height:68px; background:rgba(255,255,255,0.1); border-radius:6px; border:1px solid rgba(255,255,255,0.12); flex-shrink:0; display:flex; align-items:center; justify-content:center; overflow:hidden; }
  .lc-title { font-family:'Playfair Display',serif; font-size:16px; font-weight:700; color:#fff; margin-bottom:4px; line-height:1.3; }
  .lc-meta { font-family:'DM Mono',monospace; font-size:10px; letter-spacing:1px; color:rgba(255,255,255,0.4); margin-bottom:6px; }
  .lc-price { font-family:'Playfair Display',serif; font-size:19px; font-weight:700; color:#c4956a; }
  .lc-id { font-family:'DM Mono',monospace; font-size:10px; color:rgba(255,255,255,0.28); margin-left:10px; }
  .view-btn { display:inline-block; background:#c4956a; color:#003650 !important; text-decoration:none !important; font-family:'Source Serif 4',Georgia,serif; font-size:13px; font-weight:600; padding:10px 22px; border-radius:5px; }
  .body { padding:40px 48px 36px; background:#fff; }
  .intro { font-size:16px; color:#3d464e; font-weight:300; line-height:1.8; margin-bottom:32px; }
  .intro strong { color:#1a1e21; font-weight:600; }
  .slabel { font-family:'DM Mono',monospace; font-size:10px; letter-spacing:3px; text-transform:uppercase; color:#7a8490; margin-bottom:18px; padding-bottom:10px; border-bottom:1px solid #e8edf0; }
  .url-box { background:#f2f6f8; border:1px solid #d4dde3; border-radius:8px; padding:13px 18px; margin-bottom:20px; display:flex; align-items:center; gap:12px; }
  .url-lbl { font-family:'DM Mono',monospace; font-size:9px; letter-spacing:2px; text-transform:uppercase; color:#7a8490; white-space:nowrap; flex-shrink:0; }
  .url-val { font-family:'DM Mono',monospace; font-size:12px; color:#004e6d; word-break:break-all; flex:1; }
  .share-wrap { border:1px solid #d4dde3; border-radius:10px; overflow:hidden; margin-bottom:32px; }
  .share-item { display:flex; align-items:stretch; gap:0; border-bottom:1px solid #e8edf0; }
  .share-item:last-child { border-bottom:none; }
  .si-icon { width:52px; background:#f2f6f8; border-right:1px solid #e8edf0; flex-shrink:0; display:flex; align-items:center; justify-content:center; font-size:20px; }
  .si-body { flex:1; padding:14px 16px; }
  .si-title { font-family:'Playfair Display',serif; font-size:14px; font-weight:700; color:#1a1e21; margin-bottom:3px; }
  .si-desc { font-size:13px; color:#7a8490; font-weight:300; line-height:1.5; }
  .si-desc a { color:#004e6d !important; text-decoration:none !important; font-weight:500; }
  .si-action { padding:0 16px; flex-shrink:0; display:flex; align-items:center; }
  .si-btn { display:inline-block; background:#eef6fa; border:1px solid #9ec4d6; border-radius:5px; color:#004e6d !important; text-decoration:none !important; font-family:'DM Mono',monospace; font-size:10px; letter-spacing:1px; text-transform:uppercase; padding:7px 12px; white-space:nowrap; }
  .tip { display:flex; gap:14px; align-items:flex-start; padding:16px 0; border-bottom:1px solid #f2f5f7; }
  .tip:first-child { padding-top:0; }
  .tip:last-child { border-bottom:none; padding-bottom:0; }
  .tip-icon { width:38px; height:38px; background:#eef6fa; border-radius:8px; border:1px solid #c8dde8; display:flex; align-items:center; justify-content:center; font-size:18px; flex-shrink:0; margin-top:1px; }
  .tip-title { font-family:'Playfair Display',serif; font-size:15px; font-weight:700; color:#1a1e21; margin-bottom:3px; }
  .tip-desc { font-size:13px; color:#7a8490; font-weight:300; line-height:1.6; }
  .tip-desc strong { color:#3d464e; font-weight:600; }
  .tip-desc a { color:#004e6d !important; text-decoration:none !important; font-weight:500; }
  .nudge { background:#f7ede0; border:1px solid #e0c0a0; border-left:4px solid #c4956a; border-radius:0 8px 8px 0; padding:18px 20px; margin-bottom:32px; }
  .nudge-tag { font-family:'DM Mono',monospace; font-size:9px; letter-spacing:2px; text-transform:uppercase; color:#8B5E3C; margin-bottom:6px; display:flex; align-items:center; gap:6px; }
  .nudge-tag::before { content:''; width:5px; height:5px; border-radius:50%; background:#c4956a; flex-shrink:0; }
  .nudge-title { font-family:'Playfair Display',serif; font-size:15px; font-weight:700; color:#1a1e21; margin-bottom:5px; }
  .nudge-desc { font-size:13px; color:#4a3020; font-weight:300; line-height:1.6; }
  .stats { display:table; width:100%; background:#004e6d; border-radius:10px; overflow:hidden; margin-bottom:32px; }
  .stat { display:table-cell; padding:20px 16px; text-align:center; border-right:1px solid rgba(255,255,255,0.08); vertical-align:middle; }
  .stat:last-child { border-right:none; }
  .sv { font-family:'Playfair Display',serif; font-size:22px; font-weight:900; color:#c4956a; display:block; line-height:1; margin-bottom:5px; }
  .sl { font-family:'DM Mono',monospace; font-size:9px; letter-spacing:1.5px; text-transform:uppercase; color:rgba(255,255,255,0.38); display:block; line-height:1.3; }
  .divider { border:none; border-top:1px solid #e8edf0; margin:28px 0; }
  .cta-wrap { text-align:center; margin-bottom:32px; }
  .cta-p { display:inline-block; background:#004e6d; color:#fff !important; text-decoration:none !important; font-family:'Source Serif 4',Georgia,serif; font-size:15px; font-weight:600; padding:15px 30px; border-radius:6px; margin-right:10px; }
  .cta-s { display:inline-block; border:1px solid #d4dde3; color:#3d464e !important; text-decoration:none !important; font-family:'Source Serif 4',Georgia,serif; font-size:15px; font-weight:400; padding:15px 30px; border-radius:6px; }
  .signoff p { font-size:15px; color:#3d464e; font-weight:300; line-height:1.8; margin-bottom:14px; }
  .sn { font-family:'Playfair Display',serif; font-size:16px; font-weight:700; color:#1a1e21; margin-bottom:2px; }
  .sr { font-size:13px; color:#7a8490; font-weight:300; font-style:italic; }
  .footer { background:#f2f6f8; border-top:1px solid #e0e8ec; padding:22px 48px; }
  .fl { font-family:'Playfair Display',serif; font-size:13px; font-weight:700; color:#004e6d; margin-bottom:8px; }
  .footer-links { margin-bottom:10px; }
  .footer-links a { font-family:'DM Mono',monospace; font-size:11px; color:#7a8490 !important; text-decoration:none !important; margin-right:14px; }
  .fs { font-size:11px; color:#b0b8c0; font-weight:300; line-height:1.6; }
  .fs a { color:#b0b8c0 !important; text-decoration:underline !important; }
  @media only screen and (max-width:640px) {
    .email-wrap { margin:0; border-radius:0; }
    .hi { padding:28px 24px 32px; }
    .body { padding:28px 24px; }
    .header h1 { font-size:26px; }
    .lc { flex-direction:column; align-items:stretch; }
    .lc-thumb { width:100%; height:70px; }
    .stats, .stat { display:block; }
    .stat { border-right:none; border-bottom:1px solid rgba(255,255,255,0.08); }
    .stat:last-child { border-bottom:none; }
    .si-action { display:none; }
    .footer { padding:20px 24px; }
    .cta-s { display:none; }
  }
</style>
</head>
<body>
<div style="background:#f0ece4;padding:20px 0;">
<div class="email-wrap">
  <div class="header">
    <div class="hx"></div>
    <div class="hg1"></div>
    <div class="hg2"></div>
    <div class="hi">
      <div class="logo-row">
        <div class="logo-img"><img src="${urls.logo}" alt="The Reclaimed Company" style="display:block;max-height:38px;max-width:200px;width:auto;border:0" /></div>
        <div class="lt">The Reclaimed Company<span>Marketplace</span></div>
      </div>
      <div class="live-pill">
        <div class="live-dot"></div>
        <div class="live-text">Live now</div>
      </div>
      <h1>Your listing<br>is <em>live.</em></h1>
      <div class="lc">
        <div class="lc-thumb">${input.thumbInner}</div>
        <div>
          <div class="lc-title">${input.titleHtml}</div>
          <div class="lc-meta">${input.categoryHtml} · ${input.dateStr} at ${input.timeStr}</div>
          <div>
            <span class="lc-price">${input.priceLineHtml}</span>
            <span class="lc-id">${input.idLabelHtml}</span>
          </div>
        </div>
      </div>
      <a href="${urls.listing}" class="view-btn">View your listing →</a>
    </div>
  </div>
  <div class="body">
    <p class="intro">Your piece is now live and appearing in search results across The Reclaimed Company Marketplace. Buyers searching for <strong>${input.categoryHtml}</strong> can find it right now. Here's how to give it the best possible chance of selling quickly.</p>
    <div class="slabel">Share your listing — reach more buyers</div>
    <div class="url-box">
      <div class="url-lbl">Your link</div>
      <div class="url-val">${input.publicUrlDisplayHtml}</div>
    </div>
    <div class="share-wrap">
      <div class="share-item">
        <div class="si-icon">📸</div>
        <div class="si-body">
          <div class="si-title">Share on Instagram</div>
          <div class="si-desc">Post a photograph and drop your listing link in your bio or story. Tag <a href="${urls.insta}">@thereclaimedcompany</a> — we regularly reshare pieces we love to our audience.</div>
        </div>
        <div class="si-action"><a href="https://www.instagram.com" class="si-btn" target="_blank" rel="noopener noreferrer">Share</a></div>
      </div>
      <div class="share-item">
        <div class="si-icon">👥</div>
        <div class="si-body">
          <div class="si-title">Post in Facebook groups</div>
          <div class="si-desc">Reclaimed and antique pieces perform strongly in local Facebook renovation, interiors, and salvage groups. Paste your listing link directly into a post with your best photograph.</div>
        </div>
        <div class="si-action"><a href="${urls.facebook}" class="si-btn" target="_blank" rel="noopener noreferrer">Share</a></div>
      </div>
      <div class="share-item">
        <div class="si-icon">📌</div>
        <div class="si-body">
          <div class="si-title">Pin it on Pinterest</div>
          <div class="si-desc">Antiques, lighting, and salvage have a large, active Pinterest audience. A well-photographed piece pinned to a relevant board can drive traffic for months after listing.</div>
        </div>
        <div class="si-action"><a href="${urls.pinterest}" class="si-btn" target="_blank" rel="noopener noreferrer">Pin</a></div>
      </div>
      <div class="share-item">
        <div class="si-icon">✉️</div>
        <div class="si-body">
          <div class="si-title">Send it directly</div>
          <div class="si-desc">Know a designer, an architect, or a friend doing up a house? A direct message to the right person still converts better than any algorithm. Share the link personally.</div>
        </div>
        <div class="si-action"><a href="${urls.mailto}" class="si-btn">Send</a></div>
      </div>
    </div>
    <div class="slabel">Tips to help your listing sell faster</div>
    <div>
      <div class="tip">
        <div class="tip-icon">📷</div>
        <div>
          <div class="tip-title">Add more photographs if you can</div>
          <div class="tip-desc">Listings with five or more photographs sell significantly faster than those with one or two. <strong>Natural daylight beats flash every time.</strong> Show the top surface, the sides, the back, close-up details of handles or grain, and any condition marks. Buyers who can see everything trust the listing — and trust is what converts at the last moment of hesitation. <a href="${urls.edit}">Add photographs now →</a></div>
        </div>
      </div>
      <div class="tip">
        <div class="tip-icon">📐</div>
        <div>
          <div class="tip-title">Confirm all three dimensions</div>
          <div class="tip-desc">Width, depth, and height — all three, in centimetres. <strong>Depth is the measurement buyers most often need and most often cannot find.</strong> Dimension issues are the most common reason for returns and disputes. If they are not in your listing, <a href="${urls.edit}">edit it now.</a></div>
        </div>
      </div>
      <div class="tip">
        <div class="tip-icon">📝</div>
        <div>
          <div class="tip-title">Describe the condition honestly</div>
          <div class="tip-desc">Buyers of reclaimed and antique pieces <strong>expect wear</strong> — they are not looking for perfection. What they want is the truth about what is there. A ring mark you describe in the listing is character. A ring mark the buyer discovers on arrival is a complaint. Honesty builds confidence and prevents disputes.</div>
        </div>
      </div>
      <div class="tip">
        <div class="tip-icon">🚚</div>
        <div>
          <div class="tip-title">Be clear about delivery</div>
          <div class="tip-desc">Pieces with clear, specific delivery options get significantly more enquiries than those where the buyer has to ask. Can you post it? Is it collection only? Will you use a courier? If offering collection, include your nearest town. <strong>Never include your full address</strong> in a public listing — share it only when a sale is confirmed.</div>
        </div>
      </div>
      <div class="tip">
        <div class="tip-icon">💬</div>
        <div>
          <div class="tip-title">Respond to enquiries within a few hours</div>
          <div class="tip-desc">Buyers who enquire and do not hear back quickly move on to the next listing. <strong>Turn on notifications</strong> in your account settings so you never miss a message. A fast, specific reply converts far more often than a slow, vague one — even if the buyer has to wait a day, a quick acknowledgement keeps them engaged.</div>
        </div>
      </div>
      <div class="tip">
        <div class="tip-icon">🔍</div>
        <div>
          <div class="tip-title">Use specific words in your title</div>
          <div class="tip-desc">Buyers search for <strong>period, material, and item type</strong> — "Victorian pine sideboard", "reclaimed oak beam", "Art Deco ceiling light". Vague titles like "beautiful vintage piece" do not appear in the searches buyers are actually running. Specificity is searchability. If your title is vague, <a href="${urls.edit}">sharpen it now.</a></div>
        </div>
      </div>
      <div class="tip">
        <div class="tip-icon">💷</div>
        <div>
          <div class="tip-title">Price it to attract — not to start negotiating</div>
          <div class="tip-desc">A listing priced 20% too high will sit. A listing priced fairly with excellent photographs and an honest description will sell. If you are unsure of the right price, <strong>search for comparable pieces</strong> on the marketplace and price to match the best examples — not the wishful ones.</div>
        </div>
      </div>
    </div>
${nudge}
    <div class="stats">
      <div class="stat"><span class="sv">10%</span><span class="sl">Commission<br>on sale</span></div>
      <div class="stat"><span class="sv">£0</span><span class="sl">Cost to<br>list</span></div>
      <div class="stat"><span class="sv">Live</span><span class="sl">In search<br>right now</span></div>
      <div class="stat"><span class="sv">24hr</span><span class="sl">Respond to<br>enquiries</span></div>
    </div>
    <hr class="divider">
    <div class="cta-wrap">
      <a href="${urls.listing}" class="cta-p">View Your Live Listing →</a>
      <a href="${urls.edit}" class="cta-s">Edit listing</a>
    </div>
    <hr class="divider">
    <div class="signoff">
      <p>If you have any questions — about your listing, pricing, photography, or delivery — just reply to this email. We're here and we read every reply.</p>
      <p>Good luck. We hope it finds exactly the right home.</p>
      <div class="sn">The Reclaimed Company Team</div>
      <div class="sr">thereclaimedcompany.com</div>
    </div>
  </div>
  <div class="footer">
    <div class="fl">The Reclaimed Company®</div>
    <div class="footer-links">
      <a href="${urls.home}">Marketplace</a>
      <a href="${urls.search}">Browse</a>
      <a href="${urls.dealers}">Dealers</a>
      <a href="${urls.legal}">Legal Hub</a>
    </div>
    <div class="fs">
      Listing ${input.idLabelHtml} · Published ${input.dateStr} at ${input.timeStr}<br>
      © ${y} The Reclaimed Company 05769679 · All Rights Reserved.<br>
      <a href="${urls.unsubscribe}">Unsubscribe from listing notifications</a> · <a href="${urls.privacy}">Privacy Policy</a>
    </div>
  </div>
</div>
</div>
</body>
</html>`;
}

/**
 * When a listing first becomes live on the marketplace, email the seller. No-op if SMTP not configured.
 */
export async function trySendListingLiveEmail(listingId: string, sellerId: string): Promise<boolean> {
  const smtpHost = process.env.SMTP_HOST?.trim() || "smtp.thereclaimedcompany.com";
  const smtpPort = parseInt(process.env.SMTP_PORT?.trim() || "465", 10);
  const smtpSecure = String(process.env.SMTP_SECURE ?? "true").trim().toLowerCase() !== "false";
  const smtpUser = process.env.SMTP_USER?.trim();
  const smtpPass = process.env.SMTP_PASS?.trim();
  if (!smtpUser || !smtpPass) return false;

  const [listing, user] = await Promise.all([
    prisma.listing.findUnique({
      where: { id: listingId },
      include: { category: { select: { name: true } } },
    }),
    prisma.user.findUnique({ where: { id: sellerId }, select: { email: true } }),
  ]);

  if (!listing || !user?.email) return false;
  if (listing.status !== "active" || !listing.visibleOnMarketplace) return false;

  const from =
    process.env.MAIL_FROM?.trim() ||
    process.env.SMTP_FROM?.trim() ||
    "Reclaimed Marketplace <nowthen@thereclaimedcompany.com>";

  const base = getSiteBaseUrl();
  const listingUrl = `${base}/listings/${listing.id}`;
  const editUrl = `${base}/dashboard/listings/${listing.id}/edit`;
  const listingUrlEnc = encodeURIComponent(listingUrl);
  const mailtoHref = `mailto:?subject=${encodeURIComponent("Thought you might like this")}&body=${encodeURIComponent(
    `I thought you might like this listing on The Reclaimed Company: ${listingUrl}\n\n`
  )}`;

  const urls = {
    logo: `${base}/images/the-reclaimed-company-logo.png`,
    listing: listingUrl,
    edit: editUrl,
    facebook: `https://www.facebook.com/sharer/sharer.php?u=${listingUrlEnc}`,
    pinterest: `https://pinterest.com/pin/create/button/?url=${listingUrlEnc}`,
    mailto: mailtoHref,
    home: base,
    search: `${base}/search`,
    dealers: `${base}/dealers`,
    legal: `${base}/legal-hub`,
    insta: "https://www.instagram.com/thereclaimedcompany",
    privacy: `${base}/legal-hub`,
    unsubscribe: `${base}/dashboard/notifications`,
  };

  const now = new Date();
  const { dateStr, timeStr } = formatPublishedLondon(now);
  const categoryName = listing.category?.name?.trim() || "Reclaimed & vintage";
  const categoryHtml = escapeHtml(categoryName);
  const titleHtml = escapeHtml(listing.title.trim() || "Your listing");
  const priceLineHtml = escapeHtml(
    formatListingPriceLine(listing.price, listing.listingKind, listing.freeToCollector)
  );
  const idShort = listing.id.slice(0, 8);
  const idLabelHtml = escapeHtml(`#${idShort.toUpperCase()}`);

  let publicUrlDisplay: string;
  try {
    const u = new URL(listingUrl);
    publicUrlDisplay = `${u.host}${u.pathname}${u.search}`;
  } catch {
    publicUrlDisplay = listingUrl.replace(/^https?:\/\//, "");
  }
  const publicUrlDisplayHtml = escapeHtml(publicUrlDisplay);

  const firstImage = listing.images?.[0];
  const thumbInner = buildThumbInner(firstImage);

  const showPassportNudge =
    !listing.freeToCollector && listing.price > PASSPORT_THRESHOLD_PENCE;

  const html = buildListingLiveHtml({
    titleHtml,
    categoryHtml,
    dateStr,
    timeStr,
    priceLineHtml,
    idLabelHtml,
    publicUrlDisplayHtml,
    thumbInner,
    showPassportNudge,
    urls,
  });

  const idPlain = `#${idShort.toUpperCase()}`;
  const text = [
    `Your listing is live: ${listing.title.trim()}`,
    `Category: ${categoryName} · ${dateStr} at ${timeStr}`,
    `${formatListingPriceLine(listing.price, listing.listingKind, listing.freeToCollector)} · ${idPlain}`,
    "",
    `View: ${listingUrl}`,
    `Edit: ${editUrl}`,
    "",
    "Share your listing link to reach more buyers — good luck!",
    "The Reclaimed Company Team",
  ].join("\n");

  try {
    const transport = nodemailer.createTransport({
      host: smtpHost,
      port: Number.isFinite(smtpPort) ? smtpPort : 465,
      secure: smtpSecure,
      auth: { user: smtpUser, pass: smtpPass },
    });

    await transport.sendMail({
      from,
      to: user.email,
      subject: `Your listing is live: ${listing.title.trim().slice(0, 60)}${listing.title.trim().length > 60 ? "…" : ""}`,
      text,
      html,
    });
    return true;
  } catch (err) {
    console.error("[listing-live-email]", err);
    return false;
  }
}

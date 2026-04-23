import nodemailer from "nodemailer";
import { getSiteBaseUrl } from "@/lib/site-url";

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function firstNameFromNameOrDisplay(name: string | null | undefined, displayName: string): string {
  const raw = (name?.trim() || displayName.trim() || "there") as string;
  const w = raw.split(/\s+/)[0] ?? raw;
  return w.length > 0 ? w : "there";
}

function buildGeneralSellerWelcomeHtml(input: { firstNameHtml: string; urls: Record<string, string> }): string {
  const { firstNameHtml, urls } = input;
  const y = new Date().getFullYear();
  return `<!DOCTYPE html>
<html lang="en" xmlns="http://www.w3.org/1999/xhtml">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<meta http-equiv="X-UA-Compatible" content="IE=edge">
<title>Welcome to The Reclaimed Company — You're Live</title>
<link href="https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,700;0,900;1,400&family=Source+Serif+4:wght@300;400;600&family=DM+Mono:wght@400;500&display=swap" rel="stylesheet">
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { background: #f0ece4; font-family: 'Source Serif 4', Georgia, serif; -webkit-font-smoothing: antialiased; }
  .email-wrap {
    max-width: 620px;
    margin: 40px auto;
    background: #ffffff;
    border-radius: 4px;
    overflow: hidden;
    box-shadow: 0 4px 40px rgba(0,0,0,0.10);
  }
  .header {
    background: #1a1e21;
    padding: 0;
    position: relative;
    overflow: hidden;
  }
  .header-texture {
    position: absolute; inset: 0;
    background:
      repeating-linear-gradient(45deg,transparent,transparent 30px,rgba(255,255,255,0.012) 30px,rgba(255,255,255,0.012) 31px),
      repeating-linear-gradient(-45deg,transparent,transparent 30px,rgba(255,255,255,0.008) 30px,rgba(255,255,255,0.008) 31px);
    pointer-events: none;
  }
  .header-glow-left {
    position: absolute; bottom: -80px; left: -60px;
    width: 280px; height: 280px; border-radius: 50%;
    background: radial-gradient(circle, rgba(0,78,109,0.35) 0%, transparent 70%);
    pointer-events: none;
  }
  .header-glow-right {
    position: absolute; top: -40px; right: -40px;
    width: 200px; height: 200px; border-radius: 50%;
    background: radial-gradient(circle, rgba(196,149,106,0.12) 0%, transparent 70%);
    pointer-events: none;
  }
  .header-inner {
    position: relative; z-index: 1;
    padding: 40px 48px 40px;
  }
  .logo-area {
    display: flex;
    align-items: center;
    gap: 12px;
    margin-bottom: 36px;
    padding-bottom: 24px;
    border-bottom: 1px solid rgba(255,255,255,0.1);
  }
  .logo-mark { flex-shrink: 0; }
  .logo-mark img {
    display: block;
    max-height: 40px;
    max-width: 200px;
    width: auto;
    height: auto;
    border: 0;
  }
  .logo-text {
    font-family: 'Source Serif 4', Georgia, serif;
    font-size: 15px; font-weight: 600;
    color: rgba(255,255,255,0.9);
    line-height: 1.2;
  }
  .logo-text span {
    display: block;
    font-size: 10px;
    font-weight: 300;
    color: rgba(255,255,255,0.4);
    letter-spacing: 2px;
    text-transform: uppercase;
    font-family: 'DM Mono', monospace;
    margin-top: 2px;
  }
  .header-eyebrow {
    font-family: 'DM Mono', monospace;
    font-size: 10px; letter-spacing: 3px;
    text-transform: uppercase;
    color: #c4956a;
    margin-bottom: 14px;
    display: flex; align-items: center; gap: 8px;
  }
  .header-eyebrow::before {
    content: '';
    display: inline-block;
    width: 20px; height: 1px;
    background: #c4956a;
  }
  .header h1 {
    font-family: 'Playfair Display', serif;
    font-size: 34px; font-weight: 900;
    color: #ffffff;
    line-height: 1.1;
    letter-spacing: -1px;
    margin-bottom: 16px;
  }
  .header h1 em { color: #c4956a; font-style: normal; }
  .header-sub {
    font-size: 15px;
    color: rgba(255,255,255,0.6);
    font-weight: 300;
    line-height: 1.75;
    font-style: italic;
    max-width: 440px;
    margin-bottom: 28px;
  }
  .seller-banner {
    background: rgba(196,149,106,0.15);
    border: 1px solid rgba(196,149,106,0.25);
    border-radius: 6px;
    padding: 14px 18px;
    display: inline-flex;
    align-items: center;
    gap: 10px;
  }
  .seller-banner-dot {
    width: 8px; height: 8px;
    border-radius: 50%;
    background: #c4956a;
    flex-shrink: 0;
  }
  .seller-banner-text {
    font-family: 'DM Mono', monospace;
    font-size: 11px; letter-spacing: 1px;
    color: #c4956a;
  }
  .seller-banner-name { font-weight: 500; color: rgba(255,255,255,0.85); }
  .body {
    padding: 44px 48px 36px;
    background: #ffffff;
  }
  .greeting {
    font-family: 'Playfair Display', serif;
    font-size: 20px; font-weight: 700;
    color: #1a1e21;
    margin-bottom: 16px;
  }
  .intro-text {
    font-size: 16px;
    color: #3d464e;
    font-weight: 300;
    line-height: 1.8;
    margin-bottom: 32px;
  }
  .intro-text strong { color: #1a1e21; font-weight: 600; }
  .section-title {
    font-family: 'DM Mono', monospace;
    font-size: 10px; letter-spacing: 3px;
    text-transform: uppercase;
    color: #7a8490;
    margin-bottom: 20px;
    padding-bottom: 12px;
    border-bottom: 1px solid #e8edf0;
  }
  .categories { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 32px; }
  .cat-pill {
    background: #f2f6f8;
    border: 1px solid #d4dde3;
    border-radius: 20px;
    padding: 6px 14px;
    font-size: 13px;
    color: #3d464e;
    font-weight: 300;
  }
  .cat-pill.highlight {
    background: #eef6fa;
    border-color: #9ec4d6;
    color: #004e6d;
    font-weight: 500;
  }
  .steps { margin-bottom: 36px; }
  .step {
    display: flex;
    gap: 16px;
    align-items: flex-start;
    margin-bottom: 20px;
    padding-bottom: 20px;
    border-bottom: 1px solid #f2f5f7;
  }
  .step:last-child { border-bottom: none; margin-bottom: 0; padding-bottom: 0; }
  .step-num {
    width: 32px; height: 32px;
    border-radius: 50%;
    background: #eef6fa;
    border: 2px solid #004e6d;
    color: #004e6d;
    font-family: 'DM Mono', monospace;
    font-size: 12px; font-weight: 500;
    display: flex; align-items: center; justify-content: center;
    flex-shrink: 0;
    margin-top: 2px;
  }
  .step-title {
    font-family: 'Playfair Display', serif;
    font-size: 16px; font-weight: 700;
    color: #1a1e21;
    margin-bottom: 4px;
  }
  .step-desc {
    font-size: 14px;
    color: #7a8490;
    font-weight: 300;
    line-height: 1.6;
  }
  .commission-block {
    background: #1a1e21;
    border-radius: 10px;
    padding: 28px 32px;
    margin-bottom: 32px;
    position: relative;
    overflow: hidden;
  }
  .commission-block::before {
    content: '';
    position: absolute; top: -50px; right: -30px;
    width: 180px; height: 180px; border-radius: 50%;
    background: radial-gradient(circle, rgba(0,78,109,0.4) 0%, transparent 70%);
    pointer-events: none;
  }
  .commission-inner {
    position: relative; z-index: 1;
    display: flex;
    align-items: center;
    gap: 24px;
  }
  .commission-num {
    font-family: 'Playfair Display', serif;
    font-size: 52px; font-weight: 900;
    color: #c4956a;
    line-height: 1;
    flex-shrink: 0;
  }
  .commission-title {
    font-family: 'Playfair Display', serif;
    font-size: 18px; font-weight: 700;
    color: #ffffff;
    margin-bottom: 6px;
    line-height: 1.2;
  }
  .commission-desc {
    font-size: 13px;
    color: rgba(255,255,255,0.55);
    font-weight: 300;
    line-height: 1.6;
  }
  .threshold {
    background: #f2f6f8;
    border-radius: 10px;
    padding: 20px 24px;
    margin-bottom: 32px;
  }
  .threshold-title {
    font-family: 'Playfair Display', serif;
    font-size: 15px; font-weight: 700;
    color: #1a1e21;
    margin-bottom: 12px;
  }
  .threshold-row {
    display: flex;
    gap: 10px;
    margin-bottom: 10px;
    align-items: flex-start;
  }
  .threshold-row:last-child { margin-bottom: 0; }
  .threshold-badge {
    font-family: 'DM Mono', monospace;
    font-size: 10px; letter-spacing: 1px;
    padding: 3px 9px;
    border-radius: 10px;
    white-space: nowrap;
    flex-shrink: 0;
    margin-top: 1px;
  }
  .threshold-badge.under {
    background: #e8f4ee;
    color: #2d6e50;
    border: 1px solid #b8d4c0;
  }
  .threshold-badge.over {
    background: #eef6fa;
    color: #004e6d;
    border: 1px solid #9ec4d6;
  }
  .threshold-desc {
    font-size: 13px;
    color: #3d464e;
    font-weight: 300;
    line-height: 1.6;
  }
  .features { margin-bottom: 32px; }
  .feature-card {
    border: 1px solid #d4dde3;
    border-left: 4px solid #004e6d;
    border-radius: 0 8px 8px 0;
    padding: 18px 20px;
    margin-bottom: 12px;
    background: #eef6fa;
  }
  .feature-card:last-child { margin-bottom: 0; }
  .feature-card.accent {
    background: #f7ede0;
    border-color: #e0c0a0;
    border-left-color: #c4956a;
  }
  .feature-tag {
    font-family: 'DM Mono', monospace;
    font-size: 9px; letter-spacing: 2px;
    text-transform: uppercase;
    color: #005f85;
    margin-bottom: 6px;
    display: flex; align-items: center; gap: 6px;
  }
  .feature-tag::before {
    content: '';
    display: inline-block;
    width: 5px; height: 5px;
    border-radius: 50%;
    background: #004e6d;
    flex-shrink: 0;
  }
  .feature-tag.accent-tag { color: #8B5E3C; }
  .feature-tag.accent-tag::before { background: #c4956a; }
  .feature-title {
    font-family: 'Playfair Display', serif;
    font-size: 16px; font-weight: 700;
    color: #1a1e21;
    margin-bottom: 6px;
  }
  .feature-desc {
    font-size: 14px;
    color: #3d464e;
    font-weight: 300;
    line-height: 1.6;
  }
  .tip-block {
    background: #fdf3e0;
    border: 1px solid #e8c97a;
    border-left: 4px solid #D4830A;
    border-radius: 0 8px 8px 0;
    padding: 16px 20px;
    margin-bottom: 32px;
  }
  .tip-title {
    font-family: 'DM Mono', monospace;
    font-size: 9px; letter-spacing: 2px;
    text-transform: uppercase;
    color: #8B5E00;
    margin-bottom: 6px;
  }
  .tip-text {
    font-size: 14px;
    color: #4a3200;
    font-style: italic;
    font-weight: 300;
    line-height: 1.6;
  }
  .cta-wrap { text-align: center; margin-bottom: 36px; }
  .cta-btn {
    display: inline-block;
    background: #004e6d;
    color: #ffffff !important;
    text-decoration: none !important;
    font-family: 'Source Serif 4', Georgia, serif;
    font-size: 15px; font-weight: 600;
    padding: 16px 36px;
    border-radius: 6px;
    letter-spacing: 0.2px;
  }
  .cta-sub {
    display: block;
    margin-top: 12px;
    font-size: 13px;
    color: #7a8490;
    font-style: italic;
    font-weight: 300;
  }
  .divider { border: none; border-top: 1px solid #e8edf0; margin: 32px 0; }
  .signoff p {
    font-size: 15px;
    color: #3d464e;
    font-weight: 300;
    line-height: 1.8;
    margin-bottom: 16px;
  }
  .signoff-name {
    font-family: 'Playfair Display', serif;
    font-size: 16px; font-weight: 700;
    color: #1a1e21;
    margin-bottom: 2px;
  }
  .signoff-title {
    font-size: 13px;
    color: #7a8490;
    font-weight: 300;
    font-style: italic;
  }
  .footer {
    background: #f2f6f8;
    border-top: 1px solid #e0e8ec;
    padding: 24px 48px;
  }
  .footer-logo {
    font-family: 'Playfair Display', serif;
    font-size: 13px; font-weight: 700;
    color: #004e6d;
    margin-bottom: 8px;
  }
  .footer-links { margin-bottom: 12px; }
  .footer-links a {
    font-family: 'DM Mono', monospace;
    font-size: 11px;
    color: #7a8490 !important;
    text-decoration: none !important;
    margin-right: 16px;
  }
  .footer-small {
    font-size: 11px;
    color: #b0b8c0;
    font-weight: 300;
    line-height: 1.6;
  }
  .footer-small a { color: #b0b8c0 !important; text-decoration: underline !important; }
  @media only screen and (max-width: 640px) {
    .email-wrap { margin: 0; border-radius: 0; }
    .header-inner { padding: 32px 24px 32px; }
    .body { padding: 32px 24px 28px; }
    .header h1 { font-size: 26px; }
    .commission-inner { flex-direction: column; gap: 12px; }
    .commission-num { font-size: 40px; }
    .footer { padding: 20px 24px; }
    .categories { gap: 6px; }
  }
</style>
</head>
<body>
<div style="background:#f0ece4;padding:20px 0;">
<div class="email-wrap">
  <div class="header">
    <div class="header-texture"></div>
    <div class="header-glow-left"></div>
    <div class="header-glow-right"></div>
    <div class="header-inner">
      <div class="logo-area">
        <div class="logo-mark">
          <img src="${urls.logo}" alt="The Reclaimed Company" style="display:block;max-height:40px;max-width:200px;width:auto;height:auto;border:0" />
        </div>
        <div class="logo-text">
          The Reclaimed Company
          <span>Marketplace</span>
        </div>
      </div>
      <div class="header-eyebrow">You're now selling</div>
      <h1>Your piece.<br>The right <em>buyer.</em><br>Found.</h1>
      <p class="header-sub">You've just listed on the UK's dedicated marketplace for reclaimed, salvaged, antique, and vintage pieces — where buyers come specifically looking for what you have.</p>
      <div class="seller-banner">
        <div class="seller-banner-dot"></div>
        <div class="seller-banner-text">Seller account active — <span class="seller-banner-name">${firstNameHtml}</span></div>
      </div>
    </div>
  </div>
  <div class="body">
    <div class="greeting">Welcome — great to have you here.</div>
    <p class="intro-text">
      Whether you're clearing a house, selling a single piece you've held onto for years, or listing stock regularly as a dealer — The Reclaimed Company connects you with buyers who are actively searching for exactly the kind of thing you're selling.<br><br>
      <strong>No listing fees. No subscriptions. No technical setup.</strong> Add your piece, set your price, and we do the rest.
    </p>
    <div class="section-title">What sells on The Reclaimed Company</div>
    <div class="categories">
      <span class="cat-pill highlight">Antique furniture</span>
      <span class="cat-pill highlight">Vintage lighting</span>
      <span class="cat-pill highlight">Reclaimed timber</span>
      <span class="cat-pill highlight">Architectural salvage</span>
      <span class="cat-pill">Rugs &amp; textiles</span>
      <span class="cat-pill">Fireplaces &amp; surrounds</span>
      <span class="cat-pill">Garden &amp; stonework</span>
      <span class="cat-pill">Railway sleepers</span>
      <span class="cat-pill">Reclaimed bricks &amp; tiles</span>
      <span class="cat-pill">Decorative pieces</span>
      <span class="cat-pill">Doors &amp; windows</span>
      <span class="cat-pill">Mid-century pieces</span>
    </div>
    <div class="section-title">How it works</div>
    <div class="steps">
      <div class="step">
        <div class="step-num">1</div>
        <div class="step-content">
          <div class="step-title">List your piece</div>
          <div class="step-desc">Add photographs, a title, a price, and a description. Good photographs make the biggest difference — natural light, multiple angles, and any condition details clearly shown. Your listing goes live immediately.</div>
        </div>
      </div>
      <div class="step">
        <div class="step-num">2</div>
        <div class="step-content">
          <div class="step-title">Buyers find you</div>
          <div class="step-desc">Your listing appears in search results, category pages, and our SEO-optimised blog content that ranks for the exact terms buyers use. You don't need to market your listing — we do that through the platform.</div>
        </div>
      </div>
      <div class="step">
        <div class="step-num">3</div>
        <div class="step-content">
          <div class="step-title">Enquiries or direct checkout</div>
          <div class="step-desc">Pieces under £2,500 go straight to checkout — fast and frictionless. Pieces above £2,500 open a Private Deal Thread where the buyer can ask questions and confirm details before you present the final deal. More on that below.</div>
        </div>
      </div>
      <div class="step">
        <div class="step-num">4</div>
        <div class="step-content">
          <div class="step-title">Get paid</div>
          <div class="step-desc">Payment is processed securely through the platform by Stripe. Funds are released to your account once the sale is confirmed. We take 10% commission. You keep 90%.</div>
        </div>
      </div>
    </div>
    <div class="commission-block">
      <div class="commission-inner">
        <div class="commission-num">10%</div>
        <div>
          <div class="commission-title">Commission only when you sell</div>
          <div class="commission-desc">No listing fees. No monthly subscriptions. No upfront cost of any kind. We take 10% at the point of sale — you keep everything else. List as many pieces as you like for free.</div>
        </div>
      </div>
    </div>
    <div class="threshold">
      <div class="threshold-title">Under or over £2,500 — different experiences</div>
      <div class="threshold-row">
        <span class="threshold-badge under">Under £2,500</span>
        <div class="threshold-desc">Direct checkout — buyer sees your listing, adds to basket, pays. Fast and frictionless. You confirm the order and arrange delivery.</div>
      </div>
      <div class="threshold-row">
        <span class="threshold-badge over">£2,500 and above</span>
        <div class="threshold-desc">Private Deal Thread — buyer enquires, you answer questions and confirm details, then present the final deal including shipping as one agreed total. More on this below.</div>
      </div>
    </div>
    <div class="section-title">Two things unique to The Reclaimed Company</div>
    <div class="features">
      <div class="feature-card">
        <div class="feature-tag">Pieces above £2,500</div>
        <div class="feature-title">The Private Deal Thread</div>
        <div class="feature-desc">For every significant piece, buying happens through a secure private conversation between you and the buyer — hosted entirely on our platform. They enquire, ask questions, request additional photographs. You answer and confirm details. When you're both ready, you present the final deal — piece price plus shipping — as one agreed total. They pay within the thread. Everything is permanently recorded. No PayPal links. No off-platform messages. No disputes about what was agreed.</div>
      </div>
      <div class="feature-card accent">
        <div class="feature-tag accent-tag">Automatic on qualifying sales</div>
        <div class="feature-title">The Piece Passport</div>
        <div class="feature-desc">Every sale above £2,500 automatically generates a Piece Passport — a beautiful, co-signed provenance record issued to the buyer in both physical and digital format. It documents the piece's history, provenance as you declared it, the transaction value, and ownership. Your name is part of the permanent record of that piece. When the buyer eventually resells, the Piece Passport travels with the piece — and your listing is its first chapter. No other UK marketplace offers this.</div>
      </div>
    </div>
    <div class="tip-block">
      <div class="tip-title">A tip from us</div>
      <div class="tip-text">The single biggest difference between a listing that sells quickly and one that sits is photography. Natural daylight, a clean background, and four or five honest angles — including any condition marks — converts buyers who would otherwise hesitate. Show everything and they'll trust you. Hide something and they'll wonder what else you're not showing.</div>
    </div>
    <hr class="divider">
    <div class="cta-wrap">
      <a href="${urls.ctaListing}" class="cta-btn">Add Your First Listing →</a>
      <span class="cta-sub">Goes live immediately. No review delay. No approval queue.</span>
    </div>
    <hr class="divider">
    <div class="signoff">
      <p>If you have any questions at all — about listing, pricing, photography, delivery, or how the platform works — just reply to this email. We read every reply and we're here to help you make your first sale.</p>
      <p>Good luck with your first listing. We hope it finds exactly the right home.</p>
      <div class="signoff-name">The Reclaimed Company Team</div>
      <div class="signoff-title">thereclaimedcompany.com</div>
    </div>
  </div>
  <div class="footer">
    <div class="footer-logo">The Reclaimed Company®</div>
    <div class="footer-links">
      <a href="${urls.home}">Marketplace</a>
      <a href="${urls.dealers}">Dealers</a>
      <a href="${urls.yards}">Yards</a>
      <a href="${urls.legal}">Legal Hub</a>
    </div>
    <div class="footer-small">
      You're receiving this because you registered as a seller on The Reclaimed Company Marketplace.<br>
      © ${y} The Reclaimed Company 05769679 · All Rights Reserved.<br>
      <a href="${urls.unsubscribe}">Unsubscribe</a> · <a href="${urls.privacy}">Privacy Policy</a>
    </div>
  </div>
</div>
</div>
</body>
</html>`;
}

/**
 * Welcome email for individual sellers and dealers (not reclamation yards). No-op if SMTP is not configured.
 */
export async function sendGeneralSellerWelcomeEmail(input: { toEmail: string; firstName: string }): Promise<boolean> {
  const smtpHost = process.env.SMTP_HOST?.trim() || "smtp.thereclaimedcompany.com";
  const smtpPort = parseInt(process.env.SMTP_PORT?.trim() || "465", 10);
  const smtpSecure = String(process.env.SMTP_SECURE ?? "true").trim().toLowerCase() !== "false";
  const smtpUser = process.env.SMTP_USER?.trim();
  const smtpPass = process.env.SMTP_PASS?.trim();
  if (!smtpUser || !smtpPass) return false;

  const from =
    process.env.MAIL_FROM?.trim() ||
    process.env.SMTP_FROM?.trim() ||
    "Reclaimed Marketplace <nowthen@thereclaimedcompany.com>";

  const base = getSiteBaseUrl();
  const urls = {
    logo: `${base}/images/the-reclaimed-company-logo.png`,
    ctaListing: `${base}/dashboard/sell`,
    home: base,
    dealers: `${base}/dealers`,
    yards: `${base}/reclamation-yards`,
    legal: `${base}/legal-hub`,
    privacy: `${base}/legal-hub`,
    unsubscribe: `${base}/dashboard/notifications`,
  };

  const firstNameDisplay = (input.firstName.trim() || "there") as string;
  const firstNameHtml = escapeHtml(firstNameDisplay);

  const html = buildGeneralSellerWelcomeHtml({ firstNameHtml, urls });
  const text = [
    `Welcome to The Reclaimed Company — you're live, ${firstNameDisplay}`,
    "",
    "You're now selling on the UK's dedicated marketplace for reclaimed, salvaged, antique, and vintage pieces.",
    "",
    "Add your first listing (no fees upfront):",
    urls.ctaListing,
    "",
    "Questions? Reply to this email.",
    "",
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
      to: input.toEmail,
      subject: "Welcome to The Reclaimed Company — you're live",
      text,
      html,
    });
    return true;
  } catch (err) {
    console.error("[general-seller-welcome-email]", err);
    return false;
  }
}

export function getSellerWelcomeFirstName(userName: string | null, displayName: string): string {
  return firstNameFromNameOrDisplay(userName, displayName);
}

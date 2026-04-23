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

function buildYardWelcomeHtml(input: { yardNameHtml: string; locationLineHtml: string; urls: Record<string, string> }): string {
  const { yardNameHtml, locationLineHtml, urls } = input;
  const y = new Date().getFullYear();
  return `<!DOCTYPE html>
<html lang="en" xmlns="http://www.w3.org/1999/xhtml">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<meta http-equiv="X-UA-Compatible" content="IE=edge">
<title>Welcome to The Reclaimed Company — Your Yard is Live</title>
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
    background: #003650;
    padding: 0;
    position: relative;
    overflow: hidden;
  }
  .header-texture {
    position: absolute; inset: 0;
    background:
      repeating-linear-gradient(90deg,transparent,transparent 60px,rgba(255,255,255,0.025) 60px,rgba(255,255,255,0.025) 61px),
      repeating-linear-gradient(0deg,transparent,transparent 60px,rgba(255,255,255,0.015) 60px,rgba(255,255,255,0.015) 61px);
    pointer-events: none;
  }
  .header-glow {
    position: absolute; top: -60px; right: -60px;
    width: 260px; height: 260px; border-radius: 50%;
    background: radial-gradient(circle, rgba(0,95,133,0.5) 0%, transparent 70%);
    pointer-events: none;
  }
  .header-inner {
    position: relative; z-index: 1;
    padding: 40px 48px 36px;
  }
  .logo-area {
    display: flex;
    align-items: center;
    gap: 12px;
    margin-bottom: 32px;
    padding-bottom: 24px;
    border-bottom: 1px solid rgba(255,255,255,0.12);
  }
  .logo-mark {
    flex-shrink: 0;
  }
  .logo-mark img {
    display: block;
    height: 40px;
    width: auto;
    max-width: 200px;
    border: 0;
    outline: none;
  }
  .logo-text {
    font-family: 'Source Serif 4', Georgia, serif;
    font-size: 15px; font-weight: 600;
    color: rgba(255,255,255,0.9);
    letter-spacing: 0.2px;
    line-height: 1.2;
  }
  .logo-text span {
    display: block;
    font-size: 10px;
    font-weight: 300;
    color: rgba(255,255,255,0.45);
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
    margin-bottom: 14px;
  }
  .header h1 em {
    color: #c4956a;
    font-style: normal;
  }
  .header-sub {
    font-size: 15px;
    color: rgba(255,255,255,0.65);
    font-weight: 300;
    line-height: 1.7;
    font-style: italic;
    max-width: 440px;
  }
  .yard-banner {
    background: #c4956a;
    padding: 16px 48px;
    display: flex;
    align-items: center;
    gap: 12px;
  }
  .yard-banner-label {
    font-family: 'DM Mono', monospace;
    font-size: 10px; letter-spacing: 2px;
    text-transform: uppercase;
    color: rgba(0,54,80,0.6);
  }
  .yard-banner-name {
    font-family: 'Playfair Display', serif;
    font-size: 17px; font-weight: 700;
    color: #003650;
    letter-spacing: -0.3px;
  }
  .yard-banner-divider {
    width: 1px; height: 20px;
    background: rgba(0,54,80,0.2);
  }
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
  .intro-text strong {
    color: #1a1e21;
    font-weight: 600;
  }
  .section-title {
    font-family: 'DM Mono', monospace;
    font-size: 10px; letter-spacing: 3px;
    text-transform: uppercase;
    color: #7a8490;
    margin-bottom: 20px;
    padding-bottom: 12px;
    border-bottom: 1px solid #e8edf0;
  }
  .steps {
    margin-bottom: 36px;
  }
  .step {
    display: flex;
    gap: 16px;
    align-items: flex-start;
    margin-bottom: 20px;
    padding-bottom: 20px;
    border-bottom: 1px solid #f2f5f7;
  }
  .step:last-child {
    border-bottom: none;
    margin-bottom: 0;
    padding-bottom: 0;
  }
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
  .features {
    margin-bottom: 36px;
  }
  .feature-card {
    background: #eef6fa;
    border: 1px solid #c8dde8;
    border-left: 4px solid #004e6d;
    border-radius: 0 8px 8px 0;
    padding: 18px 20px;
    margin-bottom: 12px;
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
  .feature-tag.accent-tag { color: #8B5E3C; }
  .feature-tag::before {
    content: '';
    display: inline-block;
    width: 5px; height: 5px;
    border-radius: 50%;
    background: #004e6d;
    flex-shrink: 0;
  }
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
  .stats {
    display: table;
    width: 100%;
    background: #003650;
    border-radius: 10px;
    margin-bottom: 36px;
    overflow: hidden;
  }
  .stat {
    display: table-cell;
    padding: 22px 20px;
    text-align: center;
    border-right: 1px solid rgba(255,255,255,0.08);
    vertical-align: middle;
  }
  .stat:last-child { border-right: none; }
  .stat-val {
    font-family: 'Playfair Display', serif;
    font-size: 26px; font-weight: 900;
    color: #c4956a;
    display: block;
    line-height: 1;
    margin-bottom: 5px;
  }
  .stat-label {
    font-family: 'DM Mono', monospace;
    font-size: 9px; letter-spacing: 1.5px;
    text-transform: uppercase;
    color: rgba(255,255,255,0.4);
    display: block;
    line-height: 1.3;
  }
  .cta-wrap {
    text-align: center;
    margin-bottom: 36px;
  }
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
  .quote-block {
    background: #f2f6f8;
    border-radius: 10px;
    padding: 24px 28px;
    margin-bottom: 36px;
    position: relative;
  }
  .quote-mark {
    font-family: 'Playfair Display', serif;
    font-size: 60px; line-height: 1;
    color: #c4956a;
    position: absolute;
    top: 10px; left: 20px;
    opacity: 0.4;
  }
  .quote-text {
    font-family: 'Playfair Display', serif;
    font-size: 16px; font-style: italic;
    color: #1a1e21;
    line-height: 1.6;
    padding-left: 20px;
    position: relative; z-index: 1;
    margin-bottom: 10px;
  }
  .quote-attr {
    font-family: 'DM Mono', monospace;
    font-size: 10px; letter-spacing: 1.5px;
    text-transform: uppercase;
    color: #7a8490;
    padding-left: 20px;
  }
  .divider {
    border: none;
    border-top: 1px solid #e8edf0;
    margin: 32px 0;
  }
  .signoff {
    margin-bottom: 8px;
  }
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
  .footer-links {
    margin-bottom: 12px;
  }
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
  .footer-small a {
    color: #b0b8c0 !important;
    text-decoration: underline !important;
  }
  @media only screen and (max-width: 640px) {
    .email-wrap { margin: 0; border-radius: 0; }
    .header-inner { padding: 32px 24px 28px; }
    .yard-banner { padding: 14px 24px; }
    .body { padding: 32px 24px 28px; }
    .header h1 { font-size: 26px; }
    .stats { display: block; }
    .stat { display: block; border-right: none; border-bottom: 1px solid rgba(255,255,255,0.08); padding: 16px 20px; }
    .stat:last-child { border-bottom: none; }
    .footer { padding: 20px 24px; }
  }
</style>
</head>
<body>
<div style="background:#f0ece4;padding:20px 0;">
<div class="email-wrap">
  <div class="header">
    <div class="header-texture"></div>
    <div class="header-glow"></div>
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
      <div class="header-eyebrow">Your yard is live</div>
      <h1>Welcome to<br>The <em>Reclaimed</em><br>Company.</h1>
      <p class="header-sub">You've just joined the UK's home for reclamation yards, salvage dealers, and the buyers who need exactly what you have.</p>
    </div>
  </div>
  <div class="yard-banner">
    <div class="yard-banner-label">Listed as</div>
    <div class="yard-banner-divider"></div>
    <div class="yard-banner-name">${yardNameHtml} — ${locationLineHtml}</div>
  </div>
  <div class="body">
    <div class="greeting">Good to have you with us.</div>
    <p class="intro-text">
      Your yard is now live on The Reclaimed Company Marketplace — the UK's dedicated platform connecting reclamation yards directly with the builders, architects, designers, and private buyers who are actively searching for what you stock.<br><br>
      We've set up your profile, your listing page, and your seller dashboard. <strong>You don't need to do anything technical.</strong> List a piece, set your price, and we handle everything else.
    </p>
    <div class="section-title">What happens now</div>
    <div class="steps">
      <div class="step">
        <div class="step-num">1</div>
        <div class="step-content">
          <div class="step-title">Add your first listing</div>
          <div class="step-desc">Head to your seller dashboard and add your first piece. Title, photographs, price, and a short description. That's it. It goes live immediately and starts appearing in searches straight away.</div>
        </div>
      </div>
      <div class="step">
        <div class="step-num">2</div>
        <div class="step-content">
          <div class="step-title">Your yard profile is your shopfront</div>
          <div class="step-desc">Buyers browse by yard as well as by item. Add your yard's story, what you specialise in, your location, and any delivery information. A complete profile gets significantly more traffic than a blank one.</div>
        </div>
      </div>
      <div class="step">
        <div class="step-num">3</div>
        <div class="step-content">
          <div class="step-title">Enquiries come straight to you</div>
          <div class="step-desc">When a buyer enquires about a piece, you'll get an instant notification. Reply through your dashboard — all conversation is kept on-platform and permanently recorded. No email chains, no lost messages.</div>
        </div>
      </div>
      <div class="step">
        <div class="step-num">4</div>
        <div class="step-content">
          <div class="step-title">You keep 90% of every sale</div>
          <div class="step-desc">Our commission is 10% — flat, with no listing fees and no monthly subscriptions. We take our cut when you make a sale. Until then, listing is completely free.</div>
        </div>
      </div>
    </div>
    <div class="stats">
      <div class="stat">
        <span class="stat-val">10%</span>
        <span class="stat-label">Commission<br>only on sales</span>
      </div>
      <div class="stat">
        <span class="stat-val">£0</span>
        <span class="stat-label">Listing<br>fees</span>
      </div>
      <div class="stat">
        <span class="stat-val">24hr</span>
        <span class="stat-label">Response<br>expectation</span>
      </div>
      <div class="stat">
        <span class="stat-val">100%</span>
        <span class="stat-label">Your yard<br>your prices</span>
      </div>
    </div>
    <div class="section-title">Two things that set us apart</div>
    <div class="features">
      <div class="feature-card">
        <div class="feature-tag">For pieces above £2,500</div>
        <div class="feature-title">The Private Deal Thread</div>
        <div class="feature-desc">Every significant piece is sold through a secure, private conversation between you and the buyer — hosted on our platform. The buyer enquires, asks questions, confirms details. You answer, share additional photographs, and when you're both ready, present the final deal including shipping as one agreed total. The buyer pays within the thread. Everything is recorded permanently. No off-platform negotiation. No PayPal links. No ambiguity.</div>
      </div>
      <div class="feature-card accent">
        <div class="feature-tag accent-tag">Issued automatically on qualifying sales</div>
        <div class="feature-title">The Piece Passport</div>
        <div class="feature-desc">Every sale above £2,500 generates a Piece Passport — a permanent provenance record co-signed by you and The Reclaimed Company. The buyer receives it in both physical and digital form. Your yard's name is part of the permanent history of every piece you sell through us. When the buyer resells, the Piece Passport travels with the piece. No other UK marketplace offers this.</div>
      </div>
    </div>
    <div class="quote-block">
      <div class="quote-mark">"</div>
      <div class="quote-text">Every piece deserves a second chapter. The Reclaimed Company exists to make sure it finds the right reader.</div>
      <div class="quote-attr">The Reclaimed Company — Marketplace</div>
    </div>
    <hr class="divider">
    <div class="cta-wrap">
      <a href="${urls.ctaListing}" class="cta-btn">Add Your First Listing →</a>
      <span class="cta-sub">Takes less than five minutes. Goes live immediately.</span>
    </div>
    <hr class="divider">
    <div class="signoff">
      <p>If you have any questions about getting set up, listing your stock, or how the platform works — just reply to this email. We set up every new yard personally and we're here to make sure your first listing goes smoothly.</p>
      <p>We're glad you're here.</p>
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
      You're receiving this because you registered as a yard on The Reclaimed Company Marketplace.<br>
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
 * Branded welcome email for a new reclamation yard. No-op if SMTP is not configured.
 * Returns true if sent, false if skipped.
 */
export async function sendReclamationYardWelcomeEmail(input: {
  toEmail: string;
  yardName: string;
  locationLine: string;
}): Promise<boolean> {
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

  const yardNameHtml = escapeHtml(input.yardName.trim() || "Your yard");
  const locationLineHtml = escapeHtml(input.locationLine.trim() || "United Kingdom");

  const html = buildYardWelcomeHtml({ yardNameHtml, locationLineHtml, urls });
  const text = [
    `Welcome to The Reclaimed Company — your yard is live`,
    "",
    `Listed as: ${input.yardName.trim() || "Your yard"} — ${input.locationLine.trim() || "United Kingdom"}`,
    "",
    "Your yard is now on The Reclaimed Company Marketplace. Add your first listing from your seller dashboard (no technical setup required).",
    "",
    `Add a listing: ${urls.ctaListing}`,
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
      subject: "Welcome to The Reclaimed Company — your yard is live",
      text,
      html,
    });
    return true;
  } catch (err) {
    console.error("[reclamation-yard-welcome-email]", err);
    return false;
  }
}

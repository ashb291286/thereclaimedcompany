/**
 * WooCommerce REST API (v3) — external/affiliate products pointing at this marketplace.
 * Env: WOOCOMMERCE_SITE_URL (no trailing slash), WOOCOMMERCE_CONSUMER_KEY, WOOCOMMERCE_CONSUMER_SECRET
 */

function getConfig(): { baseUrl: string; key: string; secret: string } | null {
  const baseUrl = process.env.WOOCOMMERCE_SITE_URL?.trim().replace(/\/$/, "");
  const key = process.env.WOOCOMMERCE_CONSUMER_KEY?.trim();
  const secret = process.env.WOOCOMMERCE_CONSUMER_SECRET?.trim();
  if (!baseUrl || !key || !secret) return null;
  return { baseUrl, key, secret };
}

export function isWooCommerceConfigured(): boolean {
  return getConfig() !== null;
}

function authHeader(key: string, secret: string): string {
  return `Basic ${Buffer.from(`${key}:${secret}`, "utf8").toString("base64")}`;
}

export type WooExternalProductPayload = {
  name: string;
  type: "external";
  status: "publish" | "draft";
  description: string;
  short_description: string;
  external_url: string;
  button_text: string;
  regular_price: string;
  categories: { id: number }[];
  images: { src: string }[];
};

async function wooFetch(
  path: string,
  init: RequestInit & { method?: string }
): Promise<Response> {
  const cfg = getConfig();
  if (!cfg) throw new Error("WooCommerce is not configured");
  const url = `${cfg.baseUrl}/wp-json/wc/v3${path}`;
  const headers = new Headers(init.headers);
  headers.set("Authorization", authHeader(cfg.key, cfg.secret));
  if (!headers.has("Content-Type") && init.body) {
    headers.set("Content-Type", "application/json");
  }
  return fetch(url, { ...init, headers });
}

export async function wooCommerceCreateProduct(
  body: WooExternalProductPayload
): Promise<{ id: number }> {
  const res = await wooFetch("/products", {
    method: "POST",
    body: JSON.stringify(body),
  });
  const text = await res.text();
  if (!res.ok) {
    throw new Error(`WooCommerce create failed (${res.status}): ${text.slice(0, 400)}`);
  }
  const data = JSON.parse(text) as { id?: number };
  if (typeof data.id !== "number") {
    throw new Error("WooCommerce create: missing product id");
  }
  return { id: data.id };
}

export async function wooCommerceUpdateProduct(
  productId: number,
  body: Partial<WooExternalProductPayload>
): Promise<void> {
  const res = await wooFetch(`/products/${productId}`, {
    method: "PUT",
    body: JSON.stringify(body),
  });
  const text = await res.text();
  if (!res.ok) {
    throw new Error(`WooCommerce update failed (${res.status}): ${text.slice(0, 400)}`);
  }
}

export async function wooCommerceDeleteProduct(productId: number): Promise<void> {
  const res = await wooFetch(`/products/${productId}?force=true`, {
    method: "DELETE",
  });
  if (!res.ok && res.status !== 404) {
    const text = await res.text();
    throw new Error(`WooCommerce delete failed (${res.status}): ${text.slice(0, 400)}`);
  }
}

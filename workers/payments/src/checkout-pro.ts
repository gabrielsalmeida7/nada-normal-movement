import { z } from "zod";
import { HttpError, upstreamJson } from "./http";
import type { WebhookDiagnostic } from "./webhook-diagnostic";

export const snapshotSchema = z.object({
  orderId: z.string().uuid(), attemptId: z.string().uuid(),
  totalCents: z.number().int().positive().max(2147483647),
  currency: z.literal("BRL"), method: z.enum(["pix", "credit_card"]),
  expiresAt: z.string().datetime({ offset: true }),
});
export type CheckoutSnapshot = z.infer<typeof snapshotSchema>;
export interface CheckoutProConfig {
  returnOrigin: string;
  webhookUrl: string;
  collectorId: string;
}

export function sandboxCheckoutUrl(value: string): string {
  const url = new URL(value);
  if (url.protocol !== "https:" || url.hostname !== "sandbox.mercadopago.com.br" ||
      url.port || url.username || url.password || url.pathname !== "/checkout/v1/redirect" ||
      !url.searchParams.get("pref_id")) throw new HttpError("PROVIDER_RESPONSE_INVALID");
  return url.href;
}

export function preferencePayload(snapshot: CheckoutSnapshot, config: CheckoutProConfig, now = Date.now()) {
  if (Date.parse(snapshot.expiresAt) <= now) throw new HttpError("ORDER_EXPIRED", 409);
  const back = (path: string) => `${config.returnOrigin}/checkout/${path}?order=${snapshot.orderId}`;
  return {
    // A single authoritative order total includes shipping and avoids rounding drift.
    items: [{ id: snapshot.orderId, title: `Pedido Nada Normal ${snapshot.orderId.slice(0, 8)}`,
      currency_id: "BRL", quantity: 1, unit_price: snapshot.totalCents / 100 }],
    external_reference: snapshot.attemptId,
    metadata: { order_id: snapshot.orderId, payment_attempt_id: snapshot.attemptId },
    back_urls: { success: back("sucesso"), pending: back("pendente"), failure: back("erro") },
    auto_return: "approved",
    notification_url: config.webhookUrl,
    expires: true, expiration_date_to: snapshot.expiresAt,
    // Keep the method chosen before the transactional reservation.
    payment_methods: { excluded_payment_types: (snapshot.method === "pix"
      ? ["credit_card", "debit_card", "prepaid_card", "ticket", "atm", "digital_currency"]
      : ["bank_transfer", "debit_card", "prepaid_card", "ticket", "atm", "digital_currency"])
      .map((id) => ({ id })) },
  };
}

export async function createPreference(snapshot: CheckoutSnapshot, config: CheckoutProConfig, token: string) {
  const headers = { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };
  const identity = z.object({ id: z.number().int().positive() }).parse(
    await upstreamJson("https://api.mercadopago.com/users/me", { headers }));
  if (String(identity.id) !== config.collectorId) throw new HttpError("PROVIDER_ACCOUNT_MISMATCH");
  // No automatic retry: Preferences API must not be assumed to honor payment idempotency headers.
  const result = z.object({ id: z.string().min(1), sandbox_init_point: z.string(),
    collector_id: z.number().int().optional() }).parse(await upstreamJson(
    "https://api.mercadopago.com/checkout/preferences",
    { method: "POST", headers, body: JSON.stringify(preferencePayload(snapshot, config)) }));
  if (result.collector_id !== undefined && String(result.collector_id) !== config.collectorId) {
    throw new HttpError("PROVIDER_ACCOUNT_MISMATCH");
  }
  return { preferenceId: result.id, checkoutUrl: sandboxCheckoutUrl(result.sandbox_init_point) };
}

/** Verify the signed query ID, never a resource URL supplied by the caller. */
export async function verifyWebhook(request: Request, secret: string): Promise<string> {
  const ids = new URL(request.url).searchParams.getAll("data.id");
  const id = ids[0] ?? "";
  const requestId = request.headers.get("x-request-id") ?? "";
  const signature = request.headers.get("x-signature") ?? "";
  const match = /^ts=(\d{10,13}),v1=([a-fA-F0-9]{64})$/.exec(signature.replace(/\s/g, ""));
  if (ids.length !== 1 || !/^\d{1,24}$/.test(id) || !/^[A-Za-z0-9._:-]{1,128}$/.test(requestId) || !match) {
    throw new HttpError("WEBHOOK_SIGNATURE_INVALID", 401);
  }
  const [, timestamp, mac] = match;
  const seconds = timestamp.length === 13 ? Number(timestamp) / 1000 : Number(timestamp);
  if (Math.abs(Date.now() / 1000 - seconds) > 300) throw new HttpError("WEBHOOK_SIGNATURE_INVALID", 401);
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" }, false, ["verify"]);
  const bytes = Uint8Array.from(mac.match(/../g)!, (hex) => parseInt(hex, 16));
  const valid = await crypto.subtle.verify("HMAC", key, bytes,
    new TextEncoder().encode(`id:${id};request-id:${requestId};ts:${timestamp};`));
  if (!valid) throw new HttpError("WEBHOOK_SIGNATURE_INVALID", 401);
  return id;
}

export const verifiedPaymentSchema = z.object({
  id: z.number().int().positive(), external_reference: z.string().uuid(),
  collector_id: z.number().int().positive(), live_mode: z.boolean(),
  payer: z.object({ id: z.union([z.number().int().positive().safe(),
    z.string().regex(/^[1-9]\d{0,19}$/)]).transform(String) }).optional(),
  currency_id: z.literal("BRL"), transaction_amount: z.number().positive(),
  transaction_amount_refunded: z.number().nonnegative().default(0),
  status: z.enum(["pending", "in_process", "authorized", "approved", "rejected", "cancelled", "refunded", "charged_back"]),
  date_last_updated: z.string().datetime({ offset: true }),
});

// Deliberately narrow staging exception, not a general production payment switch.
const TEST_SELLER = 3272217989;
const TEST_BUYER = 3272217991;
const testIdentitySchema = z.object({
  id: z.number().int().positive(), site_id: z.literal("MLB"),
  tags: z.array(z.string()).optional(), user_type: z.string().optional(),
}).refine(user => user.user_type === "test_user" || user.tags?.includes("test_user") === true,
  { path: ["test_marker"] });

async function verifyTestAccounts(payment: z.infer<typeof verifiedPaymentSchema>,
  config: CheckoutProConfig, token: string, diagnostic?: WebhookDiagnostic) {
  const reject = (checks: string[]): never => {
    if (diagnostic) diagnostic.rejectedTestAccountChecks = checks;
    throw new HttpError("PROVIDER_TEST_ACCOUNT_UNVERIFIED");
  };
  const mismatches = [
    ...(config.collectorId !== String(TEST_SELLER) ? ["configured_seller"] : []),
    ...(payment.collector_id !== TEST_SELLER ? ["payment_seller"] : []),
    ...(payment.payer?.id !== String(TEST_BUYER) ? ["payment_buyer"] : []),
  ];
  if (mismatches.length) reject(mismatches);
  const headers = { Authorization: `Bearer ${token}` };
  const [seller, buyer] = await Promise.all([
    upstreamJson("https://api.mercadopago.com/users/me", { headers }),
    upstreamJson(`https://api.mercadopago.com/users/${TEST_BUYER}`, { headers }),
  ]);
  const verifiedSeller = testIdentitySchema.safeParse(seller);
  const verifiedBuyer = testIdentitySchema.safeParse(buyer);
  // Only fixed labels from our own schema: no issue messages, paths or values.
  const checks = (result: typeof verifiedSeller, account: "seller" | "buyer", expectedId: number): string[] => {
    if (result.success) return result.data.id === expectedId ? [] : [`${account}_id`];
    const fields = ["id", "site_id", "tags", "user_type", "test_marker"]
      .filter(field => result.error.issues.some(issue => issue.path[0] === field));
    return fields.length ? fields.map(field => `${account}_${field}`) : [`${account}_profile`];
  };
  const rejected = [...checks(verifiedSeller, "seller", TEST_SELLER), ...checks(verifiedBuyer, "buyer", TEST_BUYER)];
  if (rejected.length) reject(rejected);
}

export async function readPayment(id: string, config: CheckoutProConfig, token: string,
  diagnostic?: WebhookDiagnostic) {
  const result = verifiedPaymentSchema.safeParse(await upstreamJson(
    `https://api.mercadopago.com/v1/payments/${id}`, { headers: { Authorization: `Bearer ${token}` } }));
  if (!result.success) {
    // Output only known schema field names, never Zod issues/messages or provider values.
    if (diagnostic) diagnostic.rejectedPaymentFields = Object.keys(verifiedPaymentSchema.shape)
      .filter(field => result.error.issues.some(issue => issue.path[0] === field));
    throw new HttpError("CHECKOUT_UNAVAILABLE");
  }
  const payment = result.data;
  if (String(payment.id) !== id || String(payment.collector_id) !== config.collectorId ||
      !Number.isSafeInteger(Math.round(payment.transaction_amount * 100)) ||
      Math.abs(payment.transaction_amount * 100 - Math.round(payment.transaction_amount * 100)) > 0.00001 ||
      payment.transaction_amount_refunded > payment.transaction_amount ||
      Math.abs(payment.transaction_amount_refunded * 100 - Math.round(payment.transaction_amount_refunded * 100)) > 0.00001) {
    throw new HttpError("PROVIDER_PAYMENT_MISMATCH");
  }
  // APP_USR test-seller flows can use the regular API environment. A true flag
  // alone is NEVER enough: attest the exact approved test identities server-side.
  if (payment.live_mode) await verifyTestAccounts(payment, config, token, diagnostic);
  return payment;
}

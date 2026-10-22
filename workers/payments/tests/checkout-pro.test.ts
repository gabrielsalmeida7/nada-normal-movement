import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import worker from "../src/index";
import { createPreference, preferencePayload, readPayment, sandboxCheckoutUrl, verifyWebhook } from "../src/checkout-pro";
import { readConfig } from "../src/config";
import { readJson } from "../src/http";

const orderId = "11111111-1111-4111-8111-111111111111";
const attemptId = "22222222-2222-4222-8222-222222222222";
const owner = "33333333-3333-4333-8333-333333333333";
const checkoutUrl = "https://sandbox.mercadopago.com.br/checkout/v1/redirect?pref_id=test-pref";
const config = { returnOrigin: "https://staging.example.com", webhookUrl: "https://api.example.com/webhooks/mercadopago", collectorId: "123" };
const env = { APP_ENV: "staging", PAYMENTS_ENABLED: "true", ALLOWED_ORIGINS: config.returnOrigin,
  CHECKOUT_PRO_MODE: "sandbox", CHECKOUT_RETURN_ORIGIN: config.returnOrigin, CHECKOUT_WEBHOOK_URL: config.webhookUrl,
  MP_COLLECTOR_ID: "123", MP_ACCESS_TOKEN: "mp-private-sentinel", MP_WEBHOOK_SECRET: "webhook-private-sentinel",
  SUPABASE_URL: "https://database.example.com", SUPABASE_PUBLISHABLE_KEY: "public", SUPABASE_SECRET_KEY: "db-private-sentinel" };
const snapshot = { orderId, attemptId, totalCents: 12345, currency: "BRL" as const, method: "pix" as const,
  expiresAt: "2030-01-01T00:30:00Z" };
const payment = { id: 456, external_reference: attemptId, collector_id: 123, live_mode: false, currency_id: "BRL",
  transaction_amount: 123.45, transaction_amount_refunded: 0, status: "approved", date_last_updated: "2030-01-01T00:00:00Z" };
const req = (path = "/v1/checkout/preferences", body: unknown = { orderId }, overrides = {}) => worker.fetch(new Request(
  `https://api.example.com${path}`, { method: "POST", headers: { Authorization: "Bearer jwt-private-sentinel", "Content-Type": "application/json" },
    body: JSON.stringify(body) }), { ...env, ...overrides });

async function signedRequest(id = "456", secret = env.MP_WEBHOOK_SECRET, timestamp = String(Math.floor(Date.now() / 1000))) {
  const requestId = "request-123";
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const signature = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(`id:${id};request-id:${requestId};ts:${timestamp};`));
  const mac = Array.from(new Uint8Array(signature), b => b.toString(16).padStart(2, "0")).join("");
  return new Request(`https://api.example.com/webhooks/mercadopago?data.id=${id}`, { method: "POST",
    headers: { "x-request-id": requestId, "x-signature": `ts=${timestamp},v1=${mac}` },
    body: JSON.stringify({ type: "payment", data: { id } }) });
}

beforeEach(() => { vi.useFakeTimers(); vi.setSystemTime(new Date("2030-01-01T00:00:00Z")); vi.spyOn(console, "info").mockImplementation(() => {}); });
afterEach(() => { vi.useRealTimers(); vi.restoreAllMocks(); });

describe("sandbox configuration and preference", () => {
  it("only enables a fully configured staging sandbox", () => {
    expect(readConfig(env).paymentsEnabled).toBe(true);
    for (const override of [{ APP_ENV: "production" }, { APP_ENV: "local" }, { CHECKOUT_PRO_MODE: "production" },
      { CHECKOUT_RETURN_ORIGIN: "https://attacker.example.com" }, { MP_COLLECTOR_ID: "" }, { CHECKOUT_WEBHOOK_URL: "http://localhost/webhooks/mercadopago" }]) {
      expect(() => readConfig({ ...env, ...override })).toThrow();
    }
  });
  it("uses only persisted totals, shipping-inclusive BRL and stable attempt reference", () => {
    const body = preferencePayload(snapshot, config);
    expect(body.items[0]).toMatchObject({ unit_price: 123.45, currency_id: "BRL", quantity: 1 });
    expect(body.external_reference).toBe(attemptId);
    expect(body.back_urls.success).toBe(`${config.returnOrigin}/checkout/sucesso?order=${orderId}`);
    expect(body.expiration_date_to).toBe(snapshot.expiresAt);
    expect(() => preferencePayload({ ...snapshot, expiresAt: "2020-01-01T00:00:00Z" }, config)).toThrow("ORDER_EXPIRED");
  });
  it.each(["https://evil.example.com/", "https://sandbox.mercadopago.com.br.evil.com/checkout/v1/redirect?pref_id=x",
    "https://user:password@sandbox.mercadopago.com.br/checkout/v1/redirect?pref_id=x", "https://www.mercadopago.com.br/checkout/v1/redirect?pref_id=x"])("rejects unsafe/non-sandbox redirect %s", url => {
    expect(() => sandboxCheckoutUrl(url)).toThrow();
  });
  it("validates seller identity before creating a preference", async () => {
    const spy = vi.spyOn(globalThis, "fetch").mockResolvedValue(Response.json({ id: 999 }));
    await expect(createPreference(snapshot, config, "private")).rejects.toThrow("PROVIDER_ACCOUNT_MISMATCH");
    expect(spy).toHaveBeenCalledTimes(1);
  });
});

describe("Worker checkout endpoints", () => {
  it("blocks new submissions without contacting upstream when switched off", async () => {
    const spy = vi.spyOn(globalThis, "fetch");
    expect((await req(undefined, undefined, { PAYMENTS_ENABLED: "false" })).status).toBe(503);
    expect(spy).not.toHaveBeenCalled();
  });
  it("rejects caller-supplied prices before claiming stock/payment", async () => {
    const spy = vi.spyOn(globalThis, "fetch").mockResolvedValue(Response.json({ id: owner }));
    expect((await req(undefined, { orderId, totalCents: 1 })).status).toBe(400);
    expect(spy).toHaveBeenCalledTimes(1);
  });
  it("persists the claim, creates once, and saves before returning a redirect", async () => {
    const spy = vi.spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(Response.json({ id: owner }))
      .mockResolvedValueOnce(Response.json({ state: "claimed", snapshot }))
      .mockResolvedValueOnce(Response.json({ id: 123 }))
      .mockResolvedValueOnce(Response.json({ id: "test-pref", sandbox_init_point: checkoutUrl, collector_id: 123 }))
      .mockResolvedValueOnce(Response.json({ saved: true }));
    const response = await req();
    expect(response.status).toBe(201);
    expect(await response.json()).toEqual({ preferenceId: "test-pref", checkoutUrl });
    expect(spy.mock.calls.map(c => String(c[0]))).toEqual([
      `${env.SUPABASE_URL}/auth/v1/user`, `${env.SUPABASE_URL}/rest/v1/rpc/claim_checkout_pro`,
      "https://api.mercadopago.com/users/me", "https://api.mercadopago.com/checkout/preferences",
      `${env.SUPABASE_URL}/rest/v1/rpc/finish_checkout_pro`]);
    const providerHeaders = spy.mock.calls[3][1]?.headers as Record<string, string>;
    expect(providerHeaders.Authorization).toBe(`Bearer ${env.MP_ACCESS_TOKEN}`);
  });
  it("reuses persisted preference instead of posting to the provider again", async () => {
    const spy = vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(Response.json({ id: owner }))
      .mockResolvedValueOnce(Response.json({ state: "ready", preferenceId: "test-pref", checkoutUrl }));
    expect((await req()).status).toBe(200);
    expect(spy).toHaveBeenCalledTimes(2);
  });
  it("does not repeat external I/O after an unknown in-flight claim", async () => {
    const spy = vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(Response.json({ id: owner }))
      .mockResolvedValueOnce(Response.json({ state: "busy" }));
    const response = await req();
    expect(response.status).toBe(409);
    expect((await response.json()).error.code).toBe("CHECKOUT_RECONCILIATION_REQUIRED");
    expect(spy).toHaveBeenCalledTimes(2);
  });
  it("never returns a checkout URL when saving it fails", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(Response.json({ id: owner }))
      .mockResolvedValueOnce(Response.json({ state: "claimed", snapshot }))
      .mockResolvedValueOnce(Response.json({ id: 123 }))
      .mockResolvedValueOnce(Response.json({ id: "test-pref", sandbox_init_point: checkoutUrl }))
      .mockResolvedValueOnce(Response.json({}, { status: 503 }));
    const response = await req();
    expect(response.status).toBe(503);
    expect(await response.text()).not.toContain(checkoutUrl);
  });
  it("limits chunked request bodies even without Content-Length", async () => {
    const request = new Request("https://worker.test", { method: "POST", body: "x".repeat(13000) });
    await expect(readJson(request, 12000)).rejects.toThrow("PAYLOAD_TOO_LARGE");
  });
});

describe("webhook confirmation", () => {
  const diagnostic = () => vi.mocked(console.info).mock.calls
    .map(([line]) => JSON.parse(String(line)))
    .filter(line => line.event === "webhook_diagnostic");

  it("records signature rejection without logging request or secret data", async () => {
    const spy = vi.spyOn(globalThis, "fetch");
    const response = await worker.fetch(await signedRequest("456", "wrong-secret-sentinel"), env);
    expect(response.status).toBe(401);
    expect(diagnostic()).toEqual([{ event: "webhook_diagnostic", requestId: response.headers.get("X-Request-Id"),
      stage: "signature", signatureVerified: false, status: 401, errorCode: "WEBHOOK_SIGNATURE_INVALID" }]);
    expect(spy).not.toHaveBeenCalled();
    const logs = JSON.stringify(vi.mocked(console.info).mock.calls);
    for (const value of [...Object.values(env), "wrong-secret-sentinel", "request-123", "data.id", "x-signature"]) {
      expect(logs).not.toContain(value);
    }
  });
  it.each([404, 401, 403, 500])("records provider HTTP %i after verified signature without acknowledging it", async status => {
    const spy = vi.spyOn(globalThis, "fetch").mockResolvedValue(Response.json({ secret: "provider-body-sentinel" }, { status }));
    const response = await worker.fetch(await signedRequest(), { ...env, PAYMENTS_ENABLED: "false" });
    expect(response.status).toBe(503);
    expect(diagnostic()[0]).toMatchObject({ stage: "provider_lookup_and_validation", signatureVerified: true,
      errorCode: "UPSTREAM_UNAVAILABLE", upstreamStatus: status });
    expect(spy).toHaveBeenCalledTimes(1);
    expect(JSON.stringify(vi.mocked(console.info).mock.calls)).not.toContain("provider-body-sentinel");
    expect(await response.json()).toEqual({ error: { code: "UPSTREAM_UNAVAILABLE" } });
  });
  it("records transport failure without exception messages", async () => {
    vi.spyOn(globalThis, "fetch").mockRejectedValue(new Error("token-url-private-sentinel"));
    await worker.fetch(await signedRequest(), env);
    expect(diagnostic()[0]).toMatchObject({ stage: "provider_lookup_and_validation", signatureVerified: true,
      errorCode: "UPSTREAM_UNAVAILABLE" });
    expect(diagnostic()[0]).not.toHaveProperty("upstreamStatus");
    expect(JSON.stringify(vi.mocked(console.info).mock.calls)).not.toContain("token-url-private-sentinel");
  });
  it("distinguishes database errors from provider errors", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(Response.json(payment))
      .mockResolvedValueOnce(Response.json({ error: "database-private-sentinel" }, { status: 400 }));
    expect((await worker.fetch(await signedRequest(), env)).status).toBe(503);
    expect(diagnostic()[0]).toMatchObject({ stage: "database_apply", signatureVerified: true,
      errorCode: "UPSTREAM_UNAVAILABLE", upstreamStatus: 400 });
    expect(JSON.stringify(vi.mocked(console.info).mock.calls)).not.toContain("database-private-sentinel");
  });
  it("records completed processing only after persistence", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(Response.json(payment)).mockResolvedValueOnce(Response.json({ applied: true }));
    expect((await worker.fetch(await signedRequest(), env)).status).toBe(200);
    expect(diagnostic()[0]).toMatchObject({ stage: "completed", signatureVerified: true, status: 200 });
    expect(diagnostic()[0]).not.toHaveProperty("errorCode");
  });
  it("records configuration failure before signature verification", async () => {
    expect((await worker.fetch(await signedRequest(), { ...env, MP_ACCESS_TOKEN: "" })).status).toBe(503);
    expect(diagnostic()[0]).toMatchObject({ stage: "configuration", signatureVerified: false,
      errorCode: "CONFIGURATION_INVALID" });
  });
  it("never emits the staging diagnostic in production", async () => {
    await worker.fetch(await signedRequest(), { ...env, APP_ENV: "production", PAYMENTS_ENABLED: "false", CHECKOUT_PRO_MODE: "" });
    expect(diagnostic()).toEqual([]);
  });
  it("accepts valid HMAC and rejects wrong secrets, changed IDs and stale signatures", async () => {
    expect(await verifyWebhook(await signedRequest(), env.MP_WEBHOOK_SECRET)).toBe("456");
    await expect(verifyWebhook(await signedRequest("456", "wrong"), env.MP_WEBHOOK_SECRET)).rejects.toThrow();
    await expect(verifyWebhook(await signedRequest("456", undefined, "1704908010"), env.MP_WEBHOOK_SECRET)).rejects.toThrow();
    const request = await signedRequest();
    await expect(verifyWebhook(new Request(request.url.replace("456", "457"), request), env.MP_WEBHOOK_SECRET)).rejects.toThrow();
  });
  it.each([{ live_mode: true }, { collector_id: 999 }, { currency_id: "USD" }, { transaction_amount: 1.001 }])("rejects mismatched verified payment %#", async override => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(Response.json({ ...payment, ...override }));
    await expect(readPayment("456", config, "private")).rejects.toThrow();
  });
  it("confirms through API+database even when new payments are switched off", async () => {
    const spy = vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(Response.json(payment))
      .mockResolvedValueOnce(Response.json({ applied: true }));
    const response = await worker.fetch(await signedRequest(), { ...env, PAYMENTS_ENABLED: "false" });
    expect(response.status).toBe(200);
    expect(spy.mock.calls[0][0]).toBe("https://api.mercadopago.com/v1/payments/456");
    expect(JSON.parse(String(spy.mock.calls[1][1]?.body))).toMatchObject({ p_attempt_id: attemptId, p_amount_cents: 12345 });
  });
  it("does not acknowledge a payment when persistence fails", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(Response.json(payment))
      .mockResolvedValueOnce(Response.json({}, { status: 503 }));
    expect((await worker.fetch(await signedRequest(), env)).status).toBe(503);
  });
});

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import worker from "../src/index";
import { createPreference, preferencePayload, readPayment, sandboxCheckoutUrl, verifyWebhook } from "../src/checkout-pro";
import { readConfig } from "../src/config";
import { readJson } from "../src/http";

const orderId = "11111111-1111-4111-8111-111111111111";
const attemptId = "22222222-2222-4222-8222-222222222222";
const owner = "33333333-3333-4333-8333-333333333333";
const checkoutUrl = "https://sandbox.mercadopago.com.br/checkout/v1/redirect?pref_id=test-pref";
const config = { returnOrigin: "https://staging.example.com", webhookUrl: "https://api.example.com/webhooks/mercadopago", collectorId: "123",
  applicationId: "100", testApplicationId: "200", testBuyerId: "3272217991" };
const env = { APP_ENV: "staging", PAYMENTS_ENABLED: "true", ALLOWED_ORIGINS: config.returnOrigin,
  CHECKOUT_PRO_MODE: "sandbox", CHECKOUT_RETURN_ORIGIN: config.returnOrigin, CHECKOUT_WEBHOOK_URL: config.webhookUrl,
  MP_COLLECTOR_ID: "123", MP_ACCESS_TOKEN: "mp-private-sentinel", MP_WEBHOOK_SECRET: "webhook-private-sentinel",
  MP_APPLICATION_ID: config.applicationId, MP_TEST_APPLICATION_ID: config.testApplicationId, MP_TEST_BUYER_ID: config.testBuyerId,
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
  it("only permits a nonempty test-application secret in staging Checkout Pro", () => {
    expect(() => readConfig({ ...env, MP_TEST_WEBHOOK_SECRET: "test-application-secret" })).not.toThrow();
    for (const override of [{ APP_ENV: "local" }, { APP_ENV: "production", PAYMENTS_ENABLED: "false" },
      { CHECKOUT_PRO_MODE: undefined, PAYMENTS_ENABLED: "false" }, { MP_TEST_WEBHOOK_SECRET: " " }]) {
      expect(() => readConfig({ ...env, MP_TEST_WEBHOOK_SECRET: "test-application-secret", ...override })).toThrow();
    }
  });
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
  it("reads the reservation deadline scoped to the authenticated owner without provider I/O", async () => {
    const spy = vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(Response.json({ id: owner }))
      .mockResolvedValueOnce(Response.json([{ id: orderId, user_id: owner, financial_status: "processing",
        reservation_state: "held", reservation_expires_at: snapshot.expiresAt }]));
    const response = await worker.fetch(new Request(`https://api.example.com/v1/checkout/orders/${orderId}/status`,
      { headers: { Authorization: "Bearer jwt-private-sentinel" } }), { ...env, PAYMENTS_ENABLED: "false" });
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ orderId, financialStatus: "processing", reservationState: "held",
      reservationExpiresAt: snapshot.expiresAt });
    expect(spy).toHaveBeenCalledTimes(2);
    const url = new URL(String(spy.mock.calls[1][0]));
    expect(url.pathname).toBe("/rest/v1/orders");
    expect(url.searchParams.get("user_id")).toBe(`eq.${owner}`);
    expect(url.searchParams.get("id")).toBe(`eq.${orderId}`);
    expect(url.searchParams.get("limit")).toBe("1");
  });
  it("returns no reservation details for a nonexistent or another customer's order", async () => {
    const spy = vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(Response.json({ id: owner }))
      .mockResolvedValueOnce(Response.json([]));
    const response = await worker.fetch(new Request(`https://api.example.com/v1/checkout/orders/${orderId}/status`,
      { headers: { Authorization: "Bearer jwt-private-sentinel" } }), env);
    expect(response.status).toBe(404);
    expect(await response.json()).toEqual({ error: { code: "ORDER_NOT_FOUND" } });
    expect(spy).toHaveBeenCalledTimes(2);
  });
  it("fails closed if the database returns an owner other than the authenticated customer", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(Response.json({ id: owner }))
      .mockResolvedValueOnce(Response.json([{ id: orderId, user_id: attemptId, financial_status: "processing",
        reservation_state: "held", reservation_expires_at: snapshot.expiresAt }]));
    const response = await worker.fetch(new Request(`https://api.example.com/v1/checkout/orders/${orderId}/status`,
      { headers: { Authorization: "Bearer jwt-private-sentinel" } }), env);
    expect(response.status).toBe(503);
    expect(await response.text()).not.toContain(snapshot.expiresAt);
  });
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
      .mockResolvedValueOnce(Response.json({ id: "test-pref", sandbox_init_point: checkoutUrl, collector_id: 123, client_id: "200", external_reference: attemptId, metadata: { order_id: orderId } }))
      .mockResolvedValueOnce(Response.json({ saved: true }));
    const response = await req();
    expect(response.status).toBe(201);
    expect(await response.json()).toEqual({ preferenceId: "test-pref", checkoutUrl,
      applicationId: config.applicationId, testApplicationId: config.testApplicationId, orderId });
    expect(spy.mock.calls.map(c => String(c[0]))).toEqual([
      `${env.SUPABASE_URL}/auth/v1/user`, `${env.SUPABASE_URL}/rest/v1/rpc/claim_checkout_pro_v2`,
      "https://api.mercadopago.com/users/me", "https://api.mercadopago.com/checkout/preferences/",
      `${env.SUPABASE_URL}/rest/v1/rpc/finish_checkout_pro`]);
    const providerHeaders = spy.mock.calls[3][1]?.headers as Record<string, string>;
    expect(providerHeaders.Authorization).toBe(`Bearer ${env.MP_ACCESS_TOKEN}`);
  });
  it("reuses persisted preference after verifying its application, without another POST", async () => {
    const spy = vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(Response.json({ id: owner }))
      .mockResolvedValueOnce(Response.json({ state: "ready", preferenceId: "test-pref", checkoutUrl }))
      .mockResolvedValueOnce(Response.json({ id: "test-pref", sandbox_init_point: checkoutUrl, collector_id: 123, client_id: "200", external_reference: attemptId, metadata: { order_id: orderId } }));
    expect((await req()).status).toBe(200);
    expect(spy).toHaveBeenCalledTimes(3);
    expect(spy.mock.calls[2][1]?.method).toBe("GET");
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
      .mockResolvedValueOnce(Response.json({ id: "test-pref", sandbox_init_point: checkoutUrl, collector_id: 123, client_id: "200", external_reference: attemptId, metadata: { order_id: orderId } }))
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
  const signedQueryDiagnostic = { resourceKind: "data_id", topic: "missing", topicParameter: "none", declaredSource: "missing" };

  it.each([
    [env.MP_WEBHOOK_SECRET, "application"],
    ["test-application-secret-sentinel", "test_application"],
  ])("validates configured application signatures and applies only API-confirmed payments (%s)", async (secret, source) => {
    const spy = vi.spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(Response.json(payment))
      .mockResolvedValueOnce(Response.json({ applied: true }));
    const response = await worker.fetch(await signedRequest("456", secret),
      { ...env, MP_TEST_WEBHOOK_SECRET: "test-application-secret-sentinel" });
    expect(response.status).toBe(200);
    expect(spy).toHaveBeenCalledTimes(2);
    expect(String(spy.mock.calls[1][0])).toContain("/rpc/apply_checkout_pro_payment_v2");
    expect(diagnostic()[0]).toMatchObject({ stage: "completed", signatureVerified: true,
      signatureSource: source, status: 200 });
    const logs = JSON.stringify(vi.mocked(console.info).mock.calls);
    for (const value of [env.MP_WEBHOOK_SECRET, "test-application-secret-sentinel", env.MP_ACCESS_TOKEN])
      expect(logs).not.toContain(value);
  });
  it("rejects unknown keys and altered IDs before provider or database access with both secrets configured", async () => {
    const spy = vi.spyOn(globalThis, "fetch");
    const signed = await signedRequest("456", "test-application-secret-sentinel");
    const altered = new Request(signed.url.replace("data.id=456", "data.id=789"), signed);
    for (const request of [await signedRequest("456", "unknown-key"), altered]) {
      const response = await worker.fetch(request, { ...env, MP_TEST_WEBHOOK_SECRET: "test-application-secret-sentinel" });
      expect(response.status).toBe(401);
    }
    expect(spy).not.toHaveBeenCalled();
    expect(diagnostic().every(event => event.signatureFailureReasons[0] === "hmac_mismatch")).toBe(true);
  });
  it("does not bypass provider validation or failed persistence after a test-application signature", async () => {
    const spy = vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(Response.json({ ...payment, collector_id: 999 }));
    const bindings = { ...env, MP_TEST_WEBHOOK_SECRET: "test-application-secret-sentinel" };
    expect((await worker.fetch(await signedRequest("456", bindings.MP_TEST_WEBHOOK_SECRET), bindings)).status).toBe(503);
    expect(spy).toHaveBeenCalledTimes(1);
    spy.mockReset().mockResolvedValueOnce(Response.json(payment)).mockResolvedValueOnce(Response.json({}, { status: 500 }));
    expect((await worker.fetch(await signedRequest("456", bindings.MP_TEST_WEBHOOK_SECRET), bindings)).status).toBe(503);
    expect(diagnostic().at(-1)).toMatchObject({ stage: "database_apply", signatureVerified: true,
      signatureSource: "test_application", status: 503 });
  });

  it("records signature rejection without logging request or secret data", async () => {
    const spy = vi.spyOn(globalThis, "fetch");
    const response = await worker.fetch(await signedRequest("456", "wrong-secret-sentinel"), env);
    expect(response.status).toBe(401);
    expect(diagnostic()).toEqual([{ event: "webhook_diagnostic", requestId: response.headers.get("X-Request-Id"),
      query: signedQueryDiagnostic,
      stage: "signature", signatureVerified: false, signatureFailureReasons: ["hmac_mismatch"],
      status: 401, errorCode: "WEBHOOK_SIGNATURE_INVALID" }]);
    expect(spy).not.toHaveBeenCalled();
    const logs = JSON.stringify(vi.mocked(console.info).mock.calls);
    for (const value of [...Object.values(env), "wrong-secret-sentinel", "request-123", "data.id", "x-signature"]) {
      expect(logs).not.toContain(value);
    }
  });
  const signatureCases: { name: string; query?: string; header?: string; value?: string;
    timestamp?: string; reasons: string[] }[] = [
    { name: "missing query ID", query: "", reasons: ["query_id_missing"] },
    { name: "duplicate query IDs", query: "?data.id=456&data.id=456", reasons: ["query_id_duplicate"] },
    { name: "invalid query ID", query: "?data.id=query-private-sentinel", reasons: ["query_id_invalid"] },
    { name: "missing request ID", header: "x-request-id", reasons: ["request_id_missing"] },
    { name: "invalid request ID", header: "x-request-id", value: "request private sentinel", reasons: ["request_id_invalid"] },
    { name: "missing signature", header: "x-signature", reasons: ["signature_missing"] },
    { name: "invalid signature format", header: "x-signature", value: "signature-private-sentinel", reasons: ["signature_format_invalid"] },
    { name: "expired signature", timestamp: "1704908010", reasons: ["timestamp_outside_window"] },
    { name: "future signature", timestamp: "1999999999", reasons: ["timestamp_outside_window"] },
  ];
  it.each(signatureCases)("diagnoses $name using fixed labels, with no upstream I/O", async item => {
    const request = await signedRequest("456", env.MP_WEBHOOK_SECRET, item.timestamp);
    const headers = new Headers(request.headers);
    if (item.header) {
      if (item.value === undefined) headers.delete(item.header);
      else headers.set(item.header, item.value);
    }
    const url = new URL(request.url);
    if (item.query !== undefined) url.search = item.query;
    const spy = vi.spyOn(globalThis, "fetch");
    const response = await worker.fetch(new Request(url, { method: "POST", headers,
      body: "body-private-sentinel" }), env);
    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({ error: { code: "WEBHOOK_SIGNATURE_INVALID" } });
    expect(diagnostic()[0]).toMatchObject({ stage: "signature", signatureVerified: false,
      signatureFailureReasons: item.reasons });
    expect(spy).not.toHaveBeenCalled();
    const logs = JSON.stringify(vi.mocked(console.info).mock.calls);
    for (const value of ["query-private-sentinel", "request private sentinel", "signature-private-sentinel",
      "body-private-sentinel", env.MP_WEBHOOK_SECRET, "1704908010", "1999999999"])
      expect(logs).not.toContain(value);
  });
  it("records multiple missing signature inputs without accepting the notification", async () => {
    const spy = vi.spyOn(globalThis, "fetch");
    const response = await worker.fetch(new Request("https://api.example.com/webhooks/mercadopago", { method: "POST" }), env);
    expect(response.status).toBe(401);
    expect(diagnostic()[0].signatureFailureReasons).toEqual(["query_id_missing", "request_id_missing", "signature_missing"]);
    expect(spy).not.toHaveBeenCalled();
  });
  it("keeps valid seconds and milliseconds signatures accepted without rejection diagnostics", async () => {
    for (const timestamp of [String(Math.floor(Date.now() / 1000)), String(Date.now())]) {
      vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(Response.json(payment)).mockResolvedValueOnce(Response.json({ applied: true }));
      expect((await worker.fetch(await signedRequest("456", env.MP_WEBHOOK_SECRET, timestamp), env)).status).toBe(200);
    }
    for (const event of diagnostic()) expect(event).not.toHaveProperty("signatureFailureReasons");
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
  it("logs only allowlisted rejected payment field names and never applies invalid data", async () => {
    const spy = vi.spyOn(globalThis, "fetch").mockResolvedValue(Response.json({ ...payment,
      live_mode: "live-private-sentinel", external_reference: "reference-private-sentinel",
      date_last_updated: "date-private-sentinel", status: "status-private-sentinel",
      payer: { email: "payer-private-sentinel" }, "attacker-private-sentinel": "body-private-sentinel" }));
    const response = await worker.fetch(await signedRequest(), env);
    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({ error: { code: "CHECKOUT_UNAVAILABLE" } });
    expect(diagnostic()[0]).toEqual({ event: "webhook_diagnostic", requestId: response.headers.get("X-Request-Id"),
      query: signedQueryDiagnostic,
      stage: "provider_lookup_and_validation", signatureVerified: true, signatureSource: "application", status: 503,
      errorCode: "CHECKOUT_UNAVAILABLE",
      rejectedPaymentFields: ["external_reference", "live_mode", "payer", "status", "date_last_updated"] });
    expect(spy).toHaveBeenCalledTimes(1);
    const logs = JSON.stringify(vi.mocked(console.info).mock.calls);
    for (const value of ["live-private-sentinel", "reference-private-sentinel", "date-private-sentinel", "status-private-sentinel",
      "payer-private-sentinel", "attacker-private-sentinel", "body-private-sentinel",
      env.MP_ACCESS_TOKEN, env.MP_WEBHOOK_SECRET, env.SUPABASE_SECRET_KEY,
      "received", "expected", "issues"]) expect(logs).not.toContain(value);
  });
  it.each([null, [], "provider-private-sentinel"])("keeps non-object provider responses private (%#)", async body => {
    const spy = vi.spyOn(globalThis, "fetch").mockResolvedValue(Response.json(body));
    const response = await worker.fetch(await signedRequest(), env);
    expect(response.status).toBe(503);
    expect(["UPSTREAM_UNAVAILABLE", "CHECKOUT_UNAVAILABLE"]).toContain(diagnostic()[0].errorCode);
    expect(spy).toHaveBeenCalledTimes(1);
    expect(JSON.stringify(vi.mocked(console.info).mock.calls)).not.toContain("provider-private-sentinel");
  });
  it("does not emit schema field diagnostics outside staging", async () => {
    const spy = vi.spyOn(globalThis, "fetch").mockResolvedValue(Response.json({ ...payment, live_mode: "invalid" }));
    await expect(readPayment("456", config, "private")).rejects.toThrow("CHECKOUT_UNAVAILABLE");
    expect(spy).toHaveBeenCalledTimes(1);
    expect(diagnostic()).toEqual([]);
  });
  it("records completed processing only after persistence", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(Response.json(payment)).mockResolvedValueOnce(Response.json({ applied: true }));
    expect((await worker.fetch(await signedRequest(), env)).status).toBe(200);
    expect(diagnostic()[0]).toMatchObject({ stage: "completed", signatureVerified: true, status: 200 });
    expect(diagnostic()[0]).not.toHaveProperty("errorCode");
    expect(diagnostic()[0]).not.toHaveProperty("rejectedPaymentFields");
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

describe("staging APP_USR test-account payments", () => {
  const testEnv = { ...env, MP_COLLECTOR_ID: "3272217989" };
  const testConfig = { ...config, collectorId: testEnv.MP_COLLECTOR_ID };
  const testPayment = { ...payment, live_mode: true, collector_id: 3272217989, payer: { id: 3272217991 } };
  const seller = { id: 3272217989, site_id: "MLB", tags: ["test_user"] };
  const buyer = { id: 3272217991, site_id: "MLB" };
  const diagnostic = () => vi.mocked(console.info).mock.calls.map(([line]) => JSON.parse(String(line)))
    .find(line => line.event === "webhook_diagnostic");

  it.each([3272217991, "3272217991"])("verifies test seller and panel-approved buyer without a public test marker (%s)", async payerId => {
    const spy = vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(Response.json({ ...testPayment, payer: { id: payerId } }))
      .mockResolvedValueOnce(Response.json(seller)).mockResolvedValueOnce(Response.json(buyer))
      .mockResolvedValueOnce(Response.json({ applied: true }));
    const response = await worker.fetch(await signedRequest(), testEnv);
    expect(response.status).toBe(200);
    expect(spy.mock.calls.map(([url]) => String(url))).toEqual([
      "https://api.mercadopago.com/v1/payments/456", "https://api.mercadopago.com/users/me",
      "https://api.mercadopago.com/users/3272217991", `${env.SUPABASE_URL}/rest/v1/rpc/apply_checkout_pro_payment_v2`]);
    expect(JSON.parse(String(spy.mock.calls[3][1]?.body))).toEqual({ p_application_id: config.applicationId, p_test_application_id: config.testApplicationId, p_attempt_id: attemptId,
      p_payment_id: "456", p_amount_cents: 12345, p_status: "approved", p_refunded_cents: 0,
      p_updated_at: payment.date_last_updated });
    expect(diagnostic()).toMatchObject({ stage: "completed", signatureVerified: true, status: 200 });
    for (const secret of [env.MP_ACCESS_TOKEN, env.MP_WEBHOOK_SECRET, env.SUPABASE_SECRET_KEY]) {
      expect(JSON.stringify(vi.mocked(console.info).mock.calls)).not.toContain(secret);
    }
  });
  it.each([
    { collector_id: 999 }, { payer: { id: 999 } }, { payer: { id: 3272217989 } }, { payer: undefined },
    { id: 999 }, { external_reference: "invalid" }, { currency_id: "USD" },
    { transaction_amount: 1.001 }, { transaction_amount_refunded: 999 },
    { live_mode: "true" }, { live_mode: null }, { live_mode: undefined },
  ])("rejects payment/account mismatches before extra lookups and persistence (%#)", async override => {
    const spy = vi.spyOn(globalThis, "fetch").mockResolvedValue(Response.json({ ...testPayment, ...override }));
    expect((await worker.fetch(await signedRequest(), testEnv)).status).toBe(503);
    expect(spy).toHaveBeenCalledTimes(1);
  });
  it("requires test-account proof even when the payment matches a different configured collector", async () => {
    const spy = vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(Response.json({ ...testPayment, collector_id: 999 }))
      .mockResolvedValueOnce(Response.json({ id: 999, site_id: "MLB", tags: [] }))
      .mockResolvedValueOnce(Response.json(buyer));
    await expect(readPayment("456", { ...testConfig, collectorId: "999" }, "private"))
      .rejects.toThrow("PROVIDER_TEST_ACCOUNT_UNVERIFIED");
    expect(spy).toHaveBeenCalledTimes(3);
  });
  it.each([
    [ { ...seller, tags: [] }, buyer ],
    [ { ...seller, site_id: "MLA" }, buyer ], [ seller, { ...buyer, site_id: "MLA" } ],
    [ { ...seller, id: 999 }, buyer ], [ seller, { ...buyer, id: 999 } ],
    [ null, buyer ], [ seller, null ],
  ])("requires matching identities/countries and the authenticated seller's test marker (%#)", async (sellerBody, buyerBody) => {
    const spy = vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(Response.json(testPayment))
      .mockResolvedValueOnce(Response.json(sellerBody)).mockResolvedValueOnce(Response.json(buyerBody));
    expect((await worker.fetch(await signedRequest(), testEnv)).status).toBe(503);
    expect(spy).toHaveBeenCalledTimes(3);
    expect(diagnostic()).toMatchObject({ stage: "provider_lookup_and_validation",
      errorCode: "PROVIDER_TEST_ACCOUNT_UNVERIFIED", signatureVerified: true });
  });
  it.each([{ user_type: "normal", tags: ["normal"] }, { tags: [] }])("does not require a test marker in the panel-approved buyer's public profile (%#)", async publicFields => {
    const spy = vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(Response.json(testPayment))
      .mockResolvedValueOnce(Response.json(seller)).mockResolvedValueOnce(Response.json({ ...buyer, ...publicFields }))
      .mockResolvedValueOnce(Response.json({ applied: true }));
    expect((await worker.fetch(await signedRequest(), testEnv)).status).toBe(200);
    expect(spy).toHaveBeenCalledTimes(4);
    expect(diagnostic()).toMatchObject({ stage: "completed", status: 200 });
    expect(diagnostic()).not.toHaveProperty("rejectedTestAccountChecks");
  });
  it.each([0, 1])("does not persist when identity lookup %i fails", async failed => {
    const spy = vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(Response.json(testPayment))
      .mockResolvedValueOnce(Response.json(seller, { status: failed === 0 ? 403 : 200 }))
      .mockResolvedValueOnce(Response.json(buyer, { status: failed === 1 ? 403 : 200 }));
    expect((await worker.fetch(await signedRequest(), testEnv)).status).toBe(503);
    expect(spy).toHaveBeenCalledTimes(3);
    expect(diagnostic()).toMatchObject({ errorCode: "UPSTREAM_UNAVAILABLE", upstreamStatus: 403 });
  });
  it("records fixed failed identity checks without serializing profiles or received markers", async () => {
    const spy = vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(Response.json(testPayment))
      .mockResolvedValueOnce(Response.json({ ...seller, tags: ["identity-private-sentinel"],
        email: "email-private-sentinel", "key-private-sentinel": "value-private-sentinel" }))
      .mockResolvedValueOnce(Response.json({ ...buyer, site_id: "country-private-sentinel" }));
    expect((await worker.fetch(await signedRequest(), testEnv)).status).toBe(503);
    expect(diagnostic().rejectedTestAccountChecks).toEqual(["seller_test_marker", "buyer_site_id"]);
    expect(spy).toHaveBeenCalledTimes(3);
    const logs = JSON.stringify(vi.mocked(console.info).mock.calls);
    for (const value of ["identity-private-sentinel", "email-private-sentinel", "key-private-sentinel",
      "value-private-sentinel", "country-private-sentinel", "received", "expected", "issues"])
      expect(logs).not.toContain(value);
  });
  it("identifies a non-approved payer without logging its identifier or querying profiles", async () => {
    const spy = vi.spyOn(globalThis, "fetch").mockResolvedValue(Response.json({ ...testPayment, payer: { id: 987654321 } }));
    expect((await worker.fetch(await signedRequest(), testEnv)).status).toBe(503);
    expect(diagnostic().rejectedTestAccountChecks).toEqual(["payment_buyer"]);
    expect(spy).toHaveBeenCalledTimes(1);
    expect(JSON.stringify(vi.mocked(console.info).mock.calls)).not.toContain("987654321");
  });
  it("keeps the signature mandatory for test-account payments", async () => {
    const spy = vi.spyOn(globalThis, "fetch");
    expect((await worker.fetch(await signedRequest("456", "wrong"), testEnv)).status).toBe(401);
    expect(spy).not.toHaveBeenCalled();
  });
  it.each(["production", "local"])("blocks the exception outside staging (%s)", async APP_ENV => {
    const spy = vi.spyOn(globalThis, "fetch");
    expect((await worker.fetch(await signedRequest(), { ...testEnv, APP_ENV })).status).toBe(503);
    expect(spy).not.toHaveBeenCalled();
  });
  it("never acknowledges a test-account payment if database validation fails", async () => {
    const spy = vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(Response.json(testPayment))
      .mockResolvedValueOnce(Response.json(seller)).mockResolvedValueOnce(Response.json(buyer))
      .mockResolvedValueOnce(Response.json({}, { status: 400 }));
    expect((await worker.fetch(await signedRequest(), testEnv)).status).toBe(503);
    expect(spy).toHaveBeenCalledTimes(4);
    expect(diagnostic()).toMatchObject({ stage: "database_apply", upstreamStatus: 400 });
  });
});

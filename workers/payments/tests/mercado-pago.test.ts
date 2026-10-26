import { afterEach, describe, expect, it, vi } from "vitest";
import { createPreference, readPreference, verifyWebhook } from "../src/checkout-pro";
import { getProviderPayment } from "../src/mercado-pago";
import { readConfig } from "../src/config";

const config = { returnOrigin: "https://shop.example.com", webhookUrl: "https://api.example.com/webhooks/mercadopago",
  collectorId: "123", applicationId: "456", testApplicationId: "789", testBuyerId: "124" };
const snapshot = { orderId: "11111111-1111-4111-8111-111111111111", attemptId: "22222222-2222-4222-8222-222222222222",
  totalCents: 12345, currency: "BRL" as const, method: "credit_card" as const, expiresAt: "2099-01-01T00:00:00Z" };
const preference = { id: "pref-123", client_id: "789", collector_id: 123,
  external_reference: snapshot.attemptId, metadata: { order_id: snapshot.orderId },
  sandbox_init_point: "https://sandbox.mercadopago.com.br/checkout/v1/redirect?pref_id=pref-123" };

afterEach(() => vi.restoreAllMocks());

describe("official backend SDK and new application isolation", () => {
  it("creates with server amounts and a stable attempt key, and confines the token to Mercado Pago", async () => {
    const fetcher = vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(Response.json({ id: 123 }))
      .mockResolvedValueOnce(Response.json(preference));
    expect(await createPreference(snapshot, config, "private-token")).toEqual({ preferenceId: preference.id,
      checkoutUrl: preference.sandbox_init_point });
    const [url, init] = fetcher.mock.calls[1];
    expect(url).toBe("https://api.mercadopago.com/checkout/preferences/");
    const headers = new Headers(init?.headers);
    expect(headers.get("Authorization")).toBe("Bearer private-token");
    expect(headers.get("X-Idempotency-Key")).toBe(snapshot.attemptId);
    expect(init?.redirect).toBe("manual");
    const body = JSON.parse(String(init?.body));
    expect(body.items[0].unit_price).toBe(123.45);
    expect(body.metadata.integration_application_id).toBe("456");
    expect(body.statement_descriptor).toBe("NADANORMAL");
    expect(body).not.toHaveProperty("access_token");
  });

  it.each([429, 500, 503])("never repeats preference POST after HTTP %i", async status => {
    const fetcher = vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(Response.json({ id: 123 }))
      .mockResolvedValueOnce(Response.json({ message: "provider-private-data" }, { status }));
    await expect(createPreference(snapshot, config, "private-token")).rejects.toMatchObject({
      code: "UPSTREAM_UNAVAILABLE", upstreamStatus: status, message: "UPSTREAM_UNAVAILABLE" });
    expect(fetcher).toHaveBeenCalledTimes(2);
  });

  it("does not retry a network failure or expose its details", async () => {
    const fetcher = vi.spyOn(globalThis, "fetch").mockRejectedValue(new Error("private-token-and-url"));
    await expect(getProviderPayment("private-token", "123")).rejects.toMatchObject({ code: "UPSTREAM_UNAVAILABLE" });
    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  it("does not follow a provider redirect", async () => {
    const fetcher = vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(null, {
      status: 302, headers: { Location: "https://untrusted.example.com" } }));
    await expect(getProviderPayment("private-token", "123")).rejects.toMatchObject({ upstreamStatus: 302 });
    expect(fetcher).toHaveBeenCalledTimes(1);
    expect(fetcher.mock.calls[0][1]?.redirect).toBe("manual");
  });

  it.each([
    { client_id: "old-application" }, { client_id: undefined }, { collector_id: 999 },
    { id: "different-preference" },
    { metadata: { order_id: "44444444-4444-4444-8444-444444444444" } },
    { sandbox_init_point: `${preference.sandbox_init_point}&pref_id=duplicate` },
  ])("rejects old/unverifiable preferences even if already persisted (%#)", async override => {
    const fetcher = vi.spyOn(globalThis, "fetch").mockResolvedValue(Response.json({ ...preference, ...override }));
    await expect(readPreference(preference.id, config, "private-token", snapshot.orderId)).rejects.toThrow();
    expect(fetcher).toHaveBeenCalledTimes(1);
    expect(fetcher.mock.calls[0][1]?.method).toBe("GET");
  });

  it("expires the order before sending a preference POST", async () => {
    const fetcher = vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(Response.json({ id: 123 }));
    await expect(createPreference({ ...snapshot, expiresAt: "2020-01-01T00:00:00Z" }, config, "private-token"))
      .rejects.toThrow("ORDER_EXPIRED");
    expect(fetcher).toHaveBeenCalledTimes(1);
  });
  it("does not save a preference associated with a different payment attempt", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(Response.json({ id: 123 }))
      .mockResolvedValueOnce(Response.json({ ...preference,
        external_reference: "44444444-4444-4444-8444-444444444444" }));
    await expect(createPreference(snapshot, config, "private-token")).rejects.toThrow("PROVIDER_PREFERENCE_MISMATCH");
  });
});

describe("documented webhook signature header pairs", () => {
  async function signedHeader() {
    const timestamp = String(Math.floor(Date.now() / 1000));
    const key = await crypto.subtle.importKey("raw", new TextEncoder().encode("signature-secret"),
      { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
    const signature = await crypto.subtle.sign("HMAC", key,
      new TextEncoder().encode(`id:123;request-id:request-123;ts:${timestamp};`));
    const mac = Array.from(new Uint8Array(signature), b => b.toString(16).padStart(2, "0")).join("");
    return { timestamp, mac };
  }
  const req = (signature: string) => new Request("https://api.example.com/webhooks/mercadopago?data.id=123", {
    headers: { "x-signature": signature, "x-request-id": "request-123" } });

  it("accepts a valid signature with reversed header fields and separator whitespace", async () => {
    const { timestamp, mac } = await signedHeader();
    expect(await verifyWebhook(req(`v1=${mac}, ts=${timestamp}`), "signature-secret")).toBe("123");
  });
  it("rejects ambiguous repeated signature fields", async () => {
    const { timestamp, mac } = await signedHeader();
    for (const header of [`ts=${timestamp},ts=${timestamp},v1=${mac}`, `ts=${timestamp},v1=${mac},v1=${mac}`])
      await expect(verifyWebhook(req(header), "signature-secret")).rejects.toThrow("WEBHOOK_SIGNATURE_INVALID");
  });
});

describe("explicit application and test identity configuration", () => {
  const bindings = { APP_ENV: "staging", PAYMENTS_ENABLED: "false", ALLOWED_ORIGINS: config.returnOrigin,
    SUPABASE_URL: "https://db.example.com", SUPABASE_PUBLISHABLE_KEY: "public", SUPABASE_SECRET_KEY: "fake-secret",
    MP_ACCESS_TOKEN: "fake-token", MP_WEBHOOK_SECRET: "fake-signature", CHECKOUT_PRO_MODE: "sandbox",
    CHECKOUT_RETURN_ORIGIN: config.returnOrigin, CHECKOUT_WEBHOOK_URL: config.webhookUrl, MP_COLLECTOR_ID: "123",
    MP_APPLICATION_ID: "456", MP_TEST_APPLICATION_ID: "789", MP_TEST_BUYER_ID: "124" };
  it.each(["MP_APPLICATION_ID", "MP_TEST_APPLICATION_ID", "MP_TEST_BUYER_ID"])("rejects missing %s", field => {
    expect(() => readConfig({ ...bindings, [field]: "" })).toThrow("CONFIGURATION_INVALID");
  });
  it("does not allow seller and buyer, or main and test application, to be the same", () => {
    expect(() => readConfig({ ...bindings, MP_TEST_BUYER_ID: "123" })).toThrow();
    expect(() => readConfig({ ...bindings, MP_TEST_APPLICATION_ID: "456" })).toThrow();
  });
});

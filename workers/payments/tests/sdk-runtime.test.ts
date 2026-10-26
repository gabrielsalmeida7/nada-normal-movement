import { execFileSync } from "node:child_process";
import { createHmac } from "node:crypto";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { Miniflare, convertV4MiniflareOptions, Response as UpstreamResponse } from "miniflare";
import { beforeAll, describe, expect, it } from "vitest";

const settings = JSON.parse(readFileSync("workers/payments/wrangler.jsonc", "utf8"));
const orderId = "11111111-1111-4111-8111-111111111111";
const attemptId = "22222222-2222-4222-8222-222222222222";
const owner = "33333333-3333-4333-8333-333333333333";
const preferenceId = "3272217989-sdk-runtime-test";
const checkoutUrl = `https://sandbox.mercadopago.com.br/checkout/v1/redirect?pref_id=${preferenceId}`;
const host = "https://pagamentos-staging.nadanormalclub.com.br";
const json = (value: unknown, status = 200) => UpstreamResponse.json(value, { status });

// Exercise the actual Wrangler bundle, including its CommonJS/Node shims, rather
// than replacing the SDK or testing only in the Node.js Vitest process.
beforeAll(() => {
  const configDir = mkdtempSync(join(tmpdir(), "nn-sdk-runtime-"));
  try {
    execFileSync(process.execPath, ["workers/payments/scripts/run.mjs", "build"], {
      env: { ...process.env, XDG_CONFIG_HOME: configDir }, stdio: "pipe", timeout: 60000,
    });
  } finally { rmSync(configDir, { recursive: true, force: true }); }
}, 65000);

async function fixture(options: { providerFailure?: boolean; oldApplication?: boolean; dbFailure?: boolean; reconciliation?: boolean; testApplicationSecret?: boolean } = {}) {
  const calls: { url: string; method: string }[] = [];
  let claimed = false;
  let saved = options.oldApplication === true;
  const preference = { id: preferenceId, collector_id: 3272217989,
    external_reference: attemptId, metadata: { order_id: orderId },
    client_id: options.oldApplication ? "760330644412079" : "5855568499515388", sandbox_init_point: checkoutUrl,
    expires: true, expiration_date_to: new Date(Date.now() + 1800000).toISOString() };
  const mf = new Miniflare(convertV4MiniflareOptions({ modules: true,
    scriptPath: resolve("workers/payments/.wrangler/build/index.js"),
    compatibilityDate: settings.compatibility_date, compatibilityFlags: settings.compatibility_flags,
    bindings: { ...settings.env.staging.vars, PAYMENTS_ENABLED: "true",
      CHECKOUT_RECONCILIATION_ENABLED: options.reconciliation ? "true" : "false", SUPABASE_SECRET_KEY: "fake-db-secret",
      MP_ACCESS_TOKEN: "fake-mp-token", MP_WEBHOOK_SECRET: "fake-webhook-secret",
      ...(options.testApplicationSecret ? { MP_TEST_WEBHOOK_SECRET: "fake-test-application-secret" } : {}) },
    outboundService: async request => {
      const url = new URL(request.url);
      calls.push({ url: request.url, method: request.method });
      if (url.origin === "https://bcemyxasbcwcrbinfguu.supabase.co") {
        expect(request.headers.get("Authorization")).not.toBe("Bearer fake-mp-token");
        if (url.pathname === "/auth/v1/user") return json({ id: owner });
        if (url.pathname.endsWith("/claim_checkout_reconciliation")) return json({ attemptId, orderId,
          leaseId: "44444444-4444-4444-8444-444444444444", totalCents: 12345,
          expiresAt: preference.expiration_date_to, preferenceId: null, knownPaymentIds: [] });
        if (url.pathname.endsWith("/save_reconciled_checkout_preference")) return json({ saved: true });
        if (url.pathname.endsWith("/finish_checkout_reconciliation")) {
          const body = await request.json() as { p_result: string };
          expect(body.p_result).toBe("paid");
          return json({ outcome: "paid" });
        }
        if (url.pathname.endsWith("/claim_checkout_pro_v2")) {
          if (saved) return json({ state: "ready", preferenceId, checkoutUrl });
          if (claimed) return json({ state: "busy" });
          claimed = true;
          return json({ state: "claimed", snapshot: { orderId, attemptId, totalCents: 12345,
            currency: "BRL", method: "credit_card", expiresAt: new Date(Date.now() + 1800000).toISOString() } });
        }
        if (url.pathname.endsWith("/finish_checkout_pro")) { saved = true; return json({ saved: true }); }
        if (url.pathname.endsWith("/apply_checkout_pro_payment_v2")) {
          const body = await request.json() as Record<string, unknown>;
          expect(body).toMatchObject({ p_attempt_id: attemptId, p_payment_id: "456", p_amount_cents: 12345 });
          return options.dbFailure ? json({ message: "private-db-error" }, 500) : json({ applied: true });
        }
      }
      if (url.origin === "https://api.mercadopago.com") {
        expect(request.headers.get("Authorization")).toBe("Bearer fake-mp-token");
        if (url.pathname === "/users/me") return json({ id: 3272217989, site_id: "MLB", tags: ["test_user"] });
        if (url.pathname === "/users/3272217991") return json({ id: 3272217991, site_id: "MLB" });
        if (url.pathname === "/checkout/preferences/search") return json({ total: 1, elements: [
          { id: preferenceId, external_reference: attemptId } ] });
        if (url.pathname === "/v1/payments/search") return json({ paging: { total: 1, offset: 0 },
          results: [{ id: 456, external_reference: attemptId }] });
        if (url.pathname === "/checkout/preferences/" && request.method === "POST") {
          expect(request.headers.get("X-Idempotency-Key")).toBe(attemptId);
          const body = await request.json() as { items: { unit_price: number }[] };
          expect(body.items[0].unit_price).toBe(123.45);
          return options.providerFailure ? json({ message: "private-provider-error" }, 503) : json(preference, 201);
        }
        if (url.pathname === `/checkout/preferences/${preferenceId}`) return json(preference);
        if (url.pathname === "/v1/payments/456") return json({ id: 456, external_reference: attemptId,
          collector_id: 3272217989, payer: { id: 3272217991 }, live_mode: true, currency_id: "BRL",
          transaction_amount: 123.45, transaction_amount_refunded: 0, status: "approved",
          date_last_updated: new Date().toISOString() });
      }
      throw new Error("Unexpected outbound request in SDK fixture");
    },
  }));
  const create = () => mf.dispatchFetch(`${host}/v1/checkout/preferences`, { method: "POST",
    headers: { Authorization: "Bearer fake-user-jwt", "Content-Type": "application/json" }, body: JSON.stringify({ orderId }) });
  const webhook = () => {
    const ts = String(Math.floor(Date.now() / 1000));
    const signature = createHmac("sha256", options.testApplicationSecret ? "fake-test-application-secret" : "fake-webhook-secret")
      .update(`id:456;request-id:request-123;ts:${ts};`).digest("hex");
    return mf.dispatchFetch(`${host}/webhooks/mercadopago?data.id=456`, { method: "POST",
      headers: { "x-request-id": "request-123", "x-signature": `v1=${signature}, ts=${ts}` },
      body: JSON.stringify({ type: "payment", data: { id: "456" } }) });
  };
  return { mf, calls, create, webhook };
}

describe("official SDK in the actual Cloudflare Worker bundle", () => {
  it("accepts the test-application signature in workerd and still verifies the actual payment before persistence", async () => {
    const f = await fixture({ testApplicationSecret: true });
    try {
      expect((await f.webhook()).status).toBe(200);
      expect(f.calls.some(c => c.url.endsWith("/v1/payments/456"))).toBe(true);
      expect(f.calls.at(-1)?.url).toContain("apply_checkout_pro_payment_v2");
      expect(f.calls.filter(c => c.url.includes("api.mercadopago.com")).every(c => c.method === "GET")).toBe(true);
    } finally { await f.mf.dispose(); }
  });
  it("recovers a lost preference and webhook through the scheduled handler using only provider GETs", async () => {
    const f = await fixture({ reconciliation: true });
    try {
      const worker = await f.mf.getWorker();
      await worker.scheduled({ cron: "*/5 * * * *" });
      expect(f.calls.some(c => c.url.includes("save_reconciled_checkout_preference"))).toBe(true);
      expect(f.calls.some(c => c.url.includes("apply_checkout_pro_payment_v2"))).toBe(true);
      expect(f.calls.at(-1)?.url).toContain("finish_checkout_reconciliation");
      expect(f.calls.filter(c => c.url.includes("api.mercadopago.com")).every(c => c.method === "GET")).toBe(true);
    } finally { await f.mf.dispose(); }
  });
  it("does not perform reconciliation I/O when the scheduled handler is disabled", async () => {
    const f = await fixture();
    try {
      const worker = await f.mf.getWorker();
      await worker.scheduled({ cron: "*/5 * * * *" });
      expect(f.calls).toEqual([]);
    } finally { await f.mf.dispose(); }
  });
  it("persists one preference and verifies a replay with GET rather than another POST", async () => {
    const f = await fixture();
    try {
      const first = await f.create();
      expect(first.status).toBe(201);
      expect(await first.json()).toEqual({ preferenceId, checkoutUrl,
        applicationId: "4897243060269064", testApplicationId: "5855568499515388", orderId });
      expect((await f.create()).status).toBe(200);
      expect(f.calls.filter(c => c.url.includes("/checkout/preferences/") && c.method === "POST")).toHaveLength(1);
    } finally { await f.mf.dispose(); }
  });
  it("leaves an uncertain claim blocked and does not repeat a failed SDK POST", async () => {
    const f = await fixture({ providerFailure: true });
    try {
      expect((await f.create()).status).toBe(503);
      const repeat = await f.create();
      expect(repeat.status).toBe(409);
      expect(await repeat.json()).toEqual({ error: { code: "CHECKOUT_RECONCILIATION_REQUIRED" } });
      expect(f.calls.filter(c => c.url.includes("/checkout/preferences/") && c.method === "POST")).toHaveLength(1);
      expect(f.calls.some(c => c.url.includes("finish_checkout_pro"))).toBe(false);
    } finally { await f.mf.dispose(); }
  });
  it("does not return a stored preference from the previous application", async () => {
    const f = await fixture({ oldApplication: true });
    try {
      const response = await f.create();
      expect(response.status).toBe(503);
      expect(await response.json()).toEqual({ error: { code: "PROVIDER_APPLICATION_MISMATCH" } });
      expect(f.calls.some(c => c.method === "POST" && c.url.includes("api.mercadopago.com"))).toBe(false);
    } finally { await f.mf.dispose(); }
  });
  it("validates the signature, reads through the SDK, attests test identities and persists before ACK", async () => {
    const f = await fixture();
    try {
      const response = await f.webhook();
      expect(response.status).toBe(200);
      expect(await response.json()).toEqual({ received: true });
      expect(f.calls.filter(c => c.url.endsWith("/v1/payments/456"))).toHaveLength(1);
      expect(f.calls.at(-1)?.url).toContain("apply_checkout_pro_payment_v2");
    } finally { await f.mf.dispose(); }
  });
  it("does not acknowledge webhook processing when database persistence fails", async () => {
    const f = await fixture({ dbFailure: true });
    try {
      const response = await f.webhook();
      expect(response.status).toBe(503);
      const body = await response.text();
      expect(body).not.toContain("received");
      expect(body).not.toContain("private-db-error");
    } finally { await f.mf.dispose(); }
  });
});

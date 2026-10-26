import { readFileSync } from "node:fs";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import worker from "../src/index";
import { readConfig, REQUIRED_SECRETS } from "../src/config";
import { validateDeployment } from "../src/deployment";
import { frontendEnv } from "../../storefront/scripts/staging.mjs";

const config = JSON.parse(readFileSync("workers/payments/wrangler.jsonc", "utf8"));
const storefront = JSON.parse(readFileSync("workers/storefront/wrangler.jsonc", "utf8"));
const origin = "https://nada-normal-storefront-staging.gabriel-salmeida7.workers.dev";
const host = "https://pagamentos-staging.nadanormalclub.com.br";
// Fake secrets only: no remote service, real token, shared DB or account setup.
const bindings = { ...config.env.staging.vars,
  ...Object.fromEntries(REQUIRED_SECRETS.map(name => [name, `test-only-${name}`])) };

beforeEach(() => {
  vi.spyOn(globalThis, "fetch").mockRejectedValue(new Error("NO_UPSTREAM_IN_CONFIGURATION_TESTS"));
});
afterEach(() => vi.restoreAllMocks());

describe("versioned payment staging configuration with sandbox submissions", () => {
  it("targets the verified account, Worker, domain and seller", () => {
    expect(config.account_id).toBe(storefront.account_id);
    expect(config.env.staging.name).toBe("nada-normal-payments-staging");
    expect(config.env.staging.routes).toEqual([{ pattern: new URL(host).hostname, custom_domain: true }]);
    expect(() => validateDeployment("staging", config.env.staging)).not.toThrow();
    expect(readConfig(bindings)).toEqual({ environment: "staging", paymentsEnabled: false,
      origins: [origin], checkoutPro: { returnOrigin: origin,
        webhookUrl: `${host}/webhooks/mercadopago`, collectorId: "3272217989",
        applicationId: "4897243060269064", testApplicationId: "5855568499515388", testBuyerId: "3272217991" } });
  });
  it("uses the same public Supabase settings as the storefront, never secrets in vars", () => {
    const vars = config.env.staging.vars;
    expect(vars.SUPABASE_URL).toBe(storefront.env.staging.vars.SUPABASE_URL);
    expect(vars.SUPABASE_PUBLISHABLE_KEY).toBe(storefront.env.staging.vars.SUPABASE_PUBLISHABLE_KEY);
    expect(vars.SUPABASE_PUBLISHABLE_KEY).toMatch(/^sb_publishable_/);
    expect(Object.keys(vars).filter(name => /SECRET|TOKEN/.test(name))).toEqual([]);
    expect(config.env.staging.secrets.required).toEqual([...REQUIRED_SECRETS]);
  });
  it("enables only the authorized sandbox frontend, keeping production/previews/schedulers closed", () => {
    expect(frontendEnv(storefront.env.staging.vars, {}).VITE_CHECKOUT_PRO_ENABLED).toBe("false");
    expect(frontendEnv(storefront.env.production.vars, {}).VITE_CHECKOUT_PRO_ENABLED).toBe("false");
    expect(config.env.production.vars.PAYMENTS_ENABLED).toBe("false");
    expect(config.env.staging.workers_dev).toBe(false);
    expect(config.env.staging.preview_urls).toBe(false);
    expect(config.env.staging.triggers?.crons ?? []).toEqual([]);
    expect(config.main).toBe("src/index.ts");
  });
  it("serves health and exact-origin preflight locally without upstream", async () => {
    const fetch = vi.spyOn(globalThis, "fetch");
    const health = await worker.fetch(new Request(`${host}/health`), bindings);
    expect(health.status).toBe(200);
    expect(await health.json()).toMatchObject({ environment: "staging", paymentsEnabled: false });
    const preflight = await worker.fetch(new Request(`${host}/v1/checkout/preferences`, {
      method: "OPTIONS", headers: { Origin: origin, "Access-Control-Request-Method": "POST",
        "Access-Control-Request-Headers": "authorization,content-type,idempotency-key" },
    }), { ...bindings, PAYMENTS_ENABLED: "true" });
    expect(preflight.status).toBe(204);
    expect(preflight.headers.get("Access-Control-Allow-Origin")).toBe(origin);
    expect(fetch).not.toHaveBeenCalled();
  });
  it("rejects unauthenticated creation before any Supabase/provider request", async () => {
    const fetch = vi.spyOn(globalThis, "fetch");
    const response = await worker.fetch(new Request(`${host}/v1/checkout/preferences`, {
      method: "POST", headers: { Origin: origin, "Content-Type": "application/json" },
      body: JSON.stringify({ orderId: "40000000-0000-4000-8000-000000000001" }),
    }), { ...bindings, PAYMENTS_ENABLED: "true" });
    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({ error: { code: "UNAUTHORIZED" } });
    expect(fetch).not.toHaveBeenCalled();
  });
  it.each(["https://example.vercel.app", "https://nadanormalclub.com.br", `${origin}.evil.example`])(
    "rejects origin %s without calling upstream", async unauthorized => {
      const fetch = vi.spyOn(globalThis, "fetch");
      const response = await worker.fetch(new Request(`${host}/health`, { headers: { Origin: unauthorized } }), bindings);
      expect(response.status).toBe(403);
      expect(fetch).not.toHaveBeenCalled();
    });
  it("requires authentication to read status even when submissions are off", async () => {
    const fetch = vi.spyOn(globalThis, "fetch");
    const response = await worker.fetch(new Request(
      `${host}/v1/checkout/orders/40000000-0000-4000-8000-000000000001/status`,
      { headers: { Origin: origin } }), bindings);
    expect(response.status).toBe(401);
    expect(fetch).not.toHaveBeenCalled();
  });
});

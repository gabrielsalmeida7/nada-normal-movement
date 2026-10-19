import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import worker from "../src/index";
import { readConfig, REQUIRED_SECRETS, type Bindings } from "../src/config";

const local: Bindings = {
  APP_ENV: "local", PAYMENTS_ENABLED: "false", ALLOWED_ORIGINS: "http://localhost:8080",
};
const staging: Bindings = {
  APP_ENV: "staging", PAYMENTS_ENABLED: "false", ALLOWED_ORIGINS: "https://staging.example.com",
  SUPABASE_URL: "https://database.example.com", SUPABASE_PUBLISHABLE_KEY: "public-test-binding",
  SUPABASE_SECRET_KEY: "private-database-sentinel", MP_ACCESS_TOKEN: "private-mp-sentinel",
  MP_WEBHOOK_SECRET: "private-signature-sentinel",
};
const request = (path: string, init?: RequestInit, env = local) =>
  worker.fetch(new Request(`https://worker.example.com${path}`, init), env);

beforeEach(() => vi.spyOn(console, "info").mockImplementation(() => {}));
afterEach(() => vi.restoreAllMocks());

describe("health and configuration", () => {
  it.each([local, staging, { ...staging, APP_ENV: "production" }])("reports local readiness without upstream calls: $APP_ENV", async (env) => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    const res = await request("/health", undefined, env);
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ status: "ok", service: "nada-normal-payments",
      version: "0.2.0", environment: env.APP_ENV, paymentsEnabled: false });
    expect(res.headers.get("Cache-Control")).toBe("no-store");
    expect(res.headers.get("X-Request-Id")).toMatch(/^[\da-f-]{36}$/);
    expect(fetchSpy).not.toHaveBeenCalled();
  });
  it.each(REQUIRED_SECRETS)("fails closed without %s", async (key) => {
    const res = await request("/health", undefined, { ...staging, [key]: "" });
    expect(res.status).toBe(503);
    expect(await res.json()).toEqual({ error: { code: "CONFIGURATION_INVALID" } });
  });
  it.each([undefined, "", "true", "FALSE", "0"])("does not enable charging with flag %s", async (value) => {
    const res = await request("/v1/checkout/payments", { method: "POST" }, { ...local, PAYMENTS_ENABLED: value });
    expect(res.status).toBe(503);
  });
  it.each([
    { APP_ENV: undefined }, { APP_ENV: "preview" }, { ALLOWED_ORIGINS: "*" },
    { ALLOWED_ORIGINS: "https://staging.example.com/path" },
    { ALLOWED_ORIGINS: "https://*.example.com" },
    { ALLOWED_ORIGINS: "https://user:password@staging.example.com" },
    { ALLOWED_ORIGINS: "http://staging.example.com" }, { ALLOWED_ORIGINS: "https://localhost" },
    { ALLOWED_ORIGINS: "https://staging.example.com," }, { SUPABASE_URL: "http://database.example.com" },
    { SUPABASE_PUBLISHABLE_KEY: " " },
  ])("rejects invalid remote configuration %#", (override) => {
    expect(() => readConfig({ ...staging, ...override })).toThrow("CONFIGURATION_INVALID");
  });
  it("does not allow remote origins in local mode", () => {
    expect(() => readConfig({ ...local, ALLOWED_ORIGINS: "https://production.example.com" })).toThrow();
  });
});

describe("CORS", () => {
  it("allows the exact configured origin and required checkout headers", async () => {
    const res = await request("/v1/checkout/orders", { method: "OPTIONS", headers: {
      Origin: "https://staging.example.com", "Access-Control-Request-Method": "POST",
      "Access-Control-Request-Headers": "Authorization, Content-Type, Idempotency-Key",
    } }, staging);
    expect(res.status).toBe(204);
    expect(res.headers.get("Access-Control-Allow-Origin")).toBe("https://staging.example.com");
    expect(res.headers.get("Access-Control-Allow-Credentials")).toBeNull();
    expect(res.headers.get("Access-Control-Allow-Methods")).toBe("POST");
  });
  it.each(["https://evil.example.com", "https://staging.example.com.evil.com", "null", "http://localhost:8080"])("rejects %s in staging", async (origin) => {
    const res = await request("/health", { headers: { Origin: origin } }, staging);
    expect(res.status).toBe(403);
    expect(res.headers.get("Access-Control-Allow-Origin")).toBeNull();
  });
  it.each([
    { "Access-Control-Request-Method": "DELETE" },
    { "Access-Control-Request-Method": "POST", "Access-Control-Request-Headers": "x-injected" },
  ])("rejects unsupported preflight %#", async (headers) => {
    const res = await request("/v1/checkout/orders", { method: "OPTIONS", headers: { Origin: "http://localhost:8080", ...headers } });
    expect(res.status).toBe(403);
  });
  it("does not accept a browser preflight for the provider webhook", async () => {
    const res = await request("/webhooks/mercadopago", { method: "OPTIONS", headers: {
      Origin: "http://localhost:8080", "Access-Control-Request-Method": "POST",
    } });
    expect(res.status).toBe(403);
  });
});

describe("closed scaffold and safe telemetry", () => {
  it.each(["/v1/checkout/quote", "/v1/checkout/orders", "/v1/checkout/payments", "/webhooks/mercadopago"])("never calls upstream or acknowledges payment on %s", async (path) => {
    const spy = vi.spyOn(globalThis, "fetch");
    const res = await request(path, { method: "POST", body: "not even json" });
    expect(res.status).toBe(503);
    expect((await res.json()).error.code).toBe(path.endsWith("payments") ? "PAYMENTS_DISABLED" : "NOT_IMPLEMENTED");
    expect(spy).not.toHaveBeenCalled();
  });
  it("keeps status unavailable instead of inventing order state", async () => {
    expect((await request("/v1/checkout/orders/00000000-0000-4000-8000-000000000000/status")).status).toBe(503);
  });
  it("returns 404/405 for unsupported routes and methods", async () => {
    expect((await request("/missing")).status).toBe(404);
    const res = await request("/health", { method: "POST" });
    expect(res.status).toBe(405);
    expect(res.headers.get("Allow")).toBe("GET");
  });
  it("excludes private bindings and request data from responses and logs", async () => {
    const res = await request("/v1/checkout/payments?token=query-sentinel", { method: "POST", headers: {
      Authorization: "Bearer jwt-sentinel", "X-Request-Id": "untrusted-sentinel",
    }, body: JSON.stringify({ paymentToken: "opaque-sentinel", email: "private-sentinel@example.com" }) }, staging);
    const output = await res.text() + JSON.stringify([...res.headers]) + JSON.stringify(vi.mocked(console.info).mock.calls);
    for (const sentinel of ["query-sentinel", "jwt-sentinel", "untrusted-sentinel", "opaque-sentinel", "private-sentinel@example.com", ...REQUIRED_SECRETS.map((k) => staging[k]!)]) {
      expect(output).not.toContain(sentinel);
    }
    expect(console.info).toHaveBeenCalledOnce();
    const log = JSON.parse(vi.mocked(console.info).mock.calls[0][0]);
    expect(Object.keys(log).sort()).toEqual(["event", "requestId", "status"]);
  });
  it("does not echo malformed config values on failure", async () => {
    const res = await request("/health", undefined, { ...staging, ALLOWED_ORIGINS: "invalid-secret-sentinel" });
    expect(res.status).toBe(503);
    expect(await res.text()).not.toContain("invalid-secret-sentinel");
  });
});

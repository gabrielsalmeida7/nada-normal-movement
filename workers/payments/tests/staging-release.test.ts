import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { validatePaymentRelease } from "../scripts/staging-release.mjs";

const config = JSON.parse(readFileSync("workers/payments/wrangler.jsonc", "utf8"));
describe("protected Workers Builds payment release", () => {
  it("requires the exact bounded cron only when reconciliation is explicitly enabled", () => {
    const stage = structuredClone(config);
    stage.env.staging.vars.CHECKOUT_RECONCILIATION_ENABLED = "true";
    expect(() => validatePaymentRelease(stage)).toThrow();
    stage.env.staging.triggers = { crons: ["*/5 * * * *"] };
    expect(() => validatePaymentRelease(stage)).not.toThrow();
    stage.env.staging.vars.CHECKOUT_RECONCILIATION_ENABLED = "false";
    expect(() => validatePaymentRelease(stage)).toThrow();
  });
  it("persists only application logs in staging, not automatic invocation logs or traces", () => {
    expect(config.observability.enabled).toBe(false);
    expect(config.env.production.observability?.enabled ?? config.observability.enabled).toBe(false);
    expect(config.env.staging.observability).toEqual({ enabled: true, head_sampling_rate: 1,
      redact_query_string: true, logs: { enabled: true, head_sampling_rate: 1, invocation_logs: false, persist: true },
      traces: { enabled: false } });
  });
  it.each(["false", "true"])("accepts explicit sandbox activation %s only in the protected staging target", value => {
    const stage = structuredClone(config);
    stage.env.staging.vars.PAYMENTS_ENABLED = value;
    expect(() => validatePaymentRelease(stage)).not.toThrow();
    expect(() => validatePaymentRelease(config)).not.toThrow();
  });
  it.each([
    { PAYMENTS_ENABLED: "yes" }, { APP_ENV: "production" }, { CHECKOUT_PRO_MODE: "production" },
    { MP_COLLECTOR_ID: "123" }, { ALLOWED_ORIGINS: "https://evil.example.com" },
    { MP_APPLICATION_ID: "6344920694868580" }, { MP_TEST_APPLICATION_ID: "760330644412079" },
    { MP_TEST_BUYER_ID: "123" },
    { SUPABASE_URL: "https://other.supabase.co" }, { MP_ACCESS_TOKEN: "not-allowed" },
  ])("rejects unsafe bindings %j", vars => {
    const bad = structuredClone(config);
    Object.assign(bad.env.staging.vars, vars);
    expect(() => validatePaymentRelease(bad)).toThrow();
  });
  it.each([
    { name: "nada-normal-payments-production" },
    { routes: [{ pattern: "nadanormalclub.com.br", custom_domain: true }] },
    { triggers: { crons: ["* * * * *"] } }, { preview_urls: true },
    { observability: { enabled: true, logs: { invocation_logs: true } } },
  ])("rejects exposure or targets out of scope %j", override => {
    const bad = structuredClone(config);
    Object.assign(bad.env.staging, override);
    expect(() => validatePaymentRelease(bad)).toThrow();
  });
});

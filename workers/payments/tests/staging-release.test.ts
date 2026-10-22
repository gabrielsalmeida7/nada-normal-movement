import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { validatePaymentRelease, validateKnownBootstrap } from "../scripts/staging-release.mjs";

const config = JSON.parse(readFileSync("workers/payments/wrangler.jsonc", "utf8"));
describe("protected Workers Builds payment release", () => {
  const versions = [{ id: "26b0b315-ca7f-4144-b7b1-ed7ff0d45e14" }];
  const deployments = [{ versions: [{ version_id: "ed97243c-3c59-4e23-bf7f-75b38a277513", percentage: 100 }] }];
  it("allows initial replacement only for the immutable known bootstrap versions", () => {
    expect(() => validateKnownBootstrap(versions, deployments)).not.toThrow();
  });
  it("uses creation times instead of assuming CLI/API ordering", () => {
    const v = [{ id: "older", metadata: { created_on: "2026-10-19" } },
      { ...versions[0], metadata: { created_on: "2026-10-21" } }];
    const d = [{ versions: [], created_on: "2026-10-19" },
      { ...deployments[0], created_on: "2026-10-21" }];
    expect(() => validateKnownBootstrap(v, d)).not.toThrow();
    expect(() => validateKnownBootstrap(v.toReversed(), d.toReversed())).not.toThrow();
  });
  it.each([
    [[], deployments], [[{ id: "unexpected" }], deployments],
    [versions, []], [versions, [{ versions: [{ version_id: "unexpected", percentage: 100 }] }]],
    [versions, [{ versions: [{ version_id: deployments[0].versions[0].version_id, percentage: 50 }] }]],
  ])("rejects remote changes during bootstrap %#", (v, d) => {
    expect(() => validateKnownBootstrap(v, d)).toThrow();
  });
  it("accepts only the prepared disabled sandbox deployment", () => {
    expect(() => validatePaymentRelease(config)).not.toThrow();
  });
  it.each([
    { PAYMENTS_ENABLED: "true" }, { APP_ENV: "production" }, { CHECKOUT_PRO_MODE: "production" },
    { MP_COLLECTOR_ID: "123" }, { ALLOWED_ORIGINS: "https://evil.example.com" },
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
  ])("rejects exposure or targets out of scope %j", override => {
    const bad = structuredClone(config);
    Object.assign(bad.env.staging, override);
    expect(() => validatePaymentRelease(bad)).toThrow();
  });
});

import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { validateStaging, validateBuildContext, frontendEnv } from "../scripts/staging.mjs";

const config = JSON.parse(readFileSync("workers/storefront/wrangler.jsonc", "utf8"));
const head = "a".repeat(40);
const context = { WORKERS_CI: "1", WORKERS_CI_BRANCH: "home-v2-contraste", WORKERS_CI_COMMIT_SHA: head };

describe("guard de staging", () => {
  it("aceita somente a configuração de staging preparada", () => {
    expect(validateStaging(config).APP_ENV).toBe("staging");
    expect(() => validateBuildContext(context, head)).not.toThrow();
  });
  it.each([
    { WORKERS_CI_BRANCH: "main" }, { WORKERS_CI_BRANCH: "feature/checkout" },
    { WORKERS_CI_BRANCH: "" }, { WORKERS_CI: "" }, { WORKERS_CI_COMMIT_SHA: "b".repeat(40) },
  ])("recusa branch/commit/contexto incorreto %j", override => {
    expect(() => validateBuildContext({ ...context, ...override }, head)).toThrow();
  });
  it.each([
    { SHOP_API_ENABLED: "true" }, { APP_ENV: "production" }, { RESERVATION_PROCESSOR_ENABLED: "true" },
    { SUPABASE_URL: "https://other.supabase.co" }, { SUPABASE_PUBLISHABLE_KEY: "sb_secret_not-public" },
    { MP_ACCESS_TOKEN: "not-allowed" },
  ])("recusa bindings inseguros %j", vars => {
    const bad = structuredClone(config);
    Object.assign(bad.env.staging.vars, vars);
    expect(() => validateStaging(bad)).toThrow();
  });
  it.each([
    { name: "nada-normal-storefront-production" },
    { routes: [{ pattern: "www.nadanormalclub.com.br", custom_domain: true }] },
    { workers_dev: false }, { preview_urls: true }, { triggers: { crons: ["* * * * *"] } },
  ])("recusa worker/domínio/agendamento fora do escopo %j", override => {
    const bad = structuredClone(config);
    Object.assign(bad.env.staging, override);
    expect(() => validateStaging(bad)).toThrow();
  });
  it("força frontend com chave pública e sem Checkout Pro mesmo com override herdado", () => {
    const result = frontendEnv(validateStaging(config), {
      VITE_CHECKOUT_PRO_ENABLED: "true", VITE_SUPABASE_ANON_KEY: "sb_secret_wrong",
      VITE_PAYMENTS_API_URL: "https://wrong.example.com",
    });
    expect(result.VITE_CHECKOUT_PRO_ENABLED).toBe("false");
    expect(result.VITE_PAYMENTS_API_URL).toBe("");
    expect(result.VITE_SUPABASE_ANON_KEY).toMatch(/^sb_publishable_/);
  });
});

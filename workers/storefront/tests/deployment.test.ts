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
  it.each(["false", "true"])("permite APIs %s somente no staging protegido", value => {
    const stage = structuredClone(config);
    stage.env.staging.vars.SHOP_API_ENABLED = value;
    stage.env.staging.vars.CHECKOUT_PRO_ENABLED = "false";
    expect(validateStaging(stage).SHOP_API_ENABLED).toBe(value);
    expect(frontendEnv(validateStaging(stage), {}).VITE_CHECKOUT_PRO_ENABLED).toBe("false");
    expect(stage.env.production.vars.SHOP_API_ENABLED).toBe("false");
  });
  it.each([
    { WORKERS_CI_BRANCH: "main" }, { WORKERS_CI_BRANCH: "feature/checkout" },
    { WORKERS_CI_BRANCH: "" }, { WORKERS_CI: "" }, { WORKERS_CI_COMMIT_SHA: "b".repeat(40) },
  ])("recusa branch/commit/contexto incorreto %j", override => {
    expect(() => validateBuildContext({ ...context, ...override }, head)).toThrow();
  });
  it.each([
    { SHOP_API_ENABLED: "yes" }, { SHOP_API_ENABLED: true },
    { APP_ENV: "production" }, { RESERVATION_PROCESSOR_ENABLED: "true" },
    { SUPABASE_URL: "https://other.supabase.co" }, { SUPABASE_PUBLISHABLE_KEY: "sb_secret_not-public" },
    { MP_ACCESS_TOKEN: "not-allowed" },
    { CHECKOUT_PRO_ENABLED: "yes" }, { CHECKOUT_PRO_MODE: "production" },
    { PAYMENTS_API_URL: "https://wrong.example.com" }, { SHOP_API_ENABLED: "false" },
    { MP_PUBLIC_KEY: "" }, { MP_PUBLIC_KEY: "APP_USR-another-app" }, { MP_PUBLIC_KEY: "sb_secret_wrong" },
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
  it("forces the explicitly authorized sandbox with public keys over inherited overrides", () => {
    const result = frontendEnv(validateStaging(config), {
      VITE_CHECKOUT_PRO_ENABLED: "false", VITE_SUPABASE_ANON_KEY: "sb_secret_wrong",
      VITE_PAYMENTS_API_URL: "https://wrong.example.com",
      VITE_MERCADO_PAGO_PUBLIC_KEY: "wrong-key", VITE_APP_ENV: "production", VITE_CHECKOUT_PRO_MODE: "production",
    });
    expect(result.VITE_CHECKOUT_PRO_ENABLED).toBe("true");
    expect(result.VITE_PAYMENTS_API_URL).toBe("https://pagamentos-staging.nadanormalclub.com.br");
    expect(result.VITE_SUPABASE_ANON_KEY).toMatch(/^sb_publishable_/);
    expect(result.VITE_MERCADO_PAGO_PUBLIC_KEY).toBe(config.env.staging.vars.MP_PUBLIC_KEY);
    expect(result.VITE_APP_ENV).toBe("staging");
    expect(result.VITE_CHECKOUT_PRO_MODE).toBe("sandbox");
  });
  it("keeps rollback disabled despite inherited activation", () => {
    const stage = structuredClone(config);
    stage.env.staging.vars.CHECKOUT_PRO_ENABLED = "false";
    const result = frontendEnv(validateStaging(stage), { VITE_CHECKOUT_PRO_ENABLED: "true" });
    expect(result.VITE_CHECKOUT_PRO_ENABLED).toBe("false");
    expect(result.VITE_PAYMENTS_API_URL).toBe("");
    expect(result.VITE_MERCADO_PAGO_PUBLIC_KEY).toBe("");
    expect(result.VITE_CHECKOUT_PRO_MODE).toBe("");
  });
  it("never enables checkout in local or production builds", () => {
    for (const APP_ENV of ["local", "production"]) {
      expect(() => frontendEnv({ ...config.env.staging.vars, APP_ENV }, {})).toThrow();
    }
    expect(frontendEnv(config.env.production.vars, {}).VITE_CHECKOUT_PRO_ENABLED).toBe("false");
  });
});

import { describe, expect, it } from "vitest";
import { validateDeployment, type DeploymentConfig } from "../src/deployment";
import { REQUIRED_SECRETS } from "../src/config";

const config: DeploymentConfig = {
  workers_dev: false, preview_urls: false,
  routes: [{ pattern: "payments-staging.example.com", custom_domain: true }],
  vars: { APP_ENV: "staging", PAYMENTS_ENABLED: "false", ALLOWED_ORIGINS: "https://staging.example.com",
    SUPABASE_URL: "https://database.example.com", SUPABASE_PUBLISHABLE_KEY: "public-test-binding" },
  secrets: { required: [...REQUIRED_SECRETS] },
};

describe("deployment guard", () => {
  it("accepts a configured staging target without using credential values", () => {
    expect(() => validateDeployment("staging", config)).not.toThrow();
  });
  it.each(REQUIRED_SECRETS)("rejects missing required secret declaration %s", (name) => {
    expect(() => validateDeployment("staging", { ...config, secrets: { required: REQUIRED_SECRETS.filter((s) => s !== name) } })).toThrow();
  });
  it.each(REQUIRED_SECRETS)("rejects secrets stored in vars: %s", (name) => {
    expect(() => validateDeployment("staging", { ...config, vars: { ...config.vars, [name]: "must-not-be-here" } })).toThrow();
  });
  it.each(["local", "", "preview", "production"])("rejects mismatched target %s", (target) => {
    expect(() => validateDeployment(target, config)).toThrow();
  });
  it.each([
    { workers_dev: true }, { preview_urls: true }, { routes: [] },
    { routes: [{ pattern: "*.example.com", custom_domain: true }] },
    { routes: [{ pattern: "payments.example.com/*", custom_domain: false }] },
    { vars: { ...config.vars, PAYMENTS_ENABLED: "true" } },
    { vars: { ...config.vars, ALLOWED_ORIGINS: "" } },
  ])("rejects incomplete/unsafe configuration %#", (override) => {
    expect(() => validateDeployment("staging", { ...config, ...override })).toThrow();
  });
});

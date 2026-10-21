import { createHash } from "node:crypto";
import { Miniflare, convertV4MiniflareOptions, Response as UpstreamResponse } from "miniflare";
import { describe, expect, it } from "vitest";
import { buildCollectorProbe } from "../diagnostics/collector-probe.mjs";

const challenge = "ephemeral-test-challenge";
const hash = createHash("sha256").update(challenge).digest("hex");
const url = "https://pagamentos-staging.nadanormalclub.com.br/__ops/verify-collector";

async function run(options: { authorization?: string; method?: string; origin?: string;
  env?: Record<string, string>; upstreamStatus?: number; data?: unknown; path?: string } = {}) {
  const calls: { url: string; method: string; authorization: string | null }[] = [];
  const runtime = new Miniflare(convertV4MiniflareOptions({ modules: true,
    script: buildCollectorProbe(hash, Date.now() + 60000), compatibilityDate: "2026-10-19",
    bindings: { APP_ENV: "staging", PAYMENTS_ENABLED: "false", MP_ACCESS_TOKEN: "fake-mp-secret", ...options.env },
    outboundService: async request => {
      calls.push({ url: request.url, method: request.method, authorization: request.headers.get("Authorization") });
      return UpstreamResponse.json(options.data ?? { id: 3272217989, site_id: "MLB", tags: ["test_user"],
        email: "private@example.test", nickname: "PRIVATE", access_token: "fake-upstream-secret" },
      { status: options.upstreamStatus ?? 200 });
    },
  }));
  try {
    const headers: Record<string, string> = { "X-Collector-Probe": options.authorization ?? challenge };
    if (options.origin) headers.Origin = options.origin;
    const response = await runtime.dispatchFetch(options.path ?? url, { method: options.method ?? "POST", headers });
    const body = await response.json();
    return { status: response.status, cache: response.headers.get("Cache-Control"), body, calls };
  } finally { await runtime.dispose(); }
}

describe("temporary collector verification in workerd", () => {
  it("only GETs identity with inherited credential and returns boolean allowlist", async () => {
    const result = await run();
    expect(result.status).toBe(200);
    expect(result.body).toEqual({ verified: true, collectorMatches: true, countryMatches: true,
      testUser: true, upstreamStatus: 200, paymentsEnabled: false });
    expect(result.calls).toEqual([{ url: "https://api.mercadopago.com/users/me", method: "GET",
      authorization: "Bearer fake-mp-secret" }]);
    expect(result.cache).toBe("private, no-store");
    expect(JSON.stringify(result.body)).not.toMatch(/private@example|PRIVATE|secret/);
  });
  it.each([
    { authorization: "wrong" }, { origin: "https://nadanormalclub.com.br" }, { method: "GET" },
    { env: { APP_ENV: "production" } }, { env: { PAYMENTS_ENABLED: "true" } },
    { path: "https://pagamentos-staging.nadanormalclub.com.br/v1/checkout/preferences" },
    { path: `${url}?token=not-allowed` },
  ])("denies unsafe requests without upstream %j", async options => {
    const result = await run(options);
    expect([401, 404]).toContain(result.status);
    expect(result.calls).toHaveLength(0);
  });
  it.each([401, 403, 302, 500])("does not follow redirects or leak upstream errors %i", async status => {
    const result = await run({ upstreamStatus: status });
    expect(result.status).toBe(502);
    expect(result.body).toEqual({ verified: false, upstreamStatus: status, paymentsEnabled: false });
  });
  it.each([
    { id: 123, site_id: "MLB", tags: ["test_user"] },
    { id: 3272217989, site_id: "MLA", tags: ["test_user"] },
    { id: 3272217989, site_id: "MLB", tags: [] },
  ])("rejects mismatched seller/country/test account %j", async data => {
    const result = await run({ data });
    expect(result.status).toBe(409);
    expect(result.body).toMatchObject({ verified: false, paymentsEnabled: false });
  });
  it("requires short-lived configuration", () => {
    expect(() => buildCollectorProbe(hash, Date.now() - 1)).toThrow();
    expect(() => buildCollectorProbe(hash, Date.now() + 20 * 60 * 1000)).toThrow();
    expect(() => buildCollectorProbe("wrong", Date.now() + 60000)).toThrow();
  });
});

import { Miniflare, convertV4MiniflareOptions, Response as UpstreamResponse } from "miniflare";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const USER = "10000000-0000-4000-8000-000000000001";
const VARIANT = "20000000-0000-4000-8000-000000000001";
const ADDRESS = "30000000-0000-4000-8000-000000000001";
const ORDER = "40000000-0000-4000-8000-000000000001";
const ATTEMPT = "50000000-0000-4000-8000-000000000001";
const payload = { items: [{ variantId: VARIANT, quantity: 1 }], shippingAddressId: ADDRESS, paymentMethod: "pix" };
const order = { orderId: ORDER, paymentAttemptId: ATTEMPT, status: "created", currency: "BRL",
  subtotalCents: 18990, shippingCents: 2000, totalCents: 20990,
  reservationExpiresAt: "2026-10-22T00:00:00Z", shippingRuleVersion: 1 };
const bindings = { APP_ENV: "staging", SHOP_API_ENABLED: "true", RESERVATION_PROCESSOR_ENABLED: "false",
  SUPABASE_URL: "https://db.example.com", SUPABASE_PUBLISHABLE_KEY: "public-test",
  SUPABASE_SECRET_KEY: "secret-test", RESERVATION_PROCESSOR_SECRET: "processor-secret-test-123" };

describe("Storefront em workerd, sem serviços reais", () => {
  let mf: Miniflare;
  let databaseError: string | null;
  let malformedResult: boolean;
  const calls: Array<{ path: string; body: unknown; authorization: string | null }> = [];
  const output = (data: unknown, status = 200) => new UpstreamResponse(JSON.stringify(data), {
    status, headers: { "Content-Type": "application/json" },
  });

  beforeAll(async () => {
    mf = new Miniflare(convertV4MiniflareOptions({
      modules: true,
      scriptPath: resolve("workers/storefront/.wrangler/build/index.js"),
      compatibilityDate: "2026-10-19", compatibilityFlags: ["nodejs_compat"], bindings,
      assets: { directory: resolve("dist"), binding: "ASSETS",
        run_worker_first: ["/api", "/api/*", "/health"],
        routerConfig: { has_user_worker: true },
        assetConfig: { not_found_handling: "single-page-application" } },
      outboundService: async request => {
        const url = new URL(request.url);
        if (url.origin !== bindings.SUPABASE_URL) throw new Error("Unexpected upstream");
        const body = request.body ? await request.json() : null;
        const authorization = request.headers.get("authorization");
        calls.push({ path: url.pathname + url.search, body, authorization });
        if (url.pathname === "/auth/v1/user") {
          if (authorization === "Bearer invalid-token") return output({ message: "Invalid JWT" }, 401);
          return output({ id: USER, email: "test@example.com", app_metadata: {
            role: authorization === "Bearer admin-token" ? "admin" : "customer",
          }, user_metadata: { role: "admin" } });
        }
        if (url.pathname === "/auth/v1/admin/users") return output({ users: [{ id: USER,
          email: "test@example.com", created_at: "2026-10-21T00:00:00Z", app_metadata: { provider: "email" } }],
          total: 1, aud: "authenticated" });
        if (url.pathname === "/rest/v1/profiles") return output([
          { id: USER, full_name: "Teste", phone: "11999999999", cpf: "12345678901" },
        ]);
        if (url.pathname === "/rest/v1/product_variants") return output([{
          id: VARIANT, product_id: ADDRESS, size: "M", color_name: null, stock_quantity: 5, is_active: true,
          products: { id: ADDRESS, name: "Teste", price_cents: 18990, is_active: true },
        }]);
        if (databaseError) return output({ message: databaseError, code: "P0001" }, 400);
        if (malformedResult) return output({ unexpected: true });
        if (url.pathname.endsWith("/create_checkout_order")) return output(order);
        if (url.pathname.endsWith("/compute_shipping_cents")) return output(2000);
        if (url.pathname.endsWith("/cancel_checkout_order")) return output({ orderId: ORDER, released: true,
          stockUnits: 1, reservationState: "released", financialStatus: "cancelled" });
        if (url.pathname.endsWith("/process_expired_reservations")) return output({ processed: 1, released: 1,
          alreadyReleased: 0, rescheduled: 0, failed: 0 });
        throw new Error("Unexpected upstream path");
      },
    }));
    await mf.ready;
  });
  beforeEach(() => { calls.length = 0; databaseError = null; malformedResult = false; });
  afterAll(async () => { await mf?.dispose(); });

  function request(path: string, body?: unknown, headers: Record<string, string> = {}, method = "POST") {
    return mf.dispatchFetch(`https://shop.example.com${path}`, {
      method, headers: { Authorization: "Bearer customer-token", "Content-Type": "application/json",
        "Idempotency-Key": "checkout-request-123", ...headers },
      ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
    });
  }

  it("serve rotas profundas e assets sem fallback Vercel", async () => {
    for (const path of ["/", "/produto/teste", "/conta", "/checkout/sucesso", "/checkout/pendente", "/checkout/erro", "/admin/pedidos"]) {
      const response = await request(path, undefined, { "Sec-Fetch-Mode": "navigate" }, "GET");
      expect(response.status).toBe(200);
      expect(response.headers.get("content-type")).toContain("text/html");
      expect(await response.text()).toContain('<div id="root">');
    }
    expect(calls).toHaveLength(0);
  });
  it.each(["/api", "/api/inexistente"])("%s não vira HTML mesmo na navegação", async path => {
    const response = await request(path, undefined, { "Sec-Fetch-Mode": "navigate" }, "GET");
    expect(response.status).toBe(404);
    expect(await response.json()).toEqual({ code: "NOT_FOUND", error: "Rota não encontrada." });
  });
  it.each(["quote", "order", "cancel", "expire-reservations"])("recusa método incorreto em %s", async route => {
    const response = await request(`/api/checkout/${route}`, undefined, {}, "GET");
    expect(response.status).toBe(405);
    expect(response.headers.get("allow")).toBe("POST");
  });
  it("retorna health sem atestar credenciais externas", async () => {
    const response = await request("/health", undefined, {}, "GET");
    expect(await response.json()).toMatchObject({ status: "ok", environment: "staging", apiEnabled: true });
    expect(calls).toHaveLength(0);
  });
  it("recusa sessão ausente, inválida e origem diferente", async () => {
    expect((await request("/api/checkout/order", payload, { Authorization: "" })).status).toBe(401);
    expect((await request("/api/checkout/order", payload, { Authorization: "Bearer invalid-token" })).status).toBe(401);
    expect((await request("/api/checkout/order", payload, { Origin: "https://other.example.com" })).status).toBe(403);
    expect(calls.every(c => c.path === "/auth/v1/user")).toBe(true);
  });
  it("preserva IDs e chave idempotente; ignora usuário e dinheiro do navegador", async () => {
    const body = { ...payload, userId: "attacker", totalCents: 1,
      items: [{ variantId: VARIANT, quantity: 1, priceCents: 1 }] };
    for (let i = 0; i < 2; i++) {
      const response = await request("/api/checkout/order", body);
      expect(response.status).toBe(200);
      expect(response.headers.get("cache-control")).toBe("private, no-store");
      expect(response.headers.get("x-request-id")).toBeTruthy();
      expect(await response.json()).toEqual(order);
    }
    const rpcs = calls.filter(c => c.path.endsWith("/create_checkout_order"));
    expect(rpcs).toHaveLength(2);
    expect(rpcs[0].body).toEqual({ p_user_id: USER, p_idempotency_key: "checkout-request-123",
      p_items: payload.items, p_shipping_address_id: ADDRESS, p_payment_method: "pix" });
    expect(rpcs[1].body).toEqual(rpcs[0].body);
    // The mock checks transport replay, not Postgres locking/transaction deduplication.
  });
  it("exige chave e payload válidos antes de criar pedido", async () => {
    expect((await request("/api/checkout/order", payload, { "Idempotency-Key": "" })).status).toBe(400);
    expect((await request("/api/checkout/order", { ...payload, items: [] })).status).toBe(400);
    expect(calls.filter(c => c.path.endsWith("/create_checkout_order"))).toHaveLength(0);
  });
  it("limita corpo mesmo sem Content-Length", async () => {
    const response = await request("/api/checkout/order", { padding: "x".repeat(13 * 1024) });
    expect(response.status).toBe(413);
  });
  it("recusa JSON inválido", async () => {
    const response = await mf.dispatchFetch("https://shop.example.com/api/checkout/order", {
      method: "POST", headers: { Authorization: "Bearer customer-token" }, body: "{",
    });
    expect(response.status).toBe(400);
  });
  it.each([["INSUFFICIENT_STOCK", 409], ["IDEMPOTENCY_CONFLICT", 409], ["SHIPPING_ADDRESS_UNAVAILABLE", 422]])(
    "preserva erro transacional %s", async (message, status) => {
      databaseError = message;
      const response = await request("/api/checkout/order", payload);
      expect(response.status).toBe(status);
      expect(await response.json()).toMatchObject({ code: message });
    },
  );
  it("não devolve resultado financeiro malformado", async () => {
    malformedResult = true;
    expect((await request("/api/checkout/order", payload)).status).toBe(503);
  });
  it("orça preço do catálogo e frete da RPC", async () => {
    const response = await request("/api/checkout/quote", { items: payload.items, shippingState: "SP", totalCents: 1 });
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ totalCents: 20990, subtotalCents: 18990, shippingCents: 2000 });
    expect(calls.find(c => c.path.endsWith("/compute_shipping_cents"))?.body)
      .toEqual({ p_state: "SP", p_subtotal_cents: 18990 });
  });
  it("cancela como o dono autenticado, não o userId recebido", async () => {
    const response = await request("/api/checkout/cancel", { orderId: ORDER, userId: "attacker" });
    expect(response.status).toBe(200);
    expect(calls.find(c => c.path.endsWith("/cancel_checkout_order"))?.body)
      .toEqual({ p_order_id: ORDER, p_user_id: USER });
  });
  it.each([["ORDER_NOT_FOUND", 404], ["ORDER_NOT_CANCELLABLE", 409]])("preserva proteção de cancelamento %s", async (message, status) => {
    databaseError = message;
    expect((await request("/api/checkout/cancel", { orderId: ORDER })).status).toBe(status);
  });
  it("protege expiração e usa limite validado", async () => {
    expect((await request("/api/checkout/expire-reservations", {})).status).toBe(401);
    expect((await request("/api/checkout/expire-reservations", {}, { "x-reservation-processor-secret": "wrong-secret" })).status).toBe(401);
    const headers = { "x-reservation-processor-secret": bindings.RESERVATION_PROCESSOR_SECRET };
    expect((await request("/api/checkout/expire-reservations", { limit: 51 }, headers)).status).toBe(400);
    expect((await request("/api/checkout/expire-reservations", { limit: 5 }, headers)).status).toBe(200);
    expect(calls.find(c => c.path.endsWith("/process_expired_reservations"))?.body)
      .toEqual({ p_worker_id: "reservation-processor", p_limit: 5 });
  });
  it("admin exige app_metadata, não user_metadata editável", async () => {
    const response = await request("/api/admin/users", undefined, {}, "GET");
    expect(response.status).toBe(403);
    expect(calls.some(c => c.path.startsWith("/auth/v1/admin"))).toBe(false);
  });
  it("admin mascara CPF e limita paginação", async () => {
    const response = await request("/api/admin/users?page=0&perPage=999", undefined, { Authorization: "Bearer admin-token" }, "GET");
    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.users[0]).toMatchObject({ cpf: "123.***.***-01", fullName: "Teste", email: "test@example.com" });
    expect(JSON.stringify(data)).not.toContain("12345678901");
    const adminCall = calls.find(c => c.path.startsWith("/auth/v1/admin/users"));
    expect(adminCall?.path).toContain("page=1");
    expect(adminCall?.path).toContain("per_page=50");
    expect(response.headers.get("cache-control")).toBe("private, no-store");
  });
  it("configuração versionada deixa APIs/agendamento e acesso público desligados", () => {
    const config = JSON.parse(readFileSync("workers/storefront/wrangler.jsonc", "utf8"));
    for (const environment of [config, config.env.staging, config.env.production]) {
      expect(environment.vars.SHOP_API_ENABLED).toBe("false");
      expect(environment.vars.RESERVATION_PROCESSOR_ENABLED).toBe("false");
      expect(environment.workers_dev).toBe(false);
      expect(environment.preview_urls).toBe(false);
      expect(environment.triggers?.crons ?? []).toHaveLength(0);
    }
  });
  it.each([
    { ...bindings, SHOP_API_ENABLED: "false" },
    { ...bindings, APP_ENV: "production" },
    { ...bindings, APP_ENV: "unknown" },
    { ...bindings, SUPABASE_SECRET_KEY: "" },
  ])("falha fechado com ambiente/flag/secrets inválidos: $APP_ENV / $SHOP_API_ENABLED", async environment => {
    const closed = new Miniflare(convertV4MiniflareOptions({
      modules: true, scriptPath: resolve("workers/storefront/.wrangler/build/index.js"),
      compatibilityDate: "2026-10-19", compatibilityFlags: ["nodejs_compat"], bindings: environment,
      outboundService: async () => { throw new Error("No upstream expected"); },
    }));
    try {
      const response = await closed.dispatchFetch("https://shop.example.com/api/checkout/order", {
        method: "POST", headers: { Authorization: "Bearer customer-token" }, body: JSON.stringify(payload),
      });
      expect(response.status).toBe(503);
      expect(response.headers.get("cache-control")).toBe("private, no-store");
    } finally { await closed.dispose(); }
  });
});

// Opt-in remote smoke test. Creates one QA buyer/address and one cancelled order.
// No Mercado Pago calls, service keys, changes to Auth settings or production.
import assert from "node:assert/strict";
import { randomBytes, randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import { createClient } from "@supabase/supabase-js";

const origin = "https://nada-normal-storefront-staging.gabriel-salmeida7.workers.dev";
const projectUrl = "https://bcemyxasbcwcrbinfguu.supabase.co";
const variantId = "4e040960-e674-489c-887b-18af3eb0a33d";
const productId = "f2022593-ae32-4f21-8549-359f18ee0ee4";
const paymentsOrigin = "https://pagamentos-staging.nadanormalclub.com.br";
const checkPaymentStatus = process.argv[3] === "--with-payment-status";
if (process.argv[2] !== "--execute" ||
    ![3, 4].includes(process.argv.length) || (process.argv.length === 4 && !checkPaymentStatus)) {
  throw new Error("Explicit --execute required: creates QA records in shared staging database.");
}
const config = JSON.parse(await readFile(new URL("../workers/storefront/wrangler.jsonc", import.meta.url), "utf8"));
const vars = config.env.staging.vars;
assert.equal(vars.SUPABASE_URL, projectUrl);
assert.equal(vars.APP_ENV, "staging");
assert.equal(vars.SHOP_API_ENABLED, "true");
assert.match(vars.SUPABASE_PUBLISHABLE_KEY, /^sb_publishable_/);
const nativeFetch = globalThis.fetch;
// Reject all non-allowlisted destinations, including the payment provider.
const safeFetch = (input, init = {}) => {
  const url = new URL(input instanceof Request ? input.url : input);
  assert.ok([origin, projectUrl, ...(checkPaymentStatus ? [paymentsOrigin] : [])].includes(url.origin), "Unexpected remote destination");
  return nativeFetch(input, { ...init, redirect: "error", signal: AbortSignal.timeout(20000) });
};
const client = createClient(projectUrl, vars.SUPABASE_PUBLISHABLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false },
  global: { fetch: safeFetch },
});
const runId = randomUUID();
const report = { runId, idempotencyKey: `qa-checkout-${runId}`, checks: [], paymentsCalled: false };
const log = () => console.log(JSON.stringify(report));
const ok = (name, detail) => {
  report.checks.push({ name, passed: true, ...detail });
  console.log(JSON.stringify({ runId, check: name, passed: true, ...detail }));
};
let token;
let userId;
let orderId;
let stockBefore;
let failed = false;
const must = (result, stage) => {
  if (result.error) throw new Error(`${stage}: ${result.error.code ?? result.error.status ?? "failed"}`);
  return result.data;
};
const stock = async () => {
  const row = must(await client.from("product_variants").select("stock_quantity,product_id,is_active")
    .eq("id", variantId).single(), "stock");
  assert.equal(row.product_id, productId);
  assert.equal(row.is_active, true);
  return row.stock_quantity;
};
const api = async (path, body, key) => {
  const response = await safeFetch(`${origin}${path}`, {
    method: body === undefined ? "GET" : "POST",
    headers: { Authorization: `Bearer ${token}`, Origin: origin, "Content-Type": "application/json",
      ...(key ? { "Idempotency-Key": key } : {}) },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
  assert.match(response.headers.get("content-type") ?? "", /application\/json/);
  assert.equal(response.headers.get("cache-control"), "private, no-store");
  return { status: response.status, body: await response.json() };
};
const paymentStatus = async id => {
  const response = await safeFetch(`${paymentsOrigin}/v1/checkout/orders/${id}/status`, {
    headers: { Origin: origin, Authorization: `Bearer ${token}` },
  });
  assert.equal(response.headers.get("access-control-allow-origin"), origin);
  assert.equal(response.headers.get("cache-control"), "no-store");
  return { status: response.status, body: await response.json() };
};

try {
  const health = await (await safeFetch(`${origin}/health`)).json();
  assert.equal(health.environment, "staging");
  assert.equal(health.apiEnabled, true);
  assert.equal(health.configured, true);
  const settings = await (await safeFetch(`${projectUrl}/auth/v1/settings`, {
    headers: { apikey: vars.SUPABASE_PUBLISHABLE_KEY },
  })).json();
  assert.equal(settings.mailer_autoconfirm, true, "Stop: email verification would be needed");
  assert.equal(settings.disable_signup, false);
  stockBefore = await stock();
  assert.ok(stockBefore >= 2, "Insufficient stock for smoke test");
  report.stockBefore = stockBefore;
  ok("staging_preflight");
  if (checkPaymentStatus) {
    const paymentHealth = await (await safeFetch(`${paymentsOrigin}/health`)).json();
    assert.equal(paymentHealth.environment, "staging");
    assert.equal(paymentHealth.version, "0.2.0");
    assert.equal(paymentHealth.paymentsEnabled, false);
    ok("payment_submissions_disabled");
  }

  const signup = must(await client.auth.signUp({
    email: `nn-checkout-qa-${runId}@example.com`,
    password: `${randomBytes(32).toString("hex")}aA1!`,
    options: { data: { full_name: "TESTE TÉCNICO CHECKOUT — NÃO ENVIAR", qa_run: runId } },
  }), "signup");
  userId = signup.user?.id;
  token = signup.session?.access_token;
  assert.ok(userId && token, "Test signup did not return a session");
  report.userId = userId;
  assert.notEqual(signup.user.app_metadata?.role, "admin");
  ok("qa_buyer_authenticated");

  must(await client.from("profiles").update({ full_name: "TESTE TÉCNICO CHECKOUT — NÃO ENVIAR" })
    .eq("id", userId), "profile");
  const address = must(await client.from("addresses").insert({ user_id: userId,
    label: `QA ${runId}`, street: "Rua Fictícia de Teste QA", number: "42",
    neighborhood: "Teste", city: "São Paulo", state: "SP", zip_code: "01001000" })
    .select("id").single(), "address");
  report.addressId = address.id;
  const items = [{ variantId, quantity: 1 }];
  const quote = await api("/api/checkout/quote", { items, shippingState: "SP", totalCents: 1 });
  assert.equal(quote.status, 200, `quote failed: ${quote.body.code ?? quote.status}`);
  assert.equal(quote.body.subtotalCents, 9900);
  assert.equal(quote.body.shippingCents, 2000);
  assert.equal(quote.body.totalCents, 11900);
  ok("authoritative_quote", { totalCents: quote.body.totalCents });

  const admin = await api("/api/admin/users");
  assert.equal(admin.status, 403);
  ok("buyer_cannot_access_admin");
  const payload = { items, shippingAddressId: address.id, paymentMethod: "pix", totalCents: 1 };
  const first = await api("/api/checkout/order", payload, report.idempotencyKey);
  if (first.status === 200 && first.body.orderId) {
    orderId = first.body.orderId;
    report.orderId = orderId;
  }
  assert.equal(first.status, 200, `order failed: ${first.body.code ?? first.status}`);
  assert.equal(first.body.totalCents, 11900);
  assert.equal(first.body.subtotalCents, 9900);
  assert.equal(first.body.shippingCents, 2000);
  report.paymentAttemptId = first.body.paymentAttemptId;
  assert.equal(await stock(), stockBefore - 1);
  ok("created_and_reserved", { stock: stockBefore - 1 });
  if (checkPaymentStatus) {
    const status = await paymentStatus(orderId);
    assert.equal(status.status, 200);
    assert.equal(status.body.orderId, orderId);
    assert.equal(status.body.financialStatus, "pending");
    assert.equal(status.body.reservationState, "held");
    const foreignStatus = await paymentStatus("aba80f65-6ef2-42e4-993a-e22306cfc5b6");
    assert.equal(foreignStatus.status, 404);
    ok("payment_status_owner_isolation");
  }

  const repeated = await api("/api/checkout/order", payload, report.idempotencyKey);
  assert.equal(repeated.status, 200);
  assert.deepEqual(repeated.body, first.body);
  assert.equal(await stock(), stockBefore - 1);
  const orders = must(await client.from("orders").select("id").eq("user_id", userId), "orders");
  assert.equal(orders.length, 1);
  ok("idempotent_replay", { orderCount: orders.length, stock: stockBefore - 1 });

  const conflicting = await api("/api/checkout/order", {
    ...payload, items: [{ variantId, quantity: 2 }],
  }, report.idempotencyKey);
  assert.equal(conflicting.status, 409);
  assert.equal(conflicting.body.code, "IDEMPOTENCY_CONFLICT");
  assert.equal(await stock(), stockBefore - 1);
  ok("conflicting_key_rejected");

  const cancelled = await api("/api/checkout/cancel", { orderId });
  assert.equal(cancelled.status, 200);
  assert.equal(cancelled.body.released, true);
  assert.equal(cancelled.body.stockUnits, 1);
  assert.equal(cancelled.body.financialStatus, "cancelled");
  assert.equal(await stock(), stockBefore);
  ok("cancelled_stock_restored", { stock: stockBefore });

  const cancelAgain = await api("/api/checkout/cancel", { orderId });
  assert.equal(cancelAgain.status, 200);
  assert.equal(cancelAgain.body.released, false);
  assert.equal(cancelAgain.body.stockUnits, 0);
  assert.equal(await stock(), stockBefore);
  ok("cancel_replay_does_not_add_stock");
  const finalOrder = must(await client.from("orders")
    .select("id,status,financial_status,reservation_state,total_cents")
    .eq("id", orderId).single(), "final_order");
  assert.equal(finalOrder.status, "cancelled");
  assert.equal(finalOrder.financial_status, "cancelled");
  assert.equal(finalOrder.reservation_state, "released");
  report.finalOrder = finalOrder;
  report.stockAfter = await stock();
  ok("persisted_cancelled_state");
  if (checkPaymentStatus) {
    const status = await paymentStatus(orderId);
    assert.equal(status.status, 200);
    assert.equal(status.body.financialStatus, "cancelled");
    assert.equal(status.body.reservationState, "released");
    report.paymentStatusChecked = true;
    ok("payment_status_cancelled");
  }
} catch (error) {
  failed = true;
  report.error = error instanceof Error ? error.message : "Unknown test failure";
  log();
} finally {
  // If a response was lost, discover only orders owned by this newly-created QA buyer.
  if (userId && token) {
    try {
      const rows = must(await client.from("orders").select("id,reservation_state")
        .eq("user_id", userId), "cleanup_orders");
      for (const row of rows) {
        if (row.reservation_state === "held") {
          const cleanup = await api("/api/checkout/cancel", { orderId: row.id });
          assert.equal(cleanup.status, 200, `cleanup failed for ${row.id}`);
        }
      }
      report.stockAfterCleanup = await stock();
      assert.equal(report.stockAfterCleanup, stockBefore, "Stock not restored; manual review required");
      const logout = await client.auth.signOut({ scope: "local" });
      if (logout.error) throw new Error("QA logout failed");
      report.cleanupVerified = true;
    } catch (error) {
      failed = true;
      report.cleanupError = error instanceof Error ? error.message : "Cleanup failed";
    }
  }
  token = undefined;
  report.passed = !failed;
  log();
  if (failed) process.exitCode = 1;
}

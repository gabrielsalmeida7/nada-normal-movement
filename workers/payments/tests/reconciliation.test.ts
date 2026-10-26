import { afterEach, describe, expect, it, vi } from "vitest";
import { reconcileCheckout } from "../src/reconciliation";
import type { Bindings } from "../src/config";

const attemptId = "22222222-2222-4222-8222-222222222222";
const orderId = "11111111-1111-4111-8111-111111111111";
const leaseId = "33333333-3333-4333-8333-333333333333";
const env: Bindings = { APP_ENV: "staging", PAYMENTS_ENABLED: "false", CHECKOUT_RECONCILIATION_ENABLED: "true",
  CHECKOUT_PRO_MODE: "sandbox", ALLOWED_ORIGINS: "https://shop.example.com", CHECKOUT_RETURN_ORIGIN: "https://shop.example.com",
  CHECKOUT_WEBHOOK_URL: "https://api.example.com/webhooks/mercadopago", SUPABASE_URL: "https://db.example.com",
  SUPABASE_PUBLISHABLE_KEY: "public", SUPABASE_SECRET_KEY: "fake-db-secret", MP_ACCESS_TOKEN: "fake-provider-token",
  MP_WEBHOOK_SECRET: "fake-signature", MP_COLLECTOR_ID: "123", MP_APPLICATION_ID: "456", MP_TEST_APPLICATION_ID: "789",
  MP_TEST_BUYER_ID: "124" };
const deadline = new Date(Date.now() - 90000000).toISOString();
const preference = { id: "pref", client_id: "789", collector_id: 123, external_reference: attemptId,
  metadata: { order_id: orderId }, sandbox_init_point: "https://sandbox.mercadopago.com.br/checkout/v1/redirect?pref_id=pref",
  expires: true, expiration_date_to: deadline };
const payment = { id: 1234, external_reference: attemptId, collector_id: 123, live_mode: false,
  currency_id: "BRL", transaction_amount: 120, transaction_amount_refunded: 0, status: "approved",
  date_last_updated: new Date().toISOString() };

function fixture(options: { saved?: boolean; missingPreference?: boolean; ambiguous?: boolean; total?: number;
  payments?: Record<string, unknown>[]; known?: string[]; failure?: boolean; foreignReference?: boolean;
  foreignApplication?: boolean; idle?: boolean; review?: boolean; preferenceFailure?: boolean } = {}) {
  const writes: { name: string; body: Record<string, unknown> }[] = [];
  const payments = options.payments ?? [payment];
  const fetcher = vi.spyOn(globalThis, "fetch").mockImplementation(async (input, init) => {
    const url = new URL(String(input));
    if (url.origin === "https://db.example.com") {
      const name = url.pathname.split("/").at(-1)!;
      const body = JSON.parse(String(init?.body));
      writes.push({ name, body });
      if (name === "claim_checkout_reconciliation") return Response.json(options.idle ? null : {
        attemptId, orderId, leaseId, totalCents: 12000, expiresAt: deadline,
        preferenceId: options.saved ? "pref" : null, knownPaymentIds: options.known ?? [],
      });
      if (name === "apply_checkout_pro_payment_v2") return Response.json({ applied: true, reviewRequired: options.review });
      if (name === "finish_checkout_reconciliation") return Response.json({ outcome: body.p_result });
      if (name === "save_reconciled_checkout_preference") return Response.json({ saved: true });
    }
    if (url.origin === "https://api.mercadopago.com") {
      expect(init?.method ?? "GET").toBe("GET");
      expect(new Headers(init?.headers).get("Authorization")).toBe("Bearer fake-provider-token");
      if (url.pathname.endsWith("/search")) {
        expect(url.searchParams.get("external_reference")).toBe(attemptId);
        if (options.failure) return Response.json({ message: "private-provider-message" }, { status: 503 });
      }
      if (url.pathname === "/checkout/preferences/search") return Response.json({
        total: options.ambiguous ? 2 : options.missingPreference ? 0 : 1,
        elements: options.ambiguous ? [{ id: "pref", external_reference: attemptId }, { id: "other", external_reference: attemptId }]
          : options.missingPreference ? [] : [{ id: "pref", external_reference: attemptId }],
      });
      if (url.pathname === "/checkout/preferences/pref") return options.preferenceFailure
        ? Response.json({ message: "unavailable" }, { status: 503 })
        : Response.json({ ...preference, ...(options.foreignApplication ? { client_id: "old-application" } : {}) });
      if (url.pathname === "/v1/payments/search") return Response.json({ paging: { total: options.total ?? payments.length, offset: 0 },
        results: payments.map(p => ({ id: p.id, external_reference: options.foreignReference ? orderId : attemptId })) });
      if (url.pathname.startsWith("/v1/payments/")) {
        const id = url.pathname.split("/").at(-1);
        return Response.json(payments.find(p => String(p.id) === id) ?? payment);
      }
    }
    throw new Error("unexpected fixture request");
  });
  return { writes, fetcher, finished: () => writes.find(w => w.name === "finish_checkout_reconciliation")?.body };
}

afterEach(() => vi.restoreAllMocks());

describe("durable checkout reconciliation using the official SDK", () => {
  it("does no I/O while disabled", async () => {
    const f = fixture();
    expect(await reconcileCheckout({ ...env, CHECKOUT_RECONCILIATION_ENABLED: "false" })).toEqual({ outcome: "disabled" });
    expect(f.fetcher).not.toHaveBeenCalled();
  });
  it.each(["production", "local"])("cannot enable the reconciler in %s", async APP_ENV => {
    const f = fixture();
    await expect(reconcileCheckout({ ...env, APP_ENV })).rejects.toThrow("CONFIGURATION_INVALID");
    expect(f.fetcher).not.toHaveBeenCalled();
  });
  it("does not search the provider when another worker owns the job", async () => {
    const f = fixture({ idle: true });
    expect(await reconcileCheckout(env)).toEqual({ outcome: "idle" });
    expect(f.fetcher).toHaveBeenCalledTimes(1);
  });
  it("recovers a lost preference response and approval without creating another preference", async () => {
    const f = fixture();
    expect(await reconcileCheckout(env)).toEqual({ outcome: "paid" });
    expect(f.writes.map(w => w.name)).toEqual(["claim_checkout_reconciliation", "save_reconciled_checkout_preference",
      "apply_checkout_pro_payment_v2", "finish_checkout_reconciliation"]);
    expect(f.writes[1].body).toMatchObject({ p_attempt_id: attemptId, p_lease_id: leaseId, p_preference_id: "pref" });
    expect(f.writes[2].body).toMatchObject({ p_application_id: "456", p_test_application_id: "789", p_payment_id: "1234", p_amount_cents: 12000 });
    expect(f.finished()).toMatchObject({ p_result: "paid", p_reason: "settled" });
  });
  it("still reads a known payment omitted from search, so lost refund webhooks can be recovered", async () => {
    const f = fixture({ saved: true, payments: [], known: ["1234"] });
    expect((await reconcileCheckout(env)).outcome).toBe("paid");
    expect(f.writes.some(w => w.name === "apply_checkout_pro_payment_v2")).toBe(true);
    expect(f.writes.some(w => w.name === "save_reconciled_checkout_preference")).toBe(false);
  });
  it("applies a refunded payment with its verified cumulative refunded amount", async () => {
    const f = fixture({ saved: true, payments: [{ ...payment, status: "refunded", transaction_amount_refunded: 120 }] });
    expect((await reconcileCheckout(env)).outcome).toBe("paid");
    expect(f.writes.find(w => w.name === "apply_checkout_pro_payment_v2")?.body).toMatchObject({ p_status: "refunded", p_refunded_cents: 12000 });
  });
  it("can recover a verified approval even while the preference endpoint is unavailable", async () => {
    const f = fixture({ saved: true, preferenceFailure: true });
    expect((await reconcileCheckout(env)).outcome).toBe("paid");
    expect(f.writes.some(w => w.name === "apply_checkout_pro_payment_v2")).toBe(true);
  });
  it("never treats empty searches as authority to return stock", async () => {
    const f = fixture({ missingPreference: true, payments: [] });
    expect((await reconcileCheckout(env)).outcome).toBe("review");
    expect(f.finished()).toMatchObject({ p_result: "review", p_reason: "preference_missing", p_payment_ids: [] });
    expect(f.writes.some(w => w.name === "save_reconciled_checkout_preference")).toBe(false);
  });
  it("keeps an expired preference with no payment in durable review", async () => {
    const f = fixture({ saved: true, payments: [] });
    await reconcileCheckout(env);
    expect(f.finished()).toMatchObject({ p_result: "review", p_reason: "no_payment_after_expiry" });
  });
  it("retains stock for pending Pix even after preference expiration", async () => {
    const f = fixture({ saved: true, payments: [{ ...payment, status: "pending" }] });
    expect((await reconcileCheckout(env)).outcome).toBe("pending");
    expect(f.finished()).toMatchObject({ p_result: "pending", p_payment_ids: [] });
  });
  it("submits a terminal observation only after reading all payments and the expired preference", async () => {
    const f = fixture({ saved: true, payments: [{ ...payment, status: "cancelled" }] });
    expect((await reconcileCheckout(env)).outcome).toBe("terminal");
    expect(f.finished()).toMatchObject({ p_result: "terminal", p_payment_ids: ["1234"], p_preference_expires_at: deadline });
  });
  it("does not release on incomplete pagination and still applies approvals already found", async () => {
    const f = fixture({ saved: true, total: 11 });
    expect((await reconcileCheckout(env)).outcome).toBe("review");
    expect(f.finished()).toMatchObject({ p_reason: "payments_incomplete" });
    expect(f.writes.some(w => w.name === "apply_checkout_pro_payment_v2")).toBe(true);
  });
  it("does not select arbitrarily among multiple preferences", async () => {
    const f = fixture({ ambiguous: true });
    expect((await reconcileCheckout(env)).outcome).toBe("review");
    expect(f.finished()).toMatchObject({ p_reason: "preference_ambiguous" });
    expect(f.writes.some(w => w.name === "save_reconciled_checkout_preference")).toBe(false);
  });
  it("retries a provider outage later without SDK automatic retries or leaked details", async () => {
    const f = fixture({ failure: true });
    expect((await reconcileCheckout(env)).outcome).toBe("error");
    expect(f.fetcher).toHaveBeenCalledTimes(4);
    expect(f.finished()).toMatchObject({ p_result: "error", p_reason: "reconciliation_failed", p_lease_id: leaseId });
    expect(JSON.stringify(f.writes)).not.toContain("private-provider-message");
  });
  it.each([{ foreignApplication: true }, { foreignReference: true },
    { payments: [{ ...payment, transaction_amount: 1 }] }])("rejects mismatches before applying financial changes (%#)", async options => {
    const f = fixture({ saved: true, ...options });
    expect((await reconcileCheckout(env)).outcome).toBe("error");
    expect(f.writes.some(w => w.name === "apply_checkout_pro_payment_v2")).toBe(false);
  });
  it("keeps additional approvals or late payments in review rather than releasing stock", async () => {
    const f = fixture({ saved: true, review: true });
    expect((await reconcileCheckout(env)).outcome).toBe("review");
    expect(f.finished()).toMatchObject({ p_reason: "payment_review" });
  });
});

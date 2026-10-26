import { z } from "zod";
import { readConfig, type Bindings } from "./config";
import { readPayment, readReconciliationPreference } from "./checkout-pro";
import { rpc } from "./database";
import { searchProviderPayments, searchProviderPreferences } from "./mercado-pago";
import { HttpError } from "./http";

const paymentId = z.union([z.string().regex(/^[1-9]\d{0,23}$/), z.number().int().positive().safe()]).transform(String);
const jobSchema = z.object({ attemptId: z.string().uuid(), orderId: z.string().uuid(), leaseId: z.string().uuid(),
  totalCents: z.number().int().positive(), expiresAt: z.string().datetime({ offset: true }),
  preferenceId: z.string().min(1).max(200).nullable(), knownPaymentIds: z.array(paymentId).max(10) });
const preferencesSchema = z.object({ total: z.number().int().nonnegative(), elements: z.array(z.object({
  id: z.string().min(1).max(200), external_reference: z.string().uuid() })).max(2) });
const paymentsSchema = z.object({ paging: z.object({ total: z.number().int().nonnegative(), offset: z.literal(0) }),
  results: z.array(z.object({ id: paymentId, external_reference: z.string().uuid() })).max(10) });

/** One leased job per run keeps the work bounded, including identity lookups. */
export async function reconcileCheckout(env: Bindings) {
  const config = readConfig(env);
  if (!config.reconciliationEnabled || !config.checkoutPro) return { outcome: "disabled" };
  const pro = config.checkoutPro;
  const job = jobSchema.nullable().parse(await rpc(env, "claim_checkout_reconciliation", {
    p_application_id: pro.applicationId, p_test_application_id: pro.testApplicationId,
  }));
  if (!job) return { outcome: "idle" };
  const identity = { p_attempt_id: job.attemptId, p_lease_id: job.leaseId };
  const finish = (result: string, reason: string, ids: string[] = [], expiry: string | null = null) =>
    rpc(env, "finish_checkout_reconciliation", { ...identity, p_result: result, p_reason: reason,
      p_payment_ids: ids, p_preference_expires_at: expiry });
  try {
    let preferenceId = job.preferenceId;
    let ambiguousPreference = false;
    let preferenceUnavailable = false;
    let preference: Awaited<ReturnType<typeof readReconciliationPreference>> | null = null;
    try {
      if (!preferenceId) {
        const found = preferencesSchema.parse(await searchProviderPreferences(env.MP_ACCESS_TOKEN!, job.attemptId));
        if (found.elements.some(p => p.external_reference !== job.attemptId)) throw new HttpError("PROVIDER_PREFERENCE_MISMATCH");
        if (found.total === 1 && found.elements.length === 1) preferenceId = found.elements[0].id;
        else ambiguousPreference = found.total !== 0 || found.elements.length !== 0;
      }
      preference = preferenceId ? await readReconciliationPreference(preferenceId, pro,
        env.MP_ACCESS_TOKEN!, job.orderId, job.attemptId) : null;
    } catch (error) {
      // A preference endpoint outage must not hide an independently verifiable
      // payment/refund. Application or order mismatches still stop the run.
      if (!(error instanceof HttpError) || error.code !== "UPSTREAM_UNAVAILABLE") throw error;
      preferenceUnavailable = true;
    }
    if (preference && !job.preferenceId) await rpc(env, "save_reconciled_checkout_preference", {
      ...identity, p_preference_id: preference.preferenceId, p_checkout_url: preference.checkoutUrl,
    });
    const found = paymentsSchema.parse(await searchProviderPayments(env.MP_ACCESS_TOKEN!, job.attemptId));
    if (found.results.some(p => p.external_reference !== job.attemptId)) throw new HttpError("PROVIDER_PAYMENT_MISMATCH");
    const ids = [...new Set([...job.knownPaymentIds, ...found.results.map(p => p.id)])];
    const complete = found.paging.total === found.results.length && ids.length <= 10;
    const payments = [];
    let review = false;
    for (const id of ids.slice(0, 10)) {
      const payment = await readPayment(id, pro, env.MP_ACCESS_TOKEN!);
      if (payment.external_reference !== job.attemptId || Math.round(payment.transaction_amount * 100) !== job.totalCents) {
        throw new HttpError("PROVIDER_PAYMENT_MISMATCH");
      }
      const applied = z.object({ reviewRequired: z.boolean().optional() }).parse(await rpc(env, "apply_checkout_pro_payment_v2", {
        ...identity, p_application_id: pro.applicationId, p_test_application_id: pro.testApplicationId,
        p_payment_id: id, p_amount_cents: Math.round(payment.transaction_amount * 100), p_status: payment.status,
        p_refunded_cents: Math.round(payment.transaction_amount_refunded * 100), p_updated_at: payment.date_last_updated,
      }));
      review ||= applied.reviewRequired === true;
      payments.push(payment);
    }
    if (review || ambiguousPreference || !complete) {
      await finish("review", ambiguousPreference ? "preference_ambiguous" : !complete ? "payments_incomplete" : "payment_review");
      return { outcome: "review" };
    }
    if (payments.some(p => ["approved", "refunded", "charged_back"].includes(p.status) || p.transaction_amount_refunded > 0)) {
      await finish("paid", "settled");
      return { outcome: "paid" };
    }
    if (preferenceUnavailable) throw new HttpError("UPSTREAM_UNAVAILABLE");
    const expired = Date.parse(job.expiresAt) <= Date.now();
    if (!payments.length && expired) {
      // An empty search is not proof that a delayed payment does not exist.
      await finish("review", preference ? "no_payment_after_expiry" : "preference_missing");
      return { outcome: "review" };
    }
    if (payments.length && payments.every(p => ["cancelled", "rejected"].includes(p.status)) &&
      preference?.expires && preference.expiresAt &&
      Date.parse(preference.expiresAt) <= Date.now() - 86400000) {
      // The DB also requires two complete matching observations, locks and a
      // check that no webhook has approved this order before returning stock.
      const result = await finish("terminal", "terminal_verified", ids, preference.expiresAt);
      return { outcome: "terminal", result };
    }
    await finish("pending", "awaiting_confirmation");
    return { outcome: "pending" };
  } catch {
    // Persist retry state without provider bodies, URLs, exceptions or secrets.
    await finish("error", "reconciliation_failed");
    return { outcome: "error" };
  }
}

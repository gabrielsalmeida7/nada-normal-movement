import { z } from "zod";
import type { Bindings, Config } from "./config";
import { createPreference, readPayment, readPreference, snapshotSchema, verifyWebhook } from "./checkout-pro";
import { HttpError, readJson, upstreamJson } from "./http";
import type { WebhookDiagnostic } from "./webhook-diagnostic";
import { rpc } from "./database";

async function userId(request: Request, env: Bindings): Promise<string> {
  const header = request.headers.get("Authorization") ?? "";
  if (!/^Bearer \S+$/.test(header) || header.length > 8192) throw new HttpError("UNAUTHORIZED", 401);
  try {
    const user = z.object({ id: z.string().uuid() }).parse(await upstreamJson(
      `${env.SUPABASE_URL}/auth/v1/user`, { headers: { apikey: env.SUPABASE_PUBLISHABLE_KEY!, Authorization: header } }));
    return user.id;
  } catch { throw new HttpError("UNAUTHORIZED", 401); }
}

export async function handleCheckoutPro(request: Request, env: Bindings, config: Config,
  diagnostic?: WebhookDiagnostic): Promise<Response> {
  const path = new URL(request.url).pathname;
  const pro = config.checkoutPro;
  if (!pro) throw new HttpError("CHECKOUT_UNAVAILABLE");
  if (path === "/webhooks/mercadopago") {
    // Webhook processing remains available when new submissions are disabled.
    if (diagnostic) diagnostic.stage = "signature";
    const id = await verifyWebhook(request, env.MP_WEBHOOK_SECRET!, diagnostic,
      config.environment === "staging" ? env.MP_TEST_WEBHOOK_SECRET : undefined);
    if (diagnostic) { diagnostic.signatureVerified = true; diagnostic.stage = "payload"; }
    const event = z.object({ type: z.literal("payment"), data: z.object({ id: z.union([z.string(), z.number()]) }) })
      .parse(await readJson(request));
    if (String(event.data.id) !== id) throw new HttpError("WEBHOOK_RESOURCE_MISMATCH", 400);
    if (diagnostic) diagnostic.stage = "provider_lookup_and_validation";
    const payment = await readPayment(id, pro, env.MP_ACCESS_TOKEN!, diagnostic);
    if (diagnostic) diagnostic.stage = "database_apply";
    await rpc(env, "apply_checkout_pro_payment_v2", {
      p_application_id: pro.applicationId, p_test_application_id: pro.testApplicationId,
      p_attempt_id: payment.external_reference, p_payment_id: String(payment.id),
      p_amount_cents: Math.round(payment.transaction_amount * 100), p_status: payment.status,
      p_refunded_cents: Math.round(payment.transaction_amount_refunded * 100),
      p_updated_at: payment.date_last_updated,
    });
    if (diagnostic) diagnostic.stage = "completed";
    return Response.json({ received: true });
  }
  if (request.method !== "GET" && !config.paymentsEnabled) throw new HttpError("PAYMENTS_DISABLED");
  const owner = await userId(request, env);
  if (request.method === "GET") {
    const orderId = z.string().uuid().parse(path.split("/")[4]);
    // Scope the service-key read to the authenticated owner, including after a lost tab.
    const query = new URLSearchParams({ select: "id,user_id,financial_status,reservation_state,reservation_expires_at",
      id: `eq.${orderId}`, user_id: `eq.${owner}`, limit: "1" });
    const rows = z.array(z.object({ id: z.literal(orderId), user_id: z.literal(owner),
      financial_status: z.string(), reservation_state: z.string().nullable(),
      reservation_expires_at: z.string().datetime({ offset: true }).nullable() })).max(1).parse(
      await upstreamJson(`${env.SUPABASE_URL}/rest/v1/orders?${query}`, {
        headers: { apikey: env.SUPABASE_SECRET_KEY! },
      }));
    const order = rows[0];
    if (!order) throw new HttpError("ORDER_NOT_FOUND", 404);
    return Response.json({ orderId: order.id, financialStatus: order.financial_status,
      reservationState: order.reservation_state, reservationExpiresAt: order.reservation_expires_at });
  }
  if (!request.headers.get("Content-Type")?.toLowerCase().startsWith("application/json")) {
    throw new HttpError("INVALID_PAYLOAD", 400);
  }
  const payload = z.object({ orderId: z.string().uuid() }).strict().safeParse(await readJson(request, 12 * 1024));
  if (!payload.success) throw new HttpError("INVALID_PAYLOAD", 400);
  const claim = z.object({ state: z.enum(["claimed", "ready", "busy", "unavailable"]),
    snapshot: snapshotSchema.optional(), preferenceId: z.string().optional(), checkoutUrl: z.string().optional() })
    .parse(await rpc(env, "claim_checkout_pro_v2", { p_user_id: owner, p_order_id: payload.data.orderId,
      p_application_id: pro.applicationId, p_test_application_id: pro.testApplicationId }));
  if (claim.state === "ready" && claim.checkoutUrl && claim.preferenceId) {
    return Response.json({ ...await readPreference(claim.preferenceId, pro, env.MP_ACCESS_TOKEN!, payload.data.orderId),
      applicationId: pro.applicationId, testApplicationId: pro.testApplicationId, orderId: payload.data.orderId });
  }
  if (claim.state === "busy") throw new HttpError("CHECKOUT_RECONCILIATION_REQUIRED", 409);
  if (claim.state !== "claimed" || !claim.snapshot) throw new HttpError("ORDER_UNAVAILABLE", 409);
  // A failed request leaves the durable claim in place. Never retry preference POST blindly.
  const preference = await createPreference(claim.snapshot, pro, env.MP_ACCESS_TOKEN!);
  await rpc(env, "finish_checkout_pro", { p_attempt_id: claim.snapshot.attemptId,
    p_preference_id: preference.preferenceId, p_checkout_url: preference.checkoutUrl });
  return Response.json({ ...preference, applicationId: pro.applicationId,
    testApplicationId: pro.testApplicationId, orderId: payload.data.orderId }, { status: 201 });
}

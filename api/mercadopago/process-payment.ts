import type { VercelRequest, VercelResponse } from "@vercel/node";
import { createClient } from "@supabase/supabase-js";
import { randomUUID } from "crypto";
import {
  getBaseUrl,
  getMpAccessToken,
  getSupabaseServiceRoleKey,
  getSupabaseUrl,
} from "../lib/mp-config";
import { authenticateOrderRequest } from "../lib/mp-order";

const MP_API = "https://api.mercadopago.com";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const accessToken = getMpAccessToken();
  const supabaseUrl = getSupabaseUrl();
  const serviceRoleKey = getSupabaseServiceRoleKey();

  if (!accessToken || !supabaseUrl || !serviceRoleKey) {
    console.error("[MP Process] Missing env: MP_ACCESS_TOKEN, SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
    return res.status(500).json({ error: "Configuração do servidor incompleta" });
  }

  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Token de autenticação obrigatório" });
  }
  const jwt = authHeader.slice(7);

  const body = typeof req.body === "string" ? JSON.parse(req.body || "{}") : req.body ?? {};
  const orderId = body.orderId?.trim();
  const formData = body.formData;

  if (!orderId || !formData || typeof formData !== "object") {
    return res.status(400).json({ error: "orderId e formData são obrigatórios" });
  }

  const authResult = await authenticateOrderRequest(jwt, orderId);
  if (!authResult.ok) {
    return res.status(authResult.status).json({ error: authResult.error });
  }

  const { order } = authResult.ctx;
  const expectedAmount = order.total_cents / 100;
  const submittedAmount = Number(formData.transaction_amount);

  if (!Number.isFinite(submittedAmount) || Math.abs(submittedAmount - expectedAmount) > 0.01) {
    return res.status(400).json({ error: "Valor do pagamento não confere com o pedido" });
  }

  const baseUrl = getBaseUrl();
  const paymentBody = {
    ...formData,
    transaction_amount: expectedAmount,
    external_reference: orderId,
    description: `Pedido Nada Normal #${orderId.slice(0, 8)}`,
    notification_url: `${baseUrl}/api/mercadopago/webhook`,
  };

  const mpRes = await fetch(`${MP_API}/v1/payments`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
      "X-Idempotency-Key": randomUUID(),
    },
    body: JSON.stringify(paymentBody),
  });

  const payment = await mpRes.json().catch(() => null);

  if (!mpRes.ok || !payment) {
    console.error("[MP Process] MP API error:", mpRes.status, payment);
    return res.status(502).json({
      error: payment?.message ?? "Erro ao processar pagamento no Mercado Pago",
      cause: payment?.cause,
    });
  }

  const supabaseService = createClient(supabaseUrl, serviceRoleKey);
  await supabaseService
    .from("orders")
    .update({ payment_id: String(payment.id) })
    .eq("id", orderId);

  if (payment.status === "approved") {
    await supabaseService
      .from("orders")
      .update({ status: "paid" })
      .eq("id", orderId);
  }

  return res.status(200).json({
    id: payment.id,
    status: payment.status,
    status_detail: payment.status_detail,
    orderId,
  });
}

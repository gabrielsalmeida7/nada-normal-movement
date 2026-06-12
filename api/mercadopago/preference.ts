import type { VercelRequest, VercelResponse } from "@vercel/node";
import { createClient } from "@supabase/supabase-js";
import { getBaseUrl, getMpAccessToken, getSupabaseServiceRoleKey, getSupabaseUrl } from "../lib/mp-config";
import { authenticateOrderRequest, buildPreferenceItems } from "../lib/mp-order";

const MP_API = "https://api.mercadopago.com";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const accessToken = getMpAccessToken();
  const supabaseUrl = getSupabaseUrl();

  if (!accessToken || !supabaseUrl) {
    console.error("[MP Preference] Missing env: MP_ACCESS_TOKEN or SUPABASE_URL");
    return res.status(500).json({ error: "Configuração do servidor incompleta" });
  }

  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Token de autenticação obrigatório" });
  }
  const jwt = authHeader.slice(7);

  const body = typeof req.body === "string" ? JSON.parse(req.body || "{}") : req.body ?? {};
  const orderId = body.orderId?.trim();
  if (!orderId) {
    return res.status(400).json({ error: "orderId é obrigatório" });
  }

  const authResult = await authenticateOrderRequest(jwt, orderId);
  if (!authResult.ok) {
    return res.status(authResult.status).json({ error: authResult.error });
  }

  const { supabase, order } = authResult.ctx;

  if (order.payment_id) {
    return res.status(200).json({
      preferenceId: order.payment_id,
      amount: order.total_cents / 100,
    });
  }

  let items;
  try {
    items = await buildPreferenceItems(supabase, orderId, order.shipping_cents);
  } catch {
    return res.status(500).json({ error: "Erro ao buscar itens do pedido" });
  }

  const baseUrl = getBaseUrl();

  const preferenceBody = {
    items,
    external_reference: orderId,
    back_urls: {
      success: `${baseUrl}/checkout/sucesso`,
      failure: `${baseUrl}/checkout/erro`,
      pending: `${baseUrl}/checkout/pendente`,
    },
    auto_return: "approved" as const,
    notification_url: `${baseUrl}/api/mercadopago/webhook`,
  };

  const mpRes = await fetch(`${MP_API}/checkout/preferences`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify(preferenceBody),
  });

  if (!mpRes.ok) {
    const errText = await mpRes.text();
    console.error("[MP Preference] MP API error:", mpRes.status, errText);
    return res.status(502).json({ error: "Erro ao criar preferência no Mercado Pago" });
  }

  const preference = await mpRes.json();
  const preferenceId = preference.id;

  if (!preferenceId) {
    console.error("[MP Preference] No preference id in response:", preference);
    return res.status(502).json({ error: "Resposta inválida do Mercado Pago" });
  }

  const serviceRoleKey = getSupabaseServiceRoleKey();
  const supabaseService = createClient(
    supabaseUrl,
    serviceRoleKey ?? process.env.SUPABASE_ANON_KEY ?? process.env.VITE_SUPABASE_ANON_KEY ?? ""
  );

  await supabaseService
    .from("orders")
    .update({ payment_id: preferenceId })
    .eq("id", orderId);

  return res.status(200).json({
    preferenceId,
    amount: order.total_cents / 100,
  });
}

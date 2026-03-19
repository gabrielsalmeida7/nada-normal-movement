import type { VercelRequest, VercelResponse } from "@vercel/node";
import { createClient } from "@supabase/supabase-js";

const MP_API = "https://api.mercadopago.com";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const accessToken = process.env.MP_ACCESS_TOKEN;
  const supabaseUrl = process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL;
  const supabaseAnonKey = process.env.SUPABASE_ANON_KEY ?? process.env.VITE_SUPABASE_ANON_KEY;

  if (!accessToken || !supabaseUrl || !supabaseAnonKey) {
    console.error("[MP Preference] Missing env: MP_ACCESS_TOKEN, SUPABASE_URL or SUPABASE_ANON_KEY");
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

  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: `Bearer ${jwt}` } },
  });

  const { data: { user }, error: userError } = await supabase.auth.getUser(jwt);
  if (userError || !user) {
    return res.status(401).json({ error: "Token inválido ou expirado" });
  }

  const { data: order, error: orderError } = await supabase
    .from("orders")
    .select("id, user_id, status, payment_id, total_cents, shipping_cents")
    .eq("id", orderId)
    .single();

  if (orderError || !order) {
    return res.status(404).json({ error: "Pedido não encontrado" });
  }
  if (order.user_id !== user.id) {
    return res.status(403).json({ error: "Pedido não pertence ao usuário" });
  }
  if (order.status !== "pending") {
    return res.status(400).json({ error: "Pedido já foi processado" });
  }
  if (order.payment_id) {
    return res.status(400).json({ error: "Preferência já criada para este pedido" });
  }

  const { data: orderItems, error: itemsError } = await supabase
    .from("order_items")
    .select("product_id, quantity, price_cents_at_purchase, products ( name )")
    .eq("order_id", orderId);

  if (itemsError) {
    console.error("[MP Preference] order_items error:", itemsError);
    return res.status(500).json({ error: "Erro ao buscar itens do pedido" });
  }

  const items: { title: string; quantity: number; unit_price: number }[] = [];

  for (const row of orderItems ?? []) {
    const product = (row as { products?: { name: string } | null }).products;
    const title = (product && !Array.isArray(product) ? product.name : null) ?? "Produto";
    items.push({
      title: title.length > 127 ? title.slice(0, 124) + "..." : title,
      quantity: row.quantity,
      unit_price: row.price_cents_at_purchase / 100,
    });
  }

  if (order.shipping_cents > 0) {
    items.push({
      title: "Frete",
      quantity: 1,
      unit_price: order.shipping_cents / 100,
    });
  }

  const vercelUrl = process.env.VERCEL_URL;
  const baseUrl = vercelUrl
    ? (vercelUrl.includes("localhost") ? `http://${vercelUrl}` : `https://${vercelUrl}`)
    : (process.env.BASE_URL ?? "http://localhost:5173");

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
  const initPoint = preference.sandbox_init_point ?? preference.init_point;

  if (!initPoint) {
    console.error("[MP Preference] No init_point in response:", preference);
    return res.status(502).json({ error: "Resposta inválida do Mercado Pago" });
  }

  const supabaseService = createClient(
    supabaseUrl,
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? supabaseAnonKey
  );

  await supabaseService
    .from("orders")
    .update({ payment_id: preferenceId })
    .eq("id", orderId);

  return res.status(200).json({ init_point: initPoint });
}

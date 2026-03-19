import type { VercelRequest, VercelResponse } from "@vercel/node";
import { createClient } from "@supabase/supabase-js";

const MP_API = "https://api.mercadopago.com";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    return res.status(405).end();
  }

  const accessToken = process.env.MP_ACCESS_TOKEN;
  const supabaseUrl = process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!accessToken || !supabaseUrl || !serviceRoleKey) {
    console.error("[MP Webhook] Missing env: MP_ACCESS_TOKEN, SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
    return res.status(500).end();
  }

  let paymentId: string;

  try {
    const body = typeof req.body === "string"
      ? (req.body ? JSON.parse(req.body) : {})
      : req.body ?? {};
    const type = body.type ?? body.action ?? "";
    const data = body.data ?? {};
    const id = data.id ?? data["id"];

    if (!id) {
      return res.status(200).end();
    }

    const isPayment = type === "payment" || String(type).includes("payment");
    if (!isPayment) {
      return res.status(200).end();
    }

    paymentId = String(id);
  } catch {
    return res.status(400).end();
  }

  const mpRes = await fetch(`${MP_API}/v1/payments/${paymentId}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!mpRes.ok) {
    console.error("[MP Webhook] Failed to fetch payment:", mpRes.status);
    return res.status(502).end();
  }

  const payment = await mpRes.json();
  const status = payment.status;
  const externalReference = payment.external_reference ?? payment.metadata?.order_id;

  if (!externalReference) {
    console.error("[MP Webhook] No external_reference in payment:", paymentId);
    return res.status(200).end();
  }

  if (status === "approved") {
    const supabase = createClient(supabaseUrl, serviceRoleKey);
    const { error } = await supabase
      .from("orders")
      .update({ status: "paid", payment_id: String(paymentId) })
      .eq("id", externalReference);

    if (error) {
      console.error("[MP Webhook] Failed to update order:", error);
      return res.status(500).end();
    }
  }

  return res.status(200).end();
}

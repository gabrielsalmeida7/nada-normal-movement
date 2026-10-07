import { createClient } from "@supabase/supabase-js";
import type { VercelRequest, VercelResponse } from "@vercel/node";
import {
  CancelCheckoutError,
  mapCancelDatabaseError,
  parseCancelPayload,
  parseCancelResult,
} from "../../server/checkout/cancel-core";

function getBearerToken(header: string | string[] | undefined): string | null {
  const value = Array.isArray(header) ? header[0] : header;
  if (!value?.startsWith("Bearer ")) return null;
  return value.slice(7).trim() || null;
}

export default async function handler(request: VercelRequest, response: VercelResponse) {
  response.setHeader("Cache-Control", "private, no-store");

  if (request.method !== "POST") {
    response.setHeader("Allow", "POST");
    return response.status(405).json({ error: "Método não permitido." });
  }

  const token = getBearerToken(request.headers.authorization);
  if (!token) {
    return response.status(401).json({ error: "Autenticação necessária." });
  }

  const supabaseUrl = process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL;
  const publishableKey =
    process.env.SUPABASE_PUBLISHABLE_KEY ??
    process.env.SUPABASE_ANON_KEY ??
    process.env.VITE_SUPABASE_ANON_KEY;
  const secretKey = process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !publishableKey || !secretKey) {
    return response.status(500).json({ error: "Servidor não configurado." });
  }

  try {
    const payload = parseCancelPayload(request.body);
    const authClient = createClient(supabaseUrl, publishableKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
    const { data: authData, error: authError } = await authClient.auth.getUser(token);
    if (authError || !authData.user) {
      return response.status(401).json({ error: "Sessão inválida ou expirada." });
    }

    const checkoutClient = createClient(supabaseUrl, secretKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
    const { data, error } = await checkoutClient.rpc("cancel_checkout_order", {
      p_user_id: authData.user.id,
      p_order_id: payload.orderId,
    });
    if (error) {
      throw mapCancelDatabaseError(error);
    }

    return response.status(200).json(parseCancelResult(data));
  } catch (error) {
    if (error instanceof CancelCheckoutError) {
      return response.status(error.status).json({ code: error.code, error: error.message });
    }

    return response.status(500).json({ error: "Não foi possível cancelar o pedido." });
  }
}

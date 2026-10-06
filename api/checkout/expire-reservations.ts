import { createClient } from "@supabase/supabase-js";
import type { VercelRequest, VercelResponse } from "@vercel/node";
import {
  ExpireReservationsError,
  RESERVATION_PROCESSOR_WORKER_ID,
  mapExpireDatabaseError,
  parseExpirePayload,
  parseExpireResult,
  processorSecretMatches,
  readProcessorSecret,
} from "./expire-reservations-core";

export default async function handler(request: VercelRequest, response: VercelResponse) {
  response.setHeader("Cache-Control", "private, no-store");

  if (request.method !== "POST") {
    response.setHeader("Allow", "POST");
    return response.status(405).json({ error: "Método não permitido." });
  }

  const configuredSecret = process.env.RESERVATION_PROCESSOR_SECRET;
  const supabaseUrl = process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL;
  const secretKey = process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!configuredSecret || configuredSecret.length < 16 || !supabaseUrl || !secretKey) {
    return response.status(500).json({ error: "Servidor não configurado." });
  }

  const providedSecret = readProcessorSecret(request.headers["x-reservation-processor-secret"]);
  if (!providedSecret || !processorSecretMatches(providedSecret, configuredSecret)) {
    return response.status(401).json({ error: "Não autorizado." });
  }

  try {
    const payload = parseExpirePayload(request.body);
    const checkoutClient = createClient(supabaseUrl, secretKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
    const { data, error } = await checkoutClient.rpc("process_expired_reservations", {
      p_worker_id: RESERVATION_PROCESSOR_WORKER_ID,
      p_limit: payload.limit,
    });
    if (error) {
      throw mapExpireDatabaseError(error);
    }

    return response.status(200).json(parseExpireResult(data));
  } catch (error) {
    if (error instanceof ExpireReservationsError) {
      return response.status(error.status).json({ code: error.code, error: error.message });
    }

    return response.status(500).json({ error: "Não foi possível processar as reservas." });
  }
}

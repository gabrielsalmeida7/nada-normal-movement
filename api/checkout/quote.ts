import { createClient } from "@supabase/supabase-js";
import type { VercelRequest, VercelResponse } from "@vercel/node";
import {
  buildAuthoritativeQuote,
  parseQuotePayload,
  QuoteError,
} from "./quote-core";

const MAX_BODY_BYTES = 8 * 1024;

function getBearerToken(header: string | string[] | undefined): string | null {
  const value = Array.isArray(header) ? header[0] : header;
  if (!value?.startsWith("Bearer ")) return null;
  return value.slice(7).trim() || null;
}

function parseRequestBody(body: unknown): unknown {
  if (typeof body === "string") {
    if (Buffer.byteLength(body, "utf8") > MAX_BODY_BYTES) {
      throw new QuoteError("INVALID_PAYLOAD", 400, "Dados do orçamento inválidos.");
    }

    try {
      return JSON.parse(body) as unknown;
    } catch {
      throw new QuoteError("INVALID_PAYLOAD", 400, "Dados do orçamento inválidos.");
    }
  }

  let serialized: string;
  try {
    serialized = JSON.stringify(body);
  } catch {
    throw new QuoteError("INVALID_PAYLOAD", 400, "Dados do orçamento inválidos.");
  }
  if (!serialized || Buffer.byteLength(serialized, "utf8") > MAX_BODY_BYTES) {
    throw new QuoteError("INVALID_PAYLOAD", 400, "Dados do orçamento inválidos.");
  }
  return body;
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
    const payload = parseQuotePayload(parseRequestBody(request.body));
    const authClient = createClient(supabaseUrl, publishableKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
    const { data: authData, error: authError } = await authClient.auth.getUser(token);
    if (authError || !authData.user) {
      return response.status(401).json({ error: "Sessão inválida ou expirada." });
    }

    const catalogClient = createClient(supabaseUrl, secretKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
    const variantIds = payload.items.map((item) => item.variantId);
    const { data, error } = await catalogClient
      .from("product_variants")
      .select(
        "id, product_id, size, color_name, stock_quantity, is_active, products!inner(id, name, price_cents, is_active)",
      )
      .in("id", variantIds);

    if (error) {
      return response.status(503).json({
        code: "CATALOG_UNAVAILABLE",
        error: "Não foi possível calcular o orçamento.",
      });
    }

    const priced = buildAuthoritativeQuote(payload, data, 0);
    const { data: shippingCents, error: shippingError } = await catalogClient.rpc(
      "compute_shipping_cents",
      {
        p_state: payload.shippingState,
        p_subtotal_cents: priced.subtotalCents,
      },
    );
    if (shippingError || !Number.isInteger(shippingCents)) {
      throw new QuoteError("SHIPPING_UNAVAILABLE", 422, "Não foi possível calcular o frete.");
    }

    return response.status(200).json(buildAuthoritativeQuote(payload, data, shippingCents));
  } catch (error) {
    if (error instanceof QuoteError) {
      return response.status(error.status).json({ code: error.code, error: error.message });
    }

    return response.status(500).json({ error: "Não foi possível calcular o orçamento." });
  }
}

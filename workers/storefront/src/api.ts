import { createClient } from "@supabase/supabase-js";
import {
  CheckoutOrderError, mapCheckoutDatabaseError, parseCheckoutOrderPayload,
  parseCheckoutOrderResult, parseIdempotencyKey, MAX_ORDER_BODY_BYTES,
} from "../../../server/checkout/order-core";
import {
  CancelCheckoutError, mapCancelDatabaseError, parseCancelPayload, parseCancelResult,
} from "../../../server/checkout/cancel-core";
import {
  ExpireReservationsError, mapExpireDatabaseError, parseExpirePayload, parseExpireResult,
  RESERVATION_PROCESSOR_WORKER_ID,
} from "../../../server/checkout/expire-reservations-core";
import { buildAuthoritativeQuote, parseQuotePayload, QuoteError } from "../../../server/checkout/quote-core";
import { boundedFetch, HttpError, json, readJson } from "./http";

export type StorefrontEnv = Partial<StorefrontBindings>;

export function configured(env: StorefrontEnv): boolean {
  if (!env.SUPABASE_SECRET_KEY || !env.SUPABASE_PUBLISHABLE_KEY) return false;
  try {
    const url = new URL(env.SUPABASE_URL ?? "");
    return url.protocol === "https:" && !url.username && !url.password &&
      url.pathname === "/" && !url.search && !url.hash;
  } catch { return false; }
}

function client(env: StorefrontEnv, secret = false) {
  return createClient(env.SUPABASE_URL!, secret ? env.SUPABASE_SECRET_KEY! : env.SUPABASE_PUBLISHABLE_KEY!, {
    auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false },
    global: { fetch: boundedFetch },
  });
}

/** Local/staging only. Production activation remains a separate, reviewed rollout. */
export function enabled(env: StorefrontEnv): boolean {
  return ["local", "staging"].includes(env.APP_ENV ?? "") && env.SHOP_API_ENABLED === "true";
}

async function secretMatches(provided: string, expected: string): Promise<boolean> {
  const encoder = new TextEncoder();
  const [a, b] = await Promise.all([
    crypto.subtle.digest("SHA-256", encoder.encode(provided)),
    crypto.subtle.digest("SHA-256", encoder.encode(expected)),
  ]);
  return crypto.subtle.timingSafeEqual(a, b);
}

async function expire(env: StorefrontEnv, payload: unknown) {
  const { limit } = parseExpirePayload(payload);
  const { data, error } = await client(env, true).rpc("process_expired_reservations", {
    p_worker_id: RESERVATION_PROCESSOR_WORKER_ID, p_limit: limit,
  });
  if (error) throw mapExpireDatabaseError(error);
  return parseExpireResult(data);
}

export async function processScheduledReservations(env: StorefrontEnv): Promise<void> {
  if (env.RESERVATION_PROCESSOR_ENABLED !== "true") return;
  if (!enabled(env) || !configured(env)) throw new Error("RESERVATION_CONFIGURATION_INVALID");
  const result = await expire(env, {});
  if (result.failed > 0) throw new Error("RESERVATION_PROCESSING_FAILED");
}

function maskCpf(cpf: string | null): string | null {
  if (!cpf) return null;
  const digits = cpf.replace(/\D/g, "");
  return digits.length === 11 ? `${digits.slice(0, 3)}.***.***-${digits.slice(-2)}` : "***.***.***-**";
}

const methods: Record<string, string> = {
  "/api/checkout/quote": "POST", "/api/checkout/order": "POST",
  "/api/checkout/cancel": "POST", "/api/checkout/expire-reservations": "POST",
  "/api/admin/users": "GET",
};

export async function handleApi(request: Request, env: StorefrontEnv): Promise<Response> {
  const url = new URL(request.url);
  const method = methods[url.pathname];
  if (!method) return json({ code: "NOT_FOUND", error: "Rota não encontrada." }, 404);
  if (request.method !== method) return json({ error: "Método não permitido." }, 405, { Allow: method });
  const origin = request.headers.get("Origin");
  if (origin && origin !== url.origin) return json({ code: "ORIGIN_FORBIDDEN" }, 403);
  if (!enabled(env)) return json({ code: "SHOP_API_DISABLED" }, 503);

  try {
    if (url.pathname === "/api/checkout/expire-reservations") {
      const expected = env.RESERVATION_PROCESSOR_SECRET;
      if (!configured(env) || !expected || expected.length < 16) return json({ code: "CONFIGURATION_INVALID" }, 503);
      const provided = request.headers.get("x-reservation-processor-secret")?.trim() ?? "";
      if (!(await secretMatches(provided, expected))) return json({ error: "Não autorizado." }, 401);
      const payload = request.body ? await readJson(request, 1024) : {};
      return json(await expire(env, payload));
    }

    const token = request.headers.get("Authorization")?.match(/^Bearer (.+)$/)?.[1].trim();
    if (!token) return json({ error: "Autenticação necessária." }, 401);
    if (!configured(env)) return json({ code: "CONFIGURATION_INVALID" }, 503);
    const { data: authData, error: authError } = await client(env).auth.getUser(token);
    if (authError && (!authError.status || authError.status >= 500)) {
      return json({ code: "AUTH_UNAVAILABLE" }, 503);
    }
    if (authError || !authData.user) return json({ error: "Sessão inválida ou expirada." }, 401);
    const user = authData.user;

    if (url.pathname === "/api/admin/users") {
      if (user.app_metadata?.role !== "admin") return json({ error: "Acesso negado." }, 403);
      const page = Math.max(1, Number.parseInt(url.searchParams.get("page") ?? "1", 10) || 1);
      const perPage = Math.min(50, Math.max(1, Number.parseInt(url.searchParams.get("perPage") ?? "25", 10) || 25));
      const admin = client(env, true);
      const { data, error } = await admin.auth.admin.listUsers({ page, perPage });
      if (error) return json({ error: "Não foi possível carregar os usuários." }, 503);
      const ids = data.users.map(u => u.id);
      const profilesResult = ids.length
        ? await admin.from("profiles").select("id, full_name, phone, cpf").in("id", ids)
        : { data: [], error: null };
      if (profilesResult.error) return json({ error: "Não foi possível carregar os perfis." }, 503);
      const profiles = new Map((profilesResult.data ?? []).map(p => [p.id, p]));
      return json({ users: data.users.map(u => {
        const p = profiles.get(u.id);
        return {
          id: u.id, email: u.email ?? null, fullName: p?.full_name ?? null,
          phone: p?.phone ?? null, cpf: maskCpf(p?.cpf ?? null),
          provider: u.app_metadata?.provider ?? u.identities?.[0]?.provider ?? null, createdAt: u.created_at,
        };
      }), total: data.total });
    }

    const body = await readJson(request, url.pathname.endsWith("/quote") ? 8 * 1024 : MAX_ORDER_BODY_BYTES);
    const backend = client(env, true);
    if (url.pathname === "/api/checkout/order") {
      const key = parseIdempotencyKey(request.headers.get("Idempotency-Key") ?? undefined);
      const payload = parseCheckoutOrderPayload(body);
      const { data, error } = await backend.rpc("create_checkout_order", {
        p_user_id: user.id, p_idempotency_key: key, p_items: payload.items,
        p_shipping_address_id: payload.shippingAddressId, p_payment_method: payload.paymentMethod,
      });
      if (error) throw mapCheckoutDatabaseError(error);
      return json(parseCheckoutOrderResult(data));
    }
    if (url.pathname === "/api/checkout/cancel") {
      const payload = parseCancelPayload(body);
      const { data, error } = await backend.rpc("cancel_checkout_order", {
        p_user_id: user.id, p_order_id: payload.orderId,
      });
      if (error) throw mapCancelDatabaseError(error);
      return json(parseCancelResult(data));
    }

    const payload = parseQuotePayload(body);
    const { data, error } = await backend.from("product_variants")
      .select("id, product_id, size, color_name, stock_quantity, is_active, products!inner(id, name, price_cents, is_active)")
      .in("id", payload.items.map(item => item.variantId));
    if (error) throw new QuoteError("CATALOG_UNAVAILABLE", 503, "Não foi possível calcular o orçamento.");
    const priced = buildAuthoritativeQuote(payload, data, 0);
    const shipping = await backend.rpc("compute_shipping_cents", {
      p_state: payload.shippingState, p_subtotal_cents: priced.subtotalCents,
    });
    if (shipping.error || !Number.isInteger(shipping.data)) {
      throw new QuoteError("SHIPPING_UNAVAILABLE", 422, "Não foi possível calcular o frete.");
    }
    return json(buildAuthoritativeQuote(payload, data, shipping.data));
  } catch (error) {
    if (error instanceof CheckoutOrderError || error instanceof CancelCheckoutError ||
        error instanceof ExpireReservationsError || error instanceof QuoteError) {
      return json({ code: error.code, error: error.message }, error.status);
    }
    if (error instanceof HttpError) return json({ code: error.code }, error.status);
    return json({ code: "SERVICE_UNAVAILABLE", error: "Não foi possível concluir a solicitação." }, 503);
  }
}

import { readConfig, type Bindings, type Config } from "./config";
import { handleCheckoutPro } from "./checkout-pro-handler";
import { HttpError } from "./http";

const VERSION = "0.2.0";
const ALLOWED_HEADERS = ["authorization", "content-type", "idempotency-key"];

function routeMethod(path: string): string | undefined {
  if (path === "/health") return "GET";
  if (["/v1/checkout/quote", "/v1/checkout/orders", "/v1/checkout/payments",
    "/v1/checkout/preferences", "/webhooks/mercadopago"].includes(path)) return "POST";
  if (/^\/v1\/checkout\/orders\/[0-9a-f-]{36}\/status$/i.test(path)) return "GET";
}

function json(value: unknown, status = 200): Response {
  return Response.json(value, { status });
}

async function dispatch(request: Request, config: Config, env: Bindings): Promise<Response> {
  const path = new URL(request.url).pathname;
  const method = routeMethod(path);
  if (!method) return json({ error: { code: "NOT_FOUND" } }, 404);
  if (request.method === "OPTIONS") {
    const requestedMethod = request.headers.get("Access-Control-Request-Method");
    const headers = (request.headers.get("Access-Control-Request-Headers") ?? "")
      .split(",").map((s) => s.trim().toLowerCase()).filter(Boolean);
    if (!request.headers.has("Origin") || requestedMethod !== method ||
      headers.some((h) => !ALLOWED_HEADERS.includes(h)) || path === "/webhooks/mercadopago") {
      return json({ error: { code: "CORS_DENIED" } }, 403);
    }
    return new Response(null, {
      status: 204,
      headers: {
        "Access-Control-Allow-Methods": method,
        "Access-Control-Allow-Headers": ALLOWED_HEADERS.join(", "),
        "Access-Control-Max-Age": "300",
      },
    });
  }
  if (request.method !== method) {
    const response = json({ error: { code: "METHOD_NOT_ALLOWED" } }, 405);
    response.headers.set("Allow", method);
    return response;
  }
  if (path === "/health") {
    return json({ status: "ok", service: "nada-normal-payments", version: VERSION,
      environment: config.environment, paymentsEnabled: config.paymentsEnabled });
  }
  if (config.checkoutPro && (path === "/v1/checkout/preferences" || path === "/webhooks/mercadopago" || path.endsWith("/status"))) {
    return handleCheckoutPro(request, env, config);
  }
  const code = ["/v1/checkout/payments", "/v1/checkout/preferences"].includes(path) ? "PAYMENTS_DISABLED" : "NOT_IMPLEMENTED";
  return json({ error: { code } }, 503);
}

export default {
  async fetch(request: Request, env: Bindings): Promise<Response> {
    const requestId = crypto.randomUUID();
    let response: Response;
    let config: Config | undefined;
    try {
      config = readConfig(env);
      const origin = request.headers.get("Origin");
      response = origin !== null && !config.origins.includes(origin)
        ? json({ error: { code: "CORS_DENIED" } }, 403)
        : await dispatch(request, config, env);
    } catch (error) {
      response = error instanceof HttpError ? json({ error: { code: error.code } }, error.status)
        : json({ error: { code: config ? "CHECKOUT_UNAVAILABLE" : "CONFIGURATION_INVALID" } }, 503);
    }
    response.headers.set("Cache-Control", "no-store");
    response.headers.set("X-Content-Type-Options", "nosniff");
    response.headers.set("X-Request-Id", requestId);
    response.headers.set("Vary", "Origin, Access-Control-Request-Method, Access-Control-Request-Headers");
    const origin = request.headers.get("Origin");
    if (origin && config?.origins.includes(origin)) {
      response.headers.set("Access-Control-Allow-Origin", origin);
      response.headers.set("Access-Control-Expose-Headers", "X-Request-Id");
    }
    // Allowlist-only telemetry: never log URL, headers, body, bindings or caught errors.
    console.info(JSON.stringify({ event: "http_response", requestId, status: response.status }));
    return response;
  },
} satisfies ExportedHandler<Bindings>;

import { configured, enabled, handleApi, processScheduledReservations, type StorefrontEnv } from "./api";
import { json } from "./http";

export default {
  async fetch(request: Request, env: StorefrontEnv): Promise<Response> {
    const id = crypto.randomUUID();
    const path = new URL(request.url).pathname;
    let response: Response;
    try {
      if (path === "/health") {
        response = request.method === "GET"
          ? json({ status: "ok", service: "storefront", version: "0.1.0", environment: env.APP_ENV,
            apiEnabled: enabled(env), configured: configured(env) })
          : json({ error: "Método não permitido." }, 405, { Allow: "GET" });
      } else if (path === "/api" || path.startsWith("/api/")) {
        response = await handleApi(request, env);
      } else if (env.ASSETS) {
        response = await env.ASSETS.fetch(request);
      } else {
        response = json({ code: "ASSETS_UNAVAILABLE" }, 503);
      }
    } catch {
      response = json({ code: "SERVICE_UNAVAILABLE" }, 503);
    }
    const safe = new Response(response.body, response);
    safe.headers.set("X-Request-Id", id);
    safe.headers.set("X-Content-Type-Options", "nosniff");
    return safe;
  },
  async scheduled(_event: ScheduledController, env: StorefrontEnv): Promise<void> {
    await processScheduledReservations(env);
  },
} satisfies ExportedHandler<StorefrontEnv>;

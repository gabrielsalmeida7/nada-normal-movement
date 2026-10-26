import type { Bindings } from "./config";
import { upstreamJson } from "./http";

export function rpc(env: Bindings, name: string, body: Record<string, unknown>): Promise<unknown> {
  return upstreamJson(`${env.SUPABASE_URL}/rest/v1/rpc/${name}`, {
    method: "POST", headers: { apikey: env.SUPABASE_SECRET_KEY!, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

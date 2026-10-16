export const REQUIRED_SECRETS = [
  "SUPABASE_SECRET_KEY",
  "MP_ACCESS_TOKEN",
  "MP_WEBHOOK_SECRET",
] as const;

export interface Bindings {
  APP_ENV?: string;
  PAYMENTS_ENABLED?: string;
  ALLOWED_ORIGINS?: string;
  SUPABASE_URL?: string;
  SUPABASE_PUBLISHABLE_KEY?: string;
  SUPABASE_SECRET_KEY?: string;
  MP_ACCESS_TOKEN?: string;
  MP_WEBHOOK_SECRET?: string;
}

export interface Config {
  environment: "local" | "staging" | "production";
  origins: string[];
}

function isLoopback(url: URL): boolean {
  return ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname);
}

function originUrl(value: string): URL {
  const url = new URL(value);
  if (url.origin !== value || url.username || url.password || url.hostname.includes("*")) throw new Error();
  return url;
}

/** Never attach bindings, values or parser errors to this error. */
export function readConfig(env: Bindings): Config {
  try {
    const environment = env.APP_ENV;
    if (!["local", "staging", "production"].includes(environment ?? "")) throw new Error();
    // Phase 0 cannot enable charging, even if someone flips the flag manually.
    if (env.PAYMENTS_ENABLED !== "false") throw new Error();
    const origins = (env.ALLOWED_ORIGINS ?? "").split(",").map((s) => s.trim());
    if (!origins.length || origins.some((s) => !s)) throw new Error();
    for (const value of origins) {
      const url = originUrl(value);
      if (environment === "local") {
        if (!isLoopback(url) || !["http:", "https:"].includes(url.protocol)) throw new Error();
      } else if (url.protocol !== "https:" || isLoopback(url)) {
        throw new Error();
      }
    }
    if (environment !== "local") {
      const supabase = originUrl(env.SUPABASE_URL ?? "");
      if (supabase.protocol !== "https:" || isLoopback(supabase)) throw new Error();
      if (!env.SUPABASE_PUBLISHABLE_KEY?.trim()) throw new Error();
      if (REQUIRED_SECRETS.some((name) => !env[name]?.trim())) throw new Error();
    }
    return { environment: environment as Config["environment"], origins: [...new Set(origins)] };
  } catch {
    throw new Error("CONFIGURATION_INVALID");
  }
}

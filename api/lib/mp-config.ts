export function getMpAccessToken(): string | undefined {
  return process.env.MP_ACCESS_TOKEN;
}

export function getSupabaseUrl(): string | undefined {
  return process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL;
}

export function getSupabaseAnonKey(): string | undefined {
  return process.env.SUPABASE_ANON_KEY ?? process.env.VITE_SUPABASE_ANON_KEY;
}

export function getSupabaseServiceRoleKey(): string | undefined {
  return process.env.SUPABASE_SERVICE_ROLE_KEY;
}

export function getBaseUrl(): string {
  const vercelUrl = process.env.VERCEL_URL;
  if (vercelUrl) {
    return vercelUrl.includes("localhost") ? `http://${vercelUrl}` : `https://${vercelUrl}`;
  }
  return process.env.BASE_URL ?? "http://localhost:5173";
}

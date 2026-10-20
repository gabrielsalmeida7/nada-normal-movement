import { createClient } from "@supabase/supabase-js";
import type { VercelRequest, VercelResponse } from "@vercel/node";

function getBearerToken(header: string | string[] | undefined): string | null {
  const value = Array.isArray(header) ? header[0] : header;
  if (!value?.startsWith("Bearer ")) return null;
  return value.slice(7).trim() || null;
}

function maskCpf(cpf: string | null): string | null {
  if (!cpf) return null;
  const digits = cpf.replace(/\D/g, "");
  if (digits.length !== 11) return "***.***.***-**";
  return `${digits.slice(0, 3)}.***.***-${digits.slice(-2)}`;
}

export default async function handler(request: VercelRequest, response: VercelResponse) {
  if (request.method !== "GET") {
    response.setHeader("Allow", "GET");
    return response.status(405).json({ error: "Método não permitido." });
  }

  const token = getBearerToken(request.headers.authorization);
  if (!token) return response.status(401).json({ error: "Autenticação necessária." });

  const supabaseUrl = process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL;
  const anonKey = process.env.SUPABASE_ANON_KEY ?? process.env.VITE_SUPABASE_ANON_KEY;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !anonKey || !serviceRoleKey) {
    return response.status(500).json({ error: "Servidor não configurado." });
  }

  const authClient = createClient(supabaseUrl, anonKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const { data: authData, error: authError } = await authClient.auth.getUser(token);
  if (authError || !authData.user) {
    return response.status(401).json({ error: "Sessão inválida ou expirada." });
  }
  if (authData.user.app_metadata?.role !== "admin") {
    return response.status(403).json({ error: "Acesso negado." });
  }

  const pageValue = Array.isArray(request.query.page) ? request.query.page[0] : request.query.page;
  const perPageValue = Array.isArray(request.query.perPage) ? request.query.perPage[0] : request.query.perPage;
  const page = Math.max(1, Number.parseInt(pageValue ?? "1", 10) || 1);
  const perPage = Math.min(50, Math.max(1, Number.parseInt(perPageValue ?? "25", 10) || 25));

  const adminClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const { data: usersData, error: usersError } = await adminClient.auth.admin.listUsers({ page, perPage });
  if (usersError) return response.status(500).json({ error: "Não foi possível carregar os usuários." });

  const userIds = usersData.users.map((user) => user.id);
  const profilesResult = userIds.length
    ? await adminClient.from("profiles").select("id, full_name, phone, cpf").in("id", userIds)
    : { data: [], error: null };
  if (profilesResult.error) {
    return response.status(500).json({ error: "Não foi possível carregar os perfis." });
  }

  const profiles = new Map((profilesResult.data ?? []).map((profile) => [profile.id, profile]));
  const users = usersData.users.map((user) => {
    const profile = profiles.get(user.id);
    return {
      id: user.id,
      email: user.email ?? null,
      fullName: profile?.full_name ?? null,
      phone: profile?.phone ?? null,
      cpf: maskCpf(profile?.cpf ?? null),
      provider: user.app_metadata?.provider ?? user.identities?.[0]?.provider ?? null,
      createdAt: user.created_at,
    };
  });
  const total = "total" in usersData ? usersData.total : users.length;

  response.setHeader("Cache-Control", "private, no-store");
  return response.status(200).json({ users, total });
}

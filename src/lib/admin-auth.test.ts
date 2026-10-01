import type { User } from "@supabase/supabase-js";
import { describe, expect, it } from "vitest";
import { getAdminAccessState, getPostLoginDestination, isAdminUser } from "@/lib/admin-auth";

function userWithRole(role?: string): User {
  return {
    id: "00000000-0000-4000-8000-000000000001",
    app_metadata: role ? { role } : {},
    user_metadata: {},
    aud: "authenticated",
    created_at: new Date(0).toISOString(),
  } as User;
}

describe("autorização administrativa", () => {
  it("reconhece apenas o papel admin em app_metadata", () => {
    expect(isAdminUser(userWithRole("admin"))).toBe(true);
    expect(isAdminUser(userWithRole("customer"))).toBe(false);
    expect(isAdminUser(userWithRole())).toBe(false);
    expect(isAdminUser(null)).toBe(false);
  });

  it("mantém o carregamento antes de decidir o acesso", () => {
    expect(getAdminAccessState({ loading: true, user: null })).toBe("loading");
  });

  it("diferencia login ausente, acesso negado e admin", () => {
    expect(getAdminAccessState({ loading: false, user: null })).toBe("unauthenticated");
    expect(getAdminAccessState({ loading: false, user: userWithRole("customer") })).toBe("forbidden");
    expect(getAdminAccessState({ loading: false, user: userWithRole("admin") })).toBe("allowed");
  });

  it("direciona admin ao painel e mantém o destino seguro dos demais usuários", () => {
    expect(getPostLoginDestination(userWithRole("admin"), "/checkout")).toBe("/admin");
    expect(getPostLoginDestination(userWithRole("customer"), "/checkout")).toBe("/checkout");
    expect(getPostLoginDestination(userWithRole("customer"), "//site-externo.test")).toBe("/home");
  });
});

import type { User } from "@supabase/supabase-js";

export function isAdminUser(user: User | null | undefined): boolean {
  return user?.app_metadata?.role === "admin";
}

export function getPostLoginDestination(
  user: User | null | undefined,
  requestedPath: string,
): string {
  if (isAdminUser(user)) return "/admin";
  return requestedPath.startsWith("/") && !requestedPath.startsWith("//")
    ? requestedPath
    : "/home";
}

export type AdminAccessState = "loading" | "unauthenticated" | "forbidden" | "allowed";

export function getAdminAccessState({
  loading,
  user,
}: {
  loading: boolean;
  user: User | null | undefined;
}): AdminAccessState {
  if (loading) return "loading";
  if (!user) return "unauthenticated";
  return isAdminUser(user) ? "allowed" : "forbidden";
}

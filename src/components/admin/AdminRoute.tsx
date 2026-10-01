import { Navigate, Outlet, useLocation } from "react-router-dom";
import { ShieldX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { getAdminAccessState } from "@/lib/admin-auth";

export function AdminRoute() {
  const { user, loading, signOut } = useAuth();
  const location = useLocation();
  const accessState = getAdminAccessState({ loading, user });

  switch (accessState) {
    case "loading":
      return (
        <div className="flex min-h-screen items-center justify-center bg-background">
          <p className="text-muted-foreground">Validando acesso…</p>
        </div>
      );
    case "unauthenticated":
      return <Navigate to={`/login?redirect=${encodeURIComponent(location.pathname)}`} replace />;
    case "forbidden":
      return (
        <main className="flex min-h-screen items-center justify-center bg-background p-6">
          <section className="w-full max-w-md rounded-lg border bg-card p-8 text-center">
            <ShieldX className="mx-auto mb-4 h-12 w-12 text-destructive" />
            <h1 className="font-display text-2xl">Acesso negado</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Esta conta não possui permissão administrativa.
            </p>
            <Button className="mt-6" variant="outline" onClick={() => signOut()}>
              Sair da conta
            </Button>
          </section>
        </main>
      );
    case "allowed":
      return <Outlet />;
    default: {
      const exhaustiveCheck: never = accessState;
      return exhaustiveCheck;
    }
  }
}

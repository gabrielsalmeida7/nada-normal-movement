import { BarChart3, Boxes, Home, LogOut, Menu, PackageSearch, Users, X } from "lucide-react";
import { useState } from "react";
import { Link, NavLink, Outlet, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";

const navigation = [
  { to: "/admin", label: "Visão geral", icon: BarChart3, end: true },
  { to: "/admin/produtos", label: "Produtos", icon: Boxes },
  { to: "/admin/usuarios", label: "Usuários", icon: Users },
  { to: "/admin/pedidos", label: "Pedidos", icon: PackageSearch },
];

export function AdminLayout() {
  const [menuOpen, setMenuOpen] = useState(false);
  const { user, signOut } = useAuth();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  const sidebar = (
    <>
      <Link to="/" className="flex items-center gap-2 border-b p-5 font-display text-xl">
        <Home className="h-5 w-5 text-nn-pink" />
        Nada Normal
      </Link>
      <nav className="flex-1 space-y-1 p-3">
        {navigation.map(({ to, label, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            onClick={() => setMenuOpen(false)}
            className={({ isActive }) =>
              cn(
                "flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors",
                isActive
                  ? "bg-nn-pink text-nn-black"
                  : "text-muted-foreground hover:bg-accent hover:text-foreground",
              )
            }
          >
            <Icon className="h-4 w-4" />
            {label}
          </NavLink>
        ))}
      </nav>
      <div className="border-t p-4">
        <p className="mb-3 truncate text-xs text-muted-foreground" title={user?.email}>
          {user?.email}
        </p>
        <Button variant="ghost" className="w-full justify-start" onClick={handleSignOut}>
          <LogOut className="mr-2 h-4 w-4" />
          Sair
        </Button>
      </div>
    </>
  );

  return (
    <div className="min-h-screen bg-muted/30">
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 flex-col border-r bg-card md:flex">
        {sidebar}
      </aside>

      {menuOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <button
            type="button"
            className="absolute inset-0 bg-black/60"
            aria-label="Fechar navegação"
            onClick={() => setMenuOpen(false)}
          />
          <aside className="relative flex h-full w-72 flex-col bg-card shadow-xl">
            <Button
              size="icon"
              variant="ghost"
              className="absolute right-2 top-2"
              aria-label="Fechar menu"
              onClick={() => setMenuOpen(false)}
            >
              <X className="h-5 w-5" />
            </Button>
            {sidebar}
          </aside>
        </div>
      )}

      <div className="md:pl-64">
        <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b bg-background/95 px-4 backdrop-blur md:px-8">
          <Button
            size="icon"
            variant="outline"
            className="md:hidden"
            aria-label="Abrir menu"
            onClick={() => setMenuOpen(true)}
          >
            <Menu className="h-5 w-5" />
          </Button>
          <h1 className="font-display text-lg uppercase tracking-wide">Painel administrativo</h1>
        </header>
        <main className="p-4 md:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

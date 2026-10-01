import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Menu, X, AlertTriangle, Gauge, LogOut, ShoppingBag, User } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/contexts/AuthContext";
import { getFirstName } from "@/lib/welcome-messages";
import { useCartStore } from "@/stores/cart-store";

const navItems = [
  { label: "Início", href: "/" },
  { label: "Running", href: "/running", soon: true },
  { label: "Street", href: "/street" },
  // { label: "Social", href: "/social" }, // Social comentado por enquanto
  { label: "Manifesto", href: "#manifesto" },
  { label: "Comunidade", href: "#community" },
];

interface NavigationLinkProps {
  item: (typeof navItems)[number];
  mobile?: boolean;
  onNavigate?: () => void;
}

function NavigationLink({ item, mobile = false, onNavigate }: NavigationLinkProps) {
  const className = item.soon
    ? mobile
      ? "font-display text-2xl uppercase tracking-wider text-foreground/40 py-2 flex items-center gap-3 cursor-not-allowed"
      : "font-display text-base uppercase tracking-wider text-foreground/40 cursor-not-allowed relative inline-flex items-center gap-2"
    : mobile
      ? "font-display text-2xl uppercase tracking-wider text-foreground hover:text-nn-pink transition-colors py-2"
      : "font-display text-base uppercase tracking-wider text-foreground/80 hover:text-nn-pink transition-colors relative group";

  const content = (
    <>
      {item.label}
      {item.soon ? (
        <span className="text-[10px] tracking-widest bg-nn-pink text-nn-white px-1.5 py-0.5 -rotate-6">
          EM BREVE
        </span>
      ) : mobile ? null : (
        <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-gradient-to-r from-nn-purple-neon to-nn-pink transition-all duration-300 group-hover:w-full" />
      )}
    </>
  );

  if (item.soon) {
    return (
      <span aria-disabled="true" className={className}>
        {content}
      </span>
    );
  }

  if (item.href.startsWith("/")) {
    return (
      <Link to={item.href} onClick={onNavigate} className={className}>
        {content}
      </Link>
    );
  }

  return (
    <a href={item.href} onClick={onNavigate} className={className}>
      {content}
    </a>
  );
}

export const Header = () => {
  const [isOpen, setIsOpen] = useState(false);
  const navigate = useNavigate();
  const { user, isAdmin, signOut } = useAuth();
  const totalCartItems = useCartStore((state) =>
    state.items.reduce((total, item) => total + item.quantity, 0),
  );

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-background/95 backdrop-blur-md border-b-4 border-nn-purple-neon">
      <div className="container mx-auto">
        <div className="flex items-center justify-between h-28">
          {/* Logo - 50% larger */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
          >
            <Link to="/" className="flex items-center">
              <img
                alt="Nada Normal"
                className="h-[126px] w-auto drop-shadow-[0_0_15px_hsl(270,100%,60%,0.5)]"
                src="/lovable-uploads/954aa667-c5fd-44ca-b757-b6ae62dbdb1e.png"
              />
            </Link>
          </motion.div>

          {/* Desktop Navigation */}
          <nav className="hidden lg:flex items-center gap-8">
            {navItems.map((item, index) => {
              return (
                <motion.div
                  key={item.label}
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                >
                  <NavigationLink item={item} />
                </motion.div>
              );
            })}
          </nav>

          {/* Actions */}
          <div className="flex items-center gap-4">
            <Link
              to="/carrinho"
              className="relative inline-flex h-10 w-10 items-center justify-center rounded-md text-foreground/80 transition-colors hover:bg-accent hover:text-nn-pink"
              aria-label={`Carrinho com ${totalCartItems} ${totalCartItems === 1 ? "item" : "itens"}`}
            >
              <ShoppingBag className="h-5 w-5" />
              {totalCartItems > 0 && (
                <span className="absolute -right-1 -top-1 flex min-h-5 min-w-5 items-center justify-center rounded-full bg-nn-pink px-1 text-[10px] font-bold text-white">
                  {totalCartItems > 99 ? "99+" : totalCartItems}
                </span>
              )}
            </Link>

            {user ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    className="hidden md:flex font-display text-base tracking-wider gap-2 text-foreground/80 hover:text-nn-pink"
                  >
                    <User size={18} />
                    {getFirstName(user)}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <div className="px-2 py-1.5 text-xs text-muted-foreground truncate" title={user.email ?? undefined}>
                    {user.email}
                  </div>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link to="/" className="cursor-pointer">
                      Início
                    </Link>
                  </DropdownMenuItem>
                  {isAdmin && (
                    <DropdownMenuItem asChild>
                      <Link to="/admin" className="cursor-pointer">
                        <Gauge className="mr-2 h-4 w-4" />
                        Painel administrativo
                      </Link>
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuItem onClick={handleSignOut} className="cursor-pointer text-destructive focus:text-destructive">
                    <LogOut className="mr-2 h-4 w-4" />
                    Sair
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <Link to="/login" className="hidden md:block">
                <Button className="bg-nn-yellow text-nn-black border-4 border-nn-black hover:bg-nn-yellow/90 animate-pulse-glow font-display text-base tracking-wider rounded-[20px_5px_20px_5px] h-10 px-4 py-2 gap-2 items-center justify-center">
                  <AlertTriangle size={18} />
                  NÃO ENTRE!
                </Button>
              </Link>
            )}

            {/* Mobile menu button */}
            <button
              type="button"
              onClick={() => setIsOpen(!isOpen)}
              className="lg:hidden p-2 text-foreground"
              aria-label={isOpen ? "Fechar menu" : "Abrir menu"}
              aria-expanded={isOpen}
            >
              {isOpen ? <X size={28} /> : <Menu size={28} />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Navigation */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="lg:hidden bg-card border-t border-nn-purple-neon/30 overflow-hidden"
          >
            <nav className="container py-6 flex flex-col gap-4">
              {navItems.map((item) => (
                <NavigationLink
                  key={item.label}
                  item={item}
                  mobile
                  onNavigate={() => setIsOpen(false)}
                />
              ))}
              <Link
                to="/carrinho"
                onClick={() => setIsOpen(false)}
                className="flex items-center gap-3 py-2 font-display text-2xl uppercase tracking-wider text-foreground hover:text-nn-pink"
              >
                <ShoppingBag className="h-6 w-6" />
                Carrinho
                {totalCartItems > 0 && (
                  <span className="rounded-full bg-nn-pink px-2 py-0.5 text-xs text-white">
                    {totalCartItems}
                  </span>
                )}
              </Link>
              {user ? (
                <>
                  {isAdmin && (
                    <Link
                      to="/admin"
                      onClick={() => setIsOpen(false)}
                      className="flex items-center gap-3 py-2 font-display text-2xl uppercase tracking-wider text-foreground hover:text-nn-pink"
                    >
                      <Gauge className="h-6 w-6" />
                      Painel admin
                    </Link>
                  )}
                  <Button
                    variant="hero"
                    size="lg"
                    className="mt-4 w-full"
                    onClick={() => {
                      setIsOpen(false);
                      handleSignOut();
                    }}
                  >
                    <LogOut className="mr-2 h-5 w-5" />
                    Sair
                  </Button>
                </>
              ) : (
                <Link to="/login" onClick={() => setIsOpen(false)}>
                  <Button variant="hero" size="lg" className="mt-4 w-full">
                    Entrar no Movimento
                  </Button>
                </Link>
              )}
            </nav>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
};

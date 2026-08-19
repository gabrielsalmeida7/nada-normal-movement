import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Menu, X, AlertTriangle, LogOut, User } from "lucide-react";
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

const navItems = [
  { label: "Início", href: "/" },
  { label: "Running", href: "/running", soon: true },
  { label: "Street", href: "/street", soon: true },
  // { label: "Social", href: "/social" }, // Social comentado por enquanto
  { label: "Manifesto", href: "#manifesto" },
  { label: "Comunidade", href: "#community" },
];

export const Header = () => {
  const [isOpen, setIsOpen] = useState(false);
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const totalItems = useCartStore((s) => s.totalItems());

  const handleSignOut = async () => {
    await signOut();
    navigate("/home");
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
            <Link to="/home" className="flex items-center">
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
              const isRoute = item.href.startsWith("/");
              const Comp = isRoute ? Link : "a";
              const linkProps = isRoute ? { to: item.href } : { href: item.href };
              return (
                <motion.div
                  key={item.label}
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                >
                  <Comp
                    {...(linkProps as any)}
                    className="font-display text-base uppercase tracking-wider text-foreground/80 hover:text-nn-pink transition-colors relative group"
                  >
                    {item.label}
                    <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-gradient-to-r from-nn-purple-neon to-nn-pink transition-all duration-300 group-hover:w-full" />
                  </Comp>
                </motion.div>
              );
            })}
          </nav>

          {/* Actions */}
          <div className="flex items-center gap-4">
            <Link to="/carrinho">
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="relative p-2 text-foreground/80 hover:text-nn-pink transition-colors"
              >
                <ShoppingBag size={24} />
                {totalItems > 0 && (
                  <span className="absolute -top-1 -right-1 min-w-5 h-5 px-1 bg-nn-pink text-nn-black text-xs font-bold flex items-center justify-center rounded-full">
                    {totalItems > 99 ? "99+" : totalItems}
                  </span>
                )}
              </motion.div>
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
                    <Link to="/home" className="cursor-pointer">
                      Início
                    </Link>
                  </DropdownMenuItem>
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
              onClick={() => setIsOpen(!isOpen)}
              className="lg:hidden p-2 text-foreground"
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
              {navItems.map((item) => {
                const isRoute = item.href.startsWith("/");
                const Comp = isRoute ? Link : "a";
                const linkProps = isRoute ? { to: item.href } : { href: item.href };
                return (
                  <Comp
                    key={item.label}
                    {...(linkProps as any)}
                    onClick={() => setIsOpen(false)}
                    className="font-display text-2xl uppercase tracking-wider text-foreground hover:text-nn-pink transition-colors py-2"
                  >
                    {item.label}
                  </Comp>
                );
              })}
              {user ? (
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

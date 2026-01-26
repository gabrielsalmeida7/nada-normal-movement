import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Menu, X, ShoppingBag, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import logo from "@/assets/logo-cyan.jpeg";
const navItems = [{
  label: "Início",
  href: "#home"
}, {
  label: "Running",
  href: "#running"
}, {
  label: "Street",
  href: "#street"
}, {
  label: "Social",
  href: "#social"
}, {
  label: "Manifesto",
  href: "#manifesto"
}, {
  label: "Comunidade",
  href: "#community"
}];
export const Header = () => {
  const [isOpen, setIsOpen] = useState(false);
  return <header className="fixed top-0 left-0 right-0 z-50 bg-background/90 backdrop-blur-md border-b border-border">
      <div className="container mx-auto">
        <div className="flex items-center justify-between h-20">
          {/* Logo */}
          <motion.a href="#home" initial={{
          opacity: 0,
          x: -20
        }} animate={{
          opacity: 1,
          x: 0
        }} className="flex items-center">
            <img alt="Nada Normal" className="h-14 w-auto" src="/lovable-uploads/954aa667-c5fd-44ca-b757-b6ae62dbdb1e.png" />
          </motion.a>

          {/* Desktop Navigation */}
          <nav className="hidden lg:flex items-center gap-8">
            {navItems.map((item, index) => <motion.a key={item.label} href={item.href} initial={{
            opacity: 0,
            y: -10
          }} animate={{
            opacity: 1,
            y: 0
          }} transition={{
            delay: index * 0.1
          }} className="font-display text-sm uppercase tracking-wider text-foreground/80 hover:text-primary transition-colors relative group">
                {item.label}
                <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-primary transition-all duration-300 group-hover:w-full" />
              </motion.a>)}
          </nav>

          {/* Actions */}
          <div className="flex items-center gap-4">
            <motion.button initial={{
            opacity: 0
          }} animate={{
            opacity: 1
          }} className="relative p-2 text-foreground/80 hover:text-primary transition-colors">
              <ShoppingBag size={24} />
              <span className="absolute -top-1 -right-1 w-5 h-5 bg-primary text-primary-foreground text-xs font-bold flex items-center justify-center">
                0
              </span>
            </motion.button>

            <Button variant="neon" size="sm" className="hidden md:flex">
              <User size={18} />
              Entrar
            </Button>

            {/* Mobile menu button */}
            <button onClick={() => setIsOpen(!isOpen)} className="lg:hidden p-2 text-foreground">
              {isOpen ? <X size={28} /> : <Menu size={28} />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Navigation */}
      <AnimatePresence>
        {isOpen && <motion.div initial={{
        opacity: 0,
        height: 0
      }} animate={{
        opacity: 1,
        height: "auto"
      }} exit={{
        opacity: 0,
        height: 0
      }} className="lg:hidden bg-card border-t border-border overflow-hidden">
            <nav className="container py-6 flex flex-col gap-4">
              {navItems.map(item => <a key={item.label} href={item.href} onClick={() => setIsOpen(false)} className="font-display text-2xl uppercase tracking-wider text-foreground hover:text-primary transition-colors py-2">
                  {item.label}
                </a>)}
              <Button variant="hero" size="lg" className="mt-4">
                Entrar no Movimento
              </Button>
            </nav>
          </motion.div>}
      </AnimatePresence>
    </header>;
};
import { ShoppingBag } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

export const CartEmpty = () => (
  <div className="flex flex-col items-center justify-center py-16 text-center">
    <div className="w-24 h-24 rounded-full bg-muted flex items-center justify-center mb-6">
      <ShoppingBag size={48} className="text-muted-foreground" />
    </div>
    <h2 className="font-display text-2xl text-foreground mb-2">Seu carrinho está vazio</h2>
    <p className="text-muted-foreground mb-8 max-w-sm">
      Adicione itens do catálogo para continuar. Explore Running, Street e encontre peças que combinam com você.
    </p>
    <Link to="/running">
      <Button variant="hero" size="lg" className="font-display tracking-wider">
        Ver catálogo
      </Button>
    </Link>
  </div>
);

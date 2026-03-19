import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useCartStore } from "@/stores/cart-store";

export const CartSummary = () => {
  const subtotal = useCartStore((s) => s.subtotal());

  return (
    <div className="border-2 border-nn-purple-neon bg-card p-6 rounded-lg space-y-4">
      <div className="flex justify-between items-center">
        <span className="font-display text-lg text-muted-foreground">Subtotal</span>
        <span className="font-bold text-xl text-nn-pink">
          R$ {subtotal.toFixed(2).replace(".", ",")}
        </span>
      </div>
      <Link to="/checkout" className="block">
        <Button
          variant="hero"
          size="lg"
          className="w-full font-display text-base tracking-wider"
        >
          Continuar para o checkout
        </Button>
      </Link>
    </div>
  );
};

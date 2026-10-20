import { useCartStore } from "@/stores/cart-store";
import type { CartItem } from "@/types/cart";

interface CheckoutSummaryProps {
  shippingCost: number;
}

export function CheckoutSummary({ shippingCost }: CheckoutSummaryProps) {
  const items = useCartStore((s) => s.items);
  const subtotal = useCartStore((s) => s.subtotal());
  const total = subtotal + shippingCost;

  return (
    <div className="border-2 border-nn-purple-neon bg-card p-6 rounded-lg space-y-4">
      <h2 className="font-display text-lg text-foreground">Resumo do pedido</h2>
      <div className="space-y-3 max-h-48 overflow-y-auto">
        {items.map((item) => (
          <div key={`${item.productId}-${item.size ?? ""}-${item.colorName ?? ""}`} className="flex gap-3 text-sm">
            <img
              src={item.image}
              alt={item.name}
              className="w-12 h-12 object-cover rounded flex-shrink-0"
            />
            <div className="flex-1 min-w-0">
              <p className="font-medium truncate">{item.name}</p>
              {(item.size || item.colorName) && (
                <p className="text-muted-foreground text-xs">
                  {[item.size, item.colorName].filter(Boolean).join(" • ")}
                </p>
              )}
            </div>
            <div className="text-right">
              <p>R$ {(item.price * item.quantity).toFixed(2).replace(".", ",")}</p>
              <p className="text-muted-foreground text-xs">x{item.quantity}</p>
            </div>
          </div>
        ))}
      </div>
      <div className="border-t border-border pt-4 space-y-2">
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Subtotal</span>
          <span>R$ {subtotal.toFixed(2).replace(".", ",")}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Frete</span>
          <span>
            {shippingCost === 0 ? (
              <span className="text-nn-lime">Grátis</span>
            ) : (
              `R$ ${shippingCost.toFixed(2).replace(".", ",")}`
            )}
          </span>
        </div>
        <div className="flex justify-between font-bold text-lg pt-2">
          <span>Total</span>
          <span className="text-nn-pink">R$ {total.toFixed(2).replace(".", ",")}</span>
        </div>
      </div>
    </div>
  );
}

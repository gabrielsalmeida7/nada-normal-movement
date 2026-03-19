import { useCartStore } from "@/stores/cart-store";
import { CartItemRow } from "@/components/CartItemRow";
import { CartSummary } from "@/components/CartSummary";
import { CartEmpty } from "@/components/CartEmpty";

export default function Cart() {
  const items = useCartStore((s) => s.items);

  return (
    <main className="min-h-screen pt-32 pb-16">
      <div className="container mx-auto px-4">
        <h1 className="font-display text-3xl sm:text-4xl text-foreground mb-8">Seu carrinho</h1>

        {items.length === 0 ? (
          <CartEmpty />
        ) : (
          <div className="grid gap-8 lg:grid-cols-3">
            <div className="lg:col-span-2 space-y-4">
              {items.map((item) => (
                <CartItemRow key={`${item.productId}-${item.size ?? ""}-${item.colorName ?? ""}`} item={item} />
              ))}
            </div>
            <div className="lg:col-span-1">
              <CartSummary />
            </div>
          </div>
        )}
      </div>
    </main>
  );
}

import { Minus, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useCartStore } from "@/stores/cart-store";
import type { CartItem } from "@/types/cart";

interface CartItemRowProps {
  item: CartItem;
}

export const CartItemRow = ({ item }: CartItemRowProps) => {
  const updateQuantity = useCartStore((s) => s.updateQuantity);
  const removeItem = useCartStore((s) => s.removeItem);

  const size = item.size ?? null;
  const colorName = item.colorName ?? null;

  const handleQtyChange = (value: number) => {
    if (value < 1) {
      removeItem(item.productId, size, colorName);
    } else {
      updateQuantity(item.productId, size, colorName, value);
    }
  };

  const variantLabel = [item.size, item.colorName].filter(Boolean).join(" • ") || undefined;

  return (
    <div className="flex gap-4 sm:gap-6 p-4 border-2 border-border bg-card rounded-lg">
      <img
        src={item.image}
        alt={item.name}
        className="w-20 h-20 sm:w-24 sm:h-24 object-cover rounded-md flex-shrink-0"
      />
      <div className="flex-1 min-w-0">
        <h3 className="font-display text-base sm:text-lg text-foreground truncate">{item.name}</h3>
        {variantLabel && (
          <p className="text-sm text-muted-foreground mt-0.5">
            {variantLabel}
            {item.colorHex && (
              <span
                className="inline-block w-3 h-3 ml-2 rounded-full border border-border align-middle"
                style={{ backgroundColor: item.colorHex }}
              />
            )}
          </p>
        )}
        <p className="font-bold text-nn-pink mt-1">
          R$ {(item.price * item.quantity).toFixed(2).replace(".", ",")}
        </p>
      </div>
      <div className="flex flex-col items-end gap-2">
        <div className="flex items-center gap-1 border border-border rounded-md">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 rounded-r-none"
            onClick={() => handleQtyChange(item.quantity - 1)}
          >
            <Minus size={14} />
          </Button>
          <Input
            type="number"
            min={1}
            value={item.quantity}
            onChange={(e) => {
              const v = parseInt(e.target.value, 10);
              handleQtyChange(isNaN(v) ? 1 : v);
            }}
            className="w-12 h-8 text-center text-sm border-0 rounded-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
          />
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 rounded-l-none"
            onClick={() => handleQtyChange(item.quantity + 1)}
          >
            <Plus size={14} />
          </Button>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
          onClick={() => removeItem(item.productId, size, colorName)}
        >
          <Trash2 size={16} />
        </Button>
      </div>
    </div>
  );
};

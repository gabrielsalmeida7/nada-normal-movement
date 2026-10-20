import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { CartItem, AddToCartPayload } from "@/types/cart";

const CART_KEY = "nn-cart";

function itemKey(item: Pick<CartItem, "productId" | "size" | "colorName">): string {
  const size = item.size ?? "";
  const color = item.colorName ?? "";
  return `${item.productId}|${size}|${color}`;
}

interface CartState {
  items: CartItem[];
  addItem: (payload: AddToCartPayload) => void;
  updateQuantity: (productId: string, size: string | null, colorName: string | null, quantity: number) => void;
  removeItem: (productId: string, size?: string | null, colorName?: string | null) => void;
  clearCart: () => void;
  totalItems: () => number;
  subtotal: () => number;
  itemCount: () => number;
}

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],

      addItem: (payload) => {
        const quantity = payload.quantity ?? 1;
        const size = payload.size ?? null;
        const colorName = payload.colorName ?? null;
        const key = itemKey({ productId: payload.productId, size, colorName });

        set((state) => {
          const idx = state.items.findIndex(
            (i) => itemKey({ productId: i.productId, size: i.size ?? null, colorName: i.colorName ?? null }) === key
          );
          if (idx >= 0) {
            const next = [...state.items];
            next[idx] = { ...next[idx], quantity: next[idx].quantity + quantity };
            return { items: next };
          }
          const newItem: CartItem = {
            ...payload,
            quantity,
            size: size ?? undefined,
            colorName: colorName ?? undefined,
          };
          return { items: [...state.items, newItem] };
        });
      },

      updateQuantity: (productId, size, colorName, quantity) => {
        const key = itemKey({ productId, size: size ?? "", colorName: colorName ?? "" });
        set((state) => {
          if (quantity <= 0) {
            return {
              items: state.items.filter(
                (i) => itemKey({ productId: i.productId, size: i.size ?? null, colorName: i.colorName ?? null }) !== key
              ),
            };
          }
          const idx = state.items.findIndex(
            (i) => itemKey({ productId: i.productId, size: i.size ?? null, colorName: i.colorName ?? null }) === key
          );
          if (idx < 0) return state;
          const next = [...state.items];
          next[idx] = { ...next[idx], quantity };
          return { items: next };
        });
      },

      removeItem: (productId, size, colorName) => {
        const s = size ?? null;
        const c = colorName ?? null;
        const key = itemKey({ productId, size: s, colorName: c });
        set((state) => ({
          items: state.items.filter(
            (i) => itemKey({ productId: i.productId, size: i.size ?? null, colorName: i.colorName ?? null }) !== key
          ),
        }));
      },

      clearCart: () => set({ items: [] }),

      totalItems: () => get().items.reduce((sum, i) => sum + i.quantity, 0),
      subtotal: () => get().items.reduce((sum, i) => sum + i.price * i.quantity, 0),
      itemCount: () => get().items.length,
    }),
    { name: CART_KEY, partialize: (s) => ({ items: s.items }) }
  )
);

import { z } from "zod";
import type { CartItem } from "@/types/cart";

export const checkoutApplicationId = "4897243060269064";
export const checkoutTestApplicationId = "5855568499515388";
export class CheckoutStateError extends Error {
  constructor(message: string, public readonly orderId?: string) { super(message); }
}
export const orderSchema = z.object({ orderId: z.string().uuid(), paymentAttemptId: z.string().uuid(),
  totalCents: z.number().int().positive(), subtotalCents: z.number().int().nonnegative(),
  shippingCents: z.number().int().nonnegative(), reservationExpiresAt: z.string().datetime({ offset: true }) });
const draftSchema = z.object({ fingerprint: z.string(), key: z.string().uuid(), cartSignature: z.string(), order: orderSchema.optional() });
export type CheckoutDraft = z.infer<typeof draftSchema>;
const storageKey = (userId: string) => `nn.checkout-pro.${checkoutApplicationId}.${userId}`;

export function cartSignature(items: CartItem[]) {
  return JSON.stringify(items.map(item => [item.productId, item.productVariantId ?? null,
    item.size ?? null, item.colorName ?? null, item.quantity]).sort((a, b) => JSON.stringify(a).localeCompare(JSON.stringify(b))));
}

export function readCheckoutDraft(userId: string): CheckoutDraft | null {
  let raw: string | null;
  try { raw = sessionStorage.getItem(storageKey(userId)); }
  catch { throw new CheckoutStateError("Permita o armazenamento desta sessão para continuar com segurança."); }
  try { return raw ? draftSchema.parse(JSON.parse(raw)) : null; }
  catch { throw new CheckoutStateError("Não foi possível recuperar este checkout. Consulte seus pedidos antes de tentar novamente."); }
}

export function writeCheckoutDraft(userId: string, draft: CheckoutDraft) {
  try { sessionStorage.setItem(storageKey(userId), JSON.stringify(draft)); }
  catch { throw new CheckoutStateError("Não foi possível salvar esta sessão. Consulte seus pedidos antes de tentar novamente."); }
}

/** Only call after authenticated status confirms payment. Never from SDK callbacks. */
export function consumePaidCheckout(userId: string, orderId: string): string | null {
  try {
    const draft = readCheckoutDraft(userId);
    if (draft?.order?.orderId !== orderId) return null;
    sessionStorage.removeItem(storageKey(userId));
    return draft.cartSignature;
  } catch { return null; }
}

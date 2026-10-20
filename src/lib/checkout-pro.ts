import { z } from "zod";
import { supabase } from "@/lib/supabase";
import type { CartItem } from "@/types/cart";

const orderSchema = z.object({ orderId: z.string().uuid(), paymentAttemptId: z.string().uuid(),
  totalCents: z.number().int().positive(), subtotalCents: z.number().int().nonnegative(),
  shippingCents: z.number().int().nonnegative(), reservationExpiresAt: z.string().datetime({ offset: true }) });
export type PreparedCheckout = z.infer<typeof orderSchema>;
export const checkoutProEnabled = import.meta.env.VITE_CHECKOUT_PRO_ENABLED === "true";

function apiOrigin(): string {
  const url = new URL(import.meta.env.VITE_PAYMENTS_API_URL ?? "");
  if (url.protocol !== "https:" || url.origin !== url.href.replace(/\/$/, "") || url.username || url.password) {
    throw new Error("Pagamento temporariamente indisponível.");
  }
  return url.origin;
}

async function headers(): Promise<Record<string, string>> {
  const { data } = await supabase.auth.getSession();
  if (!data.session) throw new Error("Entre novamente na sua conta para continuar.");
  return { Authorization: `Bearer ${data.session.access_token}`, "Content-Type": "application/json" };
}

async function jsonRequest(url: string, init: RequestInit) {
  const response = await fetch(url, { ...init, signal: AbortSignal.timeout(20000), cache: "no-store" });
  const data = await response.json();
  if (!response.ok) {
    const code = data?.error?.code ?? data?.code;
    throw new Error(code === "CHECKOUT_RECONCILIATION_REQUIRED"
      ? "Estamos verificando seu checkout. Não inicie outro pagamento; consulte este pedido novamente mais tarde."
      : "Não foi possível continuar o pagamento. Seu carrinho permanece salvo.");
  }
  return data;
}

export function validateCheckoutRedirect(value: string): string {
  const url = new URL(value);
  if (url.protocol !== "https:" || url.hostname !== "sandbox.mercadopago.com.br" || url.port ||
      url.username || url.password || url.pathname !== "/checkout/v1/redirect" || !url.searchParams.get("pref_id")) {
    throw new Error("Endereço de pagamento inválido.");
  }
  return url.href;
}

export async function prepareCheckout(userId: string, items: CartItem[], addressId: string, method: "pix" | "credit_card") {
  if (!checkoutProEnabled) throw new Error("Pagamento temporariamente indisponível.");
  const payloadItems = await Promise.all(items.map(async (item) => {
    if (item.productVariantId) return { variantId: item.productVariantId, quantity: item.quantity };
    let query = supabase.from("product_variants").select("id").eq("product_id", item.productId).eq("size", item.size ?? "Único");
    query = item.colorName == null ? query.is("color_name", null) : query.eq("color_name", item.colorName);
    const { data, error } = await query.single();
    if (error || !data) throw new Error("Um item do carrinho não está disponível. Revise seu carrinho.");
    return { variantId: data.id as string, quantity: item.quantity };
  }));
  payloadItems.sort((a, b) => a.variantId.localeCompare(b.variantId));
  const payload = { items: payloadItems, shippingAddressId: addressId, paymentMethod: method };
  const fingerprint = JSON.stringify(payload);
  const storageKey = `nn.checkout-pro.${userId}`;
  let previous: { fingerprint?: string; key?: string } = {};
  try { previous = JSON.parse(sessionStorage.getItem(storageKey) ?? "{}"); } catch { /* replace corrupt state */ }
  const key = previous.fingerprint === fingerprint && typeof previous.key === "string" ? previous.key : crypto.randomUUID();
  sessionStorage.setItem(storageKey, JSON.stringify({ fingerprint, key }));
  const order = orderSchema.parse(await jsonRequest("/api/checkout/order", {
    method: "POST", headers: { ...await headers(), "Idempotency-Key": key }, body: JSON.stringify(payload),
  }));
  if (order.totalCents !== order.subtotalCents + order.shippingCents || Date.parse(order.reservationExpiresAt) <= Date.now()) {
    throw new Error("A reserva deste pedido expirou. Revise o carrinho antes de tentar novamente.");
  }
  return order;
}

export async function openCheckout(orderId: string) {
  const preference = z.object({ checkoutUrl: z.string() }).parse(await jsonRequest(`${apiOrigin()}/v1/checkout/preferences`, {
    method: "POST", headers: await headers(), body: JSON.stringify({ orderId }),
  }));
  return validateCheckoutRedirect(preference.checkoutUrl);
}

export async function getCheckoutStatus(orderId: string) {
  z.string().uuid().parse(orderId);
  return z.object({ orderId: z.string().uuid(), financialStatus: z.enum(["pending", "processing", "authorized", "paid", "failed", "cancelled",
    "refund_pending", "partially_refunded", "refunded", "chargeback"]) }).parse(await jsonRequest(
    `${apiOrigin()}/v1/checkout/orders/${orderId}/status`, { headers: await headers() }));
}

import { z } from "zod";
import { supabase } from "@/lib/supabase";
import type { CartItem } from "@/types/cart";
import { cartSignature, checkoutApplicationId, checkoutTestApplicationId, CheckoutStateError, orderSchema,
  readCheckoutDraft, writeCheckoutDraft } from "./checkout-state";

export type PreparedCheckout = z.infer<typeof orderSchema>;
export const checkoutProEnabled = import.meta.env.VITE_CHECKOUT_PRO_ENABLED === "true";
const testPublicKey = "APP_USR-0b533487-ad9f-4133-8199-5e900694880b";
const preferenceSchema = z.object({ preferenceId: z.string().regex(/^3272217989-[a-zA-Z0-9-]{1,180}$/) });
export type WalletPreference = z.infer<typeof preferenceSchema>;
export const checkoutStatusEnabled = import.meta.env.VITE_APP_ENV === "staging" &&
  import.meta.env.VITE_CHECKOUT_PRO_MODE === "sandbox" &&
  import.meta.env.VITE_PAYMENTS_API_URL === "https://pagamentos-staging.nadanormalclub.com.br";

export { CheckoutStateError } from "./checkout-state";

export function getWalletPublicKey(): string {
  if (!checkoutProEnabled || import.meta.env.VITE_APP_ENV !== "staging" ||
    import.meta.env.VITE_CHECKOUT_PRO_MODE !== "sandbox" ||
    import.meta.env.VITE_PAYMENTS_API_URL !== "https://pagamentos-staging.nadanormalclub.com.br" ||
    import.meta.env.VITE_MERCADO_PAGO_PUBLIC_KEY !== testPublicKey) {
    throw new CheckoutStateError("Checkout de teste indisponível. Nenhum pagamento foi iniciado.");
  }
  return testPublicKey;
}

function apiOrigin(): string {
  const url = new URL(import.meta.env.VITE_PAYMENTS_API_URL ?? "");
  if (url.protocol !== "https:" || url.origin !== "https://pagamentos-staging.nadanormalclub.com.br" ||
      url.origin !== url.href.replace(/\/$/, "") || url.username || url.password) {
    throw new Error("Pagamento temporariamente indisponível.");
  }
  return url.origin;
}

async function headers(expectedUserId?: string): Promise<Record<string, string>> {
  const { data } = await supabase.auth.getSession();
  if (!data.session || (expectedUserId && data.session.user.id !== expectedUserId)) {
    throw new CheckoutStateError("Entre novamente na sua conta para continuar.");
  }
  return { Authorization: `Bearer ${data.session.access_token}`, "Content-Type": "application/json" };
}

async function jsonRequest(url: string, init: RequestInit) {
  let response: Response;
  let data: unknown;
  try {
    response = await fetch(url, { ...init, signal: AbortSignal.timeout(20000), cache: "no-store" });
    data = await response.json();
  } catch {
    throw new CheckoutStateError("Não conseguimos consultar o checkout. Tente novamente; seu pedido e seu carrinho foram mantidos.");
  }
  if (!response.ok) {
    const error = z.object({ error: z.object({ code: z.string() }).optional(), code: z.string().optional() }).safeParse(data);
    const code = error.success ? error.data.error?.code ?? error.data.code : undefined;
    throw new CheckoutStateError(response.status === 401 ? "Entre novamente na sua conta para consultar este pedido."
      : code === "CHECKOUT_RECONCILIATION_REQUIRED"
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
  getWalletPublicKey();
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
  const previous = readCheckoutDraft(userId);
  let key = previous?.fingerprint === fingerprint ? previous.key : crypto.randomUUID();
  if (previous?.fingerprint === fingerprint && previous.order) {
    const old = previous.order;
    let status: Awaited<ReturnType<typeof getCheckoutStatus>>;
    try { status = await getCheckoutStatus(old.orderId, userId); }
    catch { throw new CheckoutStateError("Não conseguimos confirmar o estado do pedido anterior. Consulte-o antes de tentar novamente.", old.orderId); }
    if (["cancelled", "failed"].includes(status.financialStatus) && status.reservationState === "released") key = crypto.randomUUID();
    else if (!["pending", "processing"].includes(status.financialStatus)) {
      throw new CheckoutStateError("Este pedido já tem um resultado de pagamento. Consulte a confirmação antes de iniciar outra compra.", old.orderId);
    } else if (Date.parse(old.reservationExpiresAt) <= Date.now()) {
      throw new CheckoutStateError("A reserva expirou e estamos verificando o pagamento. Consulte o pedido antes de iniciar outra compra.", old.orderId);
    }
  }
  const draft = { fingerprint, key, cartSignature: cartSignature(items) };
  writeCheckoutDraft(userId, { ...draft, ...(previous?.key === key && previous.order ? { order: previous.order } : {}) });
  const order = orderSchema.parse(await jsonRequest("/api/checkout/order", {
    method: "POST", headers: { ...await headers(userId), "Idempotency-Key": key }, body: JSON.stringify(payload),
  }));
  writeCheckoutDraft(userId, { ...draft, order });
  if (order.totalCents !== order.subtotalCents + order.shippingCents || Date.parse(order.reservationExpiresAt) <= Date.now()) {
    throw new CheckoutStateError("A reserva deste pedido expirou. Consulte o pedido antes de tentar novamente.", order.orderId);
  }
  return order;
}

export async function prepareWalletCheckout(orderId: string, userId?: string): Promise<WalletPreference> {
  getWalletPublicKey();
  z.string().uuid().parse(orderId);
  // Ignore checkoutUrl: the official SDK opens Checkout Pro using this preference.
  const result = await jsonRequest(`${apiOrigin()}/v1/checkout/preferences`, {
    method: "POST", headers: await headers(userId), body: JSON.stringify({ orderId }),
  });
  const verified = z.object({ applicationId: z.literal(checkoutApplicationId),
    testApplicationId: z.literal(checkoutTestApplicationId), orderId: z.literal(orderId) }).safeParse(result);
  if (!verified.success) throw new CheckoutStateError("Não foi possível validar o checkout desta aplicação. Consulte o pedido e tente novamente mais tarde.", orderId);
  return preferenceSchema.parse(result);
}

export async function getCheckoutStatus(orderId: string, userId?: string) {
  z.string().uuid().parse(orderId);
  return z.object({ orderId: z.literal(orderId), reservationState: z.enum(["held", "released"]).nullable().optional(),
    financialStatus: z.enum(["pending", "processing", "authorized", "paid", "failed", "cancelled",
    "refund_pending", "partially_refunded", "refunded", "chargeback"]) }).parse(await jsonRequest(
    `${apiOrigin()}/v1/checkout/orders/${orderId}/status`, { headers: await headers(userId) }));
}

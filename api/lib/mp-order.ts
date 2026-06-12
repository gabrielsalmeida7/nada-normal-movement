import { createClient, type SupabaseClient, type User } from "@supabase/supabase-js";
import { getSupabaseAnonKey, getSupabaseUrl } from "./mp-config";

export interface AuthenticatedOrderContext {
  supabase: SupabaseClient;
  user: User;
  order: {
    id: string;
    user_id: string;
    status: string;
    payment_id: string | null;
    total_cents: number;
    shipping_cents: number;
  };
}

export async function authenticateOrderRequest(
  jwt: string,
  orderId: string
): Promise<{ ok: true; ctx: AuthenticatedOrderContext } | { ok: false; status: number; error: string }> {
  const supabaseUrl = getSupabaseUrl();
  const supabaseAnonKey = getSupabaseAnonKey();

  if (!supabaseUrl || !supabaseAnonKey) {
    return { ok: false, status: 500, error: "Configuração do servidor incompleta" };
  }

  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: `Bearer ${jwt}` } },
  });

  const { data: { user }, error: userError } = await supabase.auth.getUser(jwt);
  if (userError || !user) {
    return { ok: false, status: 401, error: "Token inválido ou expirado" };
  }

  const { data: order, error: orderError } = await supabase
    .from("orders")
    .select("id, user_id, status, payment_id, total_cents, shipping_cents")
    .eq("id", orderId)
    .single();

  if (orderError || !order) {
    return { ok: false, status: 404, error: "Pedido não encontrado" };
  }
  if (order.user_id !== user.id) {
    return { ok: false, status: 403, error: "Pedido não pertence ao usuário" };
  }
  if (order.status !== "pending") {
    return { ok: false, status: 400, error: "Pedido já foi processado" };
  }

  return { ok: true, ctx: { supabase, user, order } };
}

export async function buildPreferenceItems(
  supabase: SupabaseClient,
  orderId: string,
  shippingCents: number
): Promise<{ title: string; quantity: number; unit_price: number }[]> {
  const { data: orderItems, error: itemsError } = await supabase
    .from("order_items")
    .select("product_id, quantity, price_cents_at_purchase, products ( name )")
    .eq("order_id", orderId);

  if (itemsError) {
    throw new Error("Erro ao buscar itens do pedido");
  }

  const items: { title: string; quantity: number; unit_price: number }[] = [];

  for (const row of orderItems ?? []) {
    const r = row as unknown as {
      products?: { name: string } | { name: string }[] | null;
      quantity: number;
      price_cents_at_purchase: number;
    };
    const product = r.products;
    const productName = product
      ? (Array.isArray(product) ? product[0]?.name : product.name)
      : null;
    const title = productName ?? "Produto";
    items.push({
      title: title.length > 127 ? title.slice(0, 124) + "..." : title,
      quantity: r.quantity,
      unit_price: r.price_cents_at_purchase / 100,
    });
  }

  if (shippingCents > 0) {
    items.push({
      title: "Frete",
      quantity: 1,
      unit_price: shippingCents / 100,
    });
  }

  return items;
}

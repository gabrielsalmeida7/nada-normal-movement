import { supabase } from "@/lib/supabase";
import type { CartItem } from "@/types/cart";
import type { ShippingAddress } from "@/types/address";

export interface CreateOrderInput {
  userId: string;
  items: CartItem[];
  shippingAddress: ShippingAddress;
  shippingName: string;
  shippingPhone: string;
  subtotalCents: number;
  shippingCents: number;
}

/**
 * Busca product_variant_id por product_id + size + color_name.
 */
async function getProductVariantId(
  productId: string,
  size: string | null,
  colorName: string | null
): Promise<string | null> {
  if (!supabase) return null;
  let query = supabase
    .from("product_variants")
    .select("id")
    .eq("product_id", productId)
    .eq("size", size ?? "Único");
  if (colorName != null) {
    query = query.eq("color_name", colorName);
  } else {
    query = query.is("color_name", null);
  }
  const { data } = await query.limit(1).single();
  return data?.id ?? null;
}

/**
 * Cria pedido (status pending) e order_items no Supabase.
 */
export async function createOrder(input: CreateOrderInput): Promise<{ orderId: string }> {
  if (!supabase) throw new Error("Supabase não configurado");

  const totalCents = input.subtotalCents + input.shippingCents;

  const { data: order, error: orderError } = await supabase
    .from("orders")
    .insert({
      user_id: input.userId,
      status: "pending",
      payment_id: null,
      total_cents: totalCents,
      shipping_cents: input.shippingCents,
      shipping_name: input.shippingName,
      shipping_street: input.shippingAddress.street,
      shipping_number: input.shippingAddress.number,
      shipping_complement: input.shippingAddress.complement ?? null,
      shipping_neighborhood: input.shippingAddress.neighborhood ?? null,
      shipping_city: input.shippingAddress.city,
      shipping_state: input.shippingAddress.state,
      shipping_zip_code: input.shippingAddress.zip_code,
      shipping_phone: input.shippingPhone,
    })
    .select("id")
    .single();

  if (orderError) throw orderError;
  if (!order?.id) throw new Error("Falha ao criar pedido");

  for (const item of input.items) {
    const variantId = await getProductVariantId(
      item.productId,
      item.size ?? null,
      item.colorName ?? null
    );

    const { error: itemError } = await supabase.from("order_items").insert({
      order_id: order.id,
      product_id: item.productId,
      product_variant_id: variantId,
      quantity: item.quantity,
      price_cents_at_purchase: Math.round(item.price * 100),
    });

    if (itemError) throw itemError;
  }

  return { orderId: order.id };
}

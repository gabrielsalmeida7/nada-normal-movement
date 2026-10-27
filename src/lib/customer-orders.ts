import { z } from "zod";
import { supabase } from "@/lib/supabase";

export const ordersPageSize = 10;
const money = z.number().int().nonnegative();
const customerOrderSchema = z.object({
  id: z.string().uuid(), user_id: z.string().uuid(), created_at: z.string().datetime({ offset: true }),
  status: z.string(), financial_status: z.string(), total_cents: money, shipping_cents: money,
  reservation_state: z.string().nullable(), reservation_expires_at: z.string().datetime({ offset: true }).nullable(),
  order_items: z.array(z.object({ id: z.string().uuid(), quantity: z.number().int().positive(),
    price_cents_at_purchase: money, products: z.object({ name: z.string() }).nullable(),
    product_variants: z.object({ size: z.string(), color_name: z.string().nullable() }).nullable(),
  })),
});
export type CustomerOrder = z.infer<typeof customerOrderSchema>;

export async function fetchCustomerOrders(userId: string, page: number, signal?: AbortSignal) {
  z.string().uuid().parse(userId);
  z.number().int().nonnegative().max(100000).parse(page);
  const { data: auth, error: authError } = await supabase.auth.getSession();
  if (authError || auth.session?.user.id !== userId) throw new Error("Entre novamente para consultar seus pedidos.");
  // Explicit owner filter also applies to administrators viewing their own purchases.
  // The authenticated Supabase client's RLS remains the authorization boundary.
  const { data, error } = await supabase.from("orders")
    .select(`id,user_id,created_at,status,financial_status,total_cents,shipping_cents,reservation_state,reservation_expires_at,
      order_items(id,quantity,price_cents_at_purchase,products(name),product_variants(size,color_name))`)
    .eq("user_id", userId).order("created_at", { ascending: false }).order("id", { ascending: false })
    .range(page * ordersPageSize, (page + 1) * ordersPageSize).abortSignal(signal ?? new AbortController().signal);
  if (error) throw new Error("Não foi possível consultar seus pedidos.");
  const orders = z.array(customerOrderSchema.extend({ user_id: z.literal(userId) })).parse(data ?? []);
  return { orders: orders.slice(0, ordersPageSize), hasNext: orders.length > ordersPageSize };
}

const financialLabels: Record<string, string> = {
  pending: "Aguardando pagamento", processing: "Aguardando confirmação", authorized: "Pagamento autorizado",
  paid: "Pagamento confirmado", failed: "Pagamento não concluído", cancelled: "Pagamento cancelado",
  refund_pending: "Estorno em andamento", partially_refunded: "Estorno parcial", refunded: "Pagamento estornado",
  chargeback: "Pagamento em contestação",
};
export function customerPaymentLabel(order: CustomerOrder, now = Date.now()) {
  if (["pending", "processing"].includes(order.financial_status) && order.reservation_state === "held" &&
      order.reservation_expires_at && Date.parse(order.reservation_expires_at) <= now) return "Prazo de pagamento encerrado";
  return financialLabels[order.financial_status] ?? "Status de pagamento indisponível";
}

export function customerOrderDate(value: string) {
  return new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short", timeZone: "America/Sao_Paulo" }).format(new Date(value));
}

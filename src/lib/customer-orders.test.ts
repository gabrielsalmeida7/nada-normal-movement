import { beforeEach, describe, expect, it, vi } from "vitest";
import { customerPaymentLabel, fetchCustomerOrders, type CustomerOrder } from "./customer-orders";

const mocks = vi.hoisted(() => ({ session: vi.fn(), from: vi.fn(), select: vi.fn(), eq: vi.fn(), order: vi.fn(), range: vi.fn(), abortSignal: vi.fn() }));
vi.mock("@/lib/supabase", () => ({ supabase: { auth: { getSession: mocks.session }, from: mocks.from } }));
const userId = "11111111-1111-4111-8111-111111111111";
const otherId = "22222222-2222-4222-8222-222222222222";
const order: CustomerOrder = { id: otherId, user_id: userId, created_at: "2026-10-26T19:42:00Z",
  status: "pending", financial_status: "processing", total_cents: 11900, shipping_cents: 2000,
  reservation_state: "held", reservation_expires_at: "2026-10-26T20:12:06Z", order_items: [] };
beforeEach(() => {
  vi.clearAllMocks();
  mocks.session.mockResolvedValue({ data: { session: { user: { id: userId } } }, error: null });
  const query = { select: mocks.select, eq: mocks.eq, order: mocks.order, range: mocks.range, abortSignal: mocks.abortSignal };
  for (const method of [mocks.from, mocks.select, mocks.eq, mocks.order, mocks.range]) method.mockReturnValue(query);
  mocks.abortSignal.mockResolvedValue({ data: [order], error: null });
});

describe("customer order history", () => {
  it("uses an explicit owner filter, stable ordering, bounded pagination and cancellation", async () => {
    const controller = new AbortController();
    const result = await fetchCustomerOrders(userId, 2, controller.signal);
    expect(mocks.eq).toHaveBeenCalledWith("user_id", userId);
    expect(mocks.order.mock.calls).toEqual([["created_at", { ascending: false }], ["id", { ascending: false }]]);
    expect(mocks.range).toHaveBeenCalledWith(20, 30);
    expect(mocks.abortSignal).toHaveBeenCalledWith(controller.signal);
    expect(result).toEqual({ orders: [order], hasNext: false });
    expect(mocks.select.mock.calls[0][0]).not.toMatch(/shipping_name|shipping_phone|shipping_street|\*/);
  });
  it("keeps the extra pagination sentinel out of the visible results", async () => {
    mocks.abortSignal.mockResolvedValue({ data: Array.from({ length: 11 }, () => order), error: null });
    const result = await fetchCustomerOrders(userId, 0);
    expect(result.orders).toHaveLength(10);
    expect(result.hasNext).toBe(true);
  });
  it("does not read orders after the session changes to another account", async () => {
    mocks.session.mockResolvedValue({ data: { session: { user: { id: otherId } } }, error: null });
    await expect(fetchCustomerOrders(userId, 0)).rejects.toThrow("Entre novamente");
    expect(mocks.from).not.toHaveBeenCalled();
  });
  it("fails closed if a result belongs to another customer", async () => {
    mocks.abortSignal.mockResolvedValue({ data: [{ ...order, user_id: otherId }], error: null });
    await expect(fetchCustomerOrders(userId, 0)).rejects.toThrow();
  });
  it("accepts historical items whose product or variant is no longer visible", async () => {
    mocks.abortSignal.mockResolvedValue({ data: [{ ...order, order_items: [{ id: userId, quantity: 1,
      price_cents_at_purchase: 9900, products: null, product_variants: null }] }], error: null });
    expect((await fetchCustomerOrders(userId, 0)).orders[0].order_items[0].products).toBeNull();
  });
  it("never interprets processing or expiration as payment approval", () => {
    expect(customerPaymentLabel(order, Date.parse("2026-10-26T20:00:00Z"))).toBe("Aguardando confirmação");
    expect(customerPaymentLabel(order, Date.parse("2026-10-27T20:00:00Z"))).toBe("Prazo de pagamento encerrado");
    expect(customerPaymentLabel({ ...order, financial_status: "paid" })).toBe("Pagamento confirmado");
    expect(customerPaymentLabel({ ...order, financial_status: "partially_refunded" })).toBe("Estorno parcial");
  });
});

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cartSignature, consumePaidCheckout, readCheckoutDraft } from "./checkout-state";
import type { CartItem } from "@/types/cart";

const session = vi.hoisted(() => ({ userId: "33333333-3333-4333-8333-333333333333" }));
vi.mock("@/lib/supabase", () => ({ supabase: { auth: { getSession: vi.fn(async () => ({ data: {
  session: { access_token: "fake-user-jwt", user: { id: session.userId } },
} })) } } }));
const userId = "33333333-3333-4333-8333-333333333333";
const orderId = "11111111-1111-4111-8111-111111111111";
const address = "44444444-4444-4444-8444-444444444444";
const items: CartItem[] = [{ productId: "product", productVariantId: "55555555-5555-4555-8555-555555555555",
  name: "Camiseta", quantity: 1, image: "", price: 100 }];
const order = { orderId, paymentAttemptId: "22222222-2222-4222-8222-222222222222", totalCents: 12000,
  subtotalCents: 10000, shippingCents: 2000, reservationExpiresAt: "2099-01-01T00:00:00Z" };
beforeEach(() => {
  sessionStorage.clear(); session.userId = userId;
  vi.stubEnv("VITE_CHECKOUT_PRO_ENABLED", "true"); vi.stubEnv("VITE_APP_ENV", "staging");
  vi.stubEnv("VITE_CHECKOUT_PRO_MODE", "sandbox");
  vi.stubEnv("VITE_PAYMENTS_API_URL", "https://pagamentos-staging.nadanormalclub.com.br");
  vi.stubEnv("VITE_MERCADO_PAGO_PUBLIC_KEY", "APP_USR-0b533487-ad9f-4133-8199-5e900694880b");
  vi.stubGlobal("AbortSignal", { timeout: () => new AbortController().signal });
});
afterEach(() => { vi.restoreAllMocks(); vi.unstubAllEnvs(); vi.unstubAllGlobals(); vi.resetModules(); });
const prepare = async () => (await import("./checkout-pro")).prepareCheckout(userId, items, address, "pix");
describe("checkout draft recovery across page reloads", () => {
  it("reuses the same order key after a lost response", async () => {
    const fetcher = vi.spyOn(globalThis, "fetch").mockRejectedValueOnce(new Error("private-provider-error"))
      .mockResolvedValueOnce(Response.json(order));
    await expect(prepare()).rejects.toThrow("Tente novamente");
    const key = readCheckoutDraft(userId)?.key;
    expect(await prepare()).toEqual(order);
    expect(fetcher.mock.calls.map(([, init]) => new Headers(init?.headers).get("Idempotency-Key"))).toEqual([key, key]);
    expect(readCheckoutDraft(userId)?.order?.orderId).toBe(orderId);
  });
  it("consults an existing order before replaying its key and refreshes server totals", async () => {
    const fetcher = vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(Response.json(order))
      .mockResolvedValueOnce(Response.json({ orderId, financialStatus: "processing", reservationState: "held" }))
      .mockResolvedValueOnce(Response.json(order));
    await prepare(); const key = readCheckoutDraft(userId)?.key;
    await prepare();
    expect(String(fetcher.mock.calls[1][0])).toContain(`/orders/${orderId}/status`);
    expect(new Headers(fetcher.mock.calls[2][1]?.headers).get("Idempotency-Key")).toBe(key);
  });
  it("keeps an expired uncertain order blocked without creating another", async () => {
    const fetcher = vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(Response.json({ ...order, reservationExpiresAt: "2020-01-01T00:00:00Z" }))
      .mockResolvedValueOnce(Response.json({ orderId, financialStatus: "processing", reservationState: "held" }));
    await expect(prepare()).rejects.toMatchObject({ orderId });
    await expect(prepare()).rejects.toThrow("estamos verificando");
    expect(fetcher).toHaveBeenCalledTimes(2);
    expect(fetcher.mock.calls.filter(([, init]) => init?.method === "POST")).toHaveLength(1);
  });
  it("allows a new order only after server confirmation of cancellation and stock release", async () => {
    const nextOrder = { ...order, orderId: "66666666-6666-4666-8666-666666666666" };
    const fetcher = vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(Response.json(order))
      .mockResolvedValueOnce(Response.json({ orderId, financialStatus: "cancelled", reservationState: "released" }))
      .mockResolvedValueOnce(Response.json(nextOrder));
    await prepare(); const previousKey = readCheckoutDraft(userId)?.key;
    expect(await prepare()).toEqual(nextOrder);
    expect(new Headers(fetcher.mock.calls[2][1]?.headers).get("Idempotency-Key")).not.toBe(previousKey);
  });
  it("does not start another order while a previous payment is confirmed", async () => {
    const fetcher = vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(Response.json(order))
      .mockResolvedValueOnce(Response.json({ orderId, financialStatus: "paid", reservationState: "held" }));
    await prepare();
    await expect(prepare()).rejects.toMatchObject({ orderId });
    expect(fetcher).toHaveBeenCalledTimes(2);
  });
  it("does not accept another order ID in the status response", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(Response.json({ ...order, orderId: address, financialStatus: "paid" }));
    const { getCheckoutStatus } = await import("./checkout-pro");
    await expect(getCheckoutStatus(orderId)).rejects.toThrow();
  });
  it("does no order I/O if authentication changed to another user", async () => {
    session.userId = "another-user";
    const fetcher = vi.spyOn(globalThis, "fetch");
    await expect(prepare()).rejects.toThrow("Entre novamente");
    expect(fetcher).not.toHaveBeenCalled();
  });
  it("fails before order creation when the draft cannot be saved", async () => {
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => { throw new Error("blocked"); });
    const fetcher = vi.spyOn(globalThis, "fetch");
    await expect(prepare()).rejects.toThrow("salvar esta sessão");
    expect(fetcher).not.toHaveBeenCalled();
  });
  it("isolates the old application and other customers' drafts", async () => {
    sessionStorage.setItem(`nn.checkout-pro.${userId}`, JSON.stringify({ key: "old-key" }));
    vi.spyOn(globalThis, "fetch").mockResolvedValue(Response.json(order));
    await prepare();
    expect(readCheckoutDraft("other-user")).toBeNull();
    expect(readCheckoutDraft(userId)?.key).not.toBe("old-key");
    expect(consumePaidCheckout(userId, address)).toBeNull();
    expect(consumePaidCheckout(userId, orderId)).toBe(cartSignature(items));
    expect(consumePaidCheckout(userId, orderId)).toBeNull();
  });
  it("keeps authenticated status available while new checkout submissions are disabled", async () => {
    vi.stubEnv("VITE_CHECKOUT_PRO_ENABLED", "false");
    vi.spyOn(globalThis, "fetch").mockResolvedValue(Response.json({ orderId, financialStatus: "processing", reservationState: "held" }));
    const api = await import("./checkout-pro");
    expect(api.checkoutProEnabled).toBe(false); expect(api.checkoutStatusEnabled).toBe(true);
    expect((await api.getCheckoutStatus(orderId)).financialStatus).toBe("processing");
  });
});

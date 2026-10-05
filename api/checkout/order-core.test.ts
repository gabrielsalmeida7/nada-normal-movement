import { describe, expect, it } from "vitest";
import {
  CheckoutOrderError,
  mapCheckoutDatabaseError,
  parseCheckoutOrderPayload,
  parseCheckoutOrderResult,
  parseIdempotencyKey,
} from "./order-core";

const VARIANT_ID = "10000000-0000-4000-8000-000000000001";
const ADDRESS_ID = "20000000-0000-4000-8000-000000000001";
const ORDER_ID = "30000000-0000-4000-8000-000000000001";
const ATTEMPT_ID = "40000000-0000-4000-8000-000000000001";

describe("contrato de criação do pedido", () => {
  it("descarta preço e totais adulterados antes de chamar o banco", () => {
    const payload = parseCheckoutOrderPayload({
      items: [
        {
          variantId: VARIANT_ID,
          quantity: 2,
          priceCents: 1,
          lineTotalCents: 2,
        },
      ],
      shippingAddressId: ADDRESS_ID,
      paymentMethod: "pix",
      subtotalCents: 2,
      shippingCents: 0,
      totalCents: 2,
      userId: "attacker",
    });

    expect(payload).toEqual({
      items: [{ variantId: VARIANT_ID, quantity: 2 }],
      shippingAddressId: ADDRESS_ID,
      paymentMethod: "pix",
    });
  });

  it("agrega linhas duplicadas antes de aplicar os limites", () => {
    expect(
      parseCheckoutOrderPayload({
        items: [
          { variantId: VARIANT_ID, quantity: 2 },
          { variantId: VARIANT_ID, quantity: 3 },
        ],
        shippingAddressId: ADDRESS_ID,
        paymentMethod: "credit_card",
      }).items,
    ).toEqual([{ variantId: VARIANT_ID, quantity: 5 }]);
  });

  it.each(["short", "com espaço inválido", "x".repeat(129), undefined])(
    "rejeita chave idempotente inválida: %j",
    (key) => {
      expect(() => parseIdempotencyKey(key)).toThrowError(
        expect.objectContaining<Partial<CheckoutOrderError>>({
          code: "INVALID_CHECKOUT_PAYLOAD",
          status: 400,
        }),
      );
    },
  );

  it("aceita e preserva chave idempotente opaca", () => {
    expect(parseIdempotencyKey("checkout:customer:request-123")).toBe(
      "checkout:customer:request-123",
    );
  });

  it.each([
    ["VARIANT_UNAVAILABLE", 422],
    ["INSUFFICIENT_STOCK", 409],
    ["SHIPPING_ADDRESS_UNAVAILABLE", 422],
    ["IDEMPOTENCY_CONFLICT", 409],
    ["CHECKOUT_AMOUNT_INVALID", 422],
  ] as const)("traduz erro seguro do banco %s", (code, status) => {
    expect(mapCheckoutDatabaseError({ message: code })).toMatchObject({
      code,
      status,
    });
  });

  it("não expõe erro interno do banco", () => {
    const error = mapCheckoutDatabaseError({
      message: "duplicate key violates unique constraint payment_attempts_idempotency_key_unique",
      details: "secret internals",
    });

    expect(error).toMatchObject({
      code: "CHECKOUT_UNAVAILABLE",
      status: 503,
      message: "Não foi possível criar o pedido.",
    });
    expect(error.message).not.toContain("duplicate key");
  });

  it("aceita somente um resultado monetário coerente em centavos", () => {
    expect(
      parseCheckoutOrderResult({
        orderId: ORDER_ID,
        paymentAttemptId: ATTEMPT_ID,
        status: "created",
        currency: "BRL",
        subtotalCents: 18_990,
        shippingCents: 2_000,
        totalCents: 20_990,
      }),
    ).toMatchObject({ totalCents: 20_990 });

    expect(() =>
      parseCheckoutOrderResult({
        orderId: ORDER_ID,
        paymentAttemptId: ATTEMPT_ID,
        status: "created",
        currency: "BRL",
        subtotalCents: 18_990,
        shippingCents: 2_000,
        totalCents: 1,
      }),
    ).toThrowError(
      expect.objectContaining<Partial<CheckoutOrderError>>({
        code: "CHECKOUT_UNAVAILABLE",
        status: 503,
      }),
    );
  });
});

import { describe, expect, it } from "vitest";
import {
  CancelCheckoutError,
  mapCancelDatabaseError,
  parseCancelPayload,
  parseCancelResult,
} from "./cancel-core";

const ORDER_ID = "40000000-0000-4000-8000-000000000001";

describe("cancelamento autenticado do pedido", () => {
  it("aceita somente o identificador do pedido", () => {
    expect(
      parseCancelPayload({
        orderId: ORDER_ID,
        userId: "attacker",
        financialStatus: "cancelled",
      }),
    ).toEqual({ orderId: ORDER_ID });
  });

  it("aceita repetição sem nova devolução de estoque", () => {
    expect(
      parseCancelResult({
        orderId: ORDER_ID,
        released: false,
        stockUnits: 0,
        reservationState: "released",
        financialStatus: "cancelled",
        outcome: "already_released",
      }),
    ).toMatchObject({ released: false, stockUnits: 0 });
  });

  it("rejeita resultado que devolveria estoque sem liberar a reserva", () => {
    expect(() =>
      parseCancelResult({
        orderId: ORDER_ID,
        released: false,
        stockUnits: 2,
        reservationState: "released",
        financialStatus: "cancelled",
      }),
    ).toThrowError(
      expect.objectContaining<Partial<CancelCheckoutError>>({
        code: "CHECKOUT_UNAVAILABLE",
        status: 503,
      }),
    );
  });

  it.each([
    ["ORDER_NOT_FOUND", 404],
    ["ORDER_NOT_CANCELLABLE", 409],
    ["INVALID_CHECKOUT_PAYLOAD", 400],
  ] as const)("traduz %s sem detalhes internos", (code, status) => {
    const error = mapCancelDatabaseError({
      message: code,
      details: "stock_quantity secret",
    });

    expect(error).toMatchObject({ code, status });
    expect(error.message).not.toContain("stock_quantity");
  });
});

import { z } from "zod";

const cancelPayloadSchema = z.object({
  orderId: z.string().uuid(),
});

const cancelResultSchema = z.object({
  orderId: z.string().uuid(),
  released: z.boolean(),
  stockUnits: z.number().int().nonnegative(),
  reservationState: z.literal("released"),
  financialStatus: z.literal("cancelled"),
});

export type CancelCheckoutPayload = z.infer<typeof cancelPayloadSchema>;
export type CancelCheckoutResult = z.infer<typeof cancelResultSchema>;

export class CancelCheckoutError extends Error {
  constructor(
    public readonly code:
      | "INVALID_CHECKOUT_PAYLOAD"
      | "ORDER_NOT_FOUND"
      | "ORDER_NOT_CANCELLABLE"
      | "CHECKOUT_UNAVAILABLE",
    public readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = "CancelCheckoutError";
  }
}

export function parseCancelPayload(input: unknown): CancelCheckoutPayload {
  const result = cancelPayloadSchema.safeParse(input);
  if (!result.success) {
    throw new CancelCheckoutError(
      "INVALID_CHECKOUT_PAYLOAD",
      400,
      "Dados do cancelamento inválidos.",
    );
  }
  return result.data;
}

export function parseCancelResult(input: unknown): CancelCheckoutResult {
  const result = cancelResultSchema.safeParse(input);
  if (!result.success || result.data.released !== result.data.stockUnits > 0) {
    throw new CancelCheckoutError(
      "CHECKOUT_UNAVAILABLE",
      503,
      "Não foi possível cancelar o pedido.",
    );
  }
  return result.data;
}

export function mapCancelDatabaseError(error: unknown): CancelCheckoutError {
  const message =
    typeof error === "object" && error !== null && "message" in error
      ? String(error.message)
      : "";

  if (message.includes("INVALID_CHECKOUT_PAYLOAD")) {
    return new CancelCheckoutError(
      "INVALID_CHECKOUT_PAYLOAD",
      400,
      "Dados do cancelamento inválidos.",
    );
  }
  if (message.includes("ORDER_NOT_FOUND")) {
    return new CancelCheckoutError("ORDER_NOT_FOUND", 404, "Pedido não encontrado.");
  }
  if (message.includes("ORDER_NOT_CANCELLABLE")) {
    return new CancelCheckoutError(
      "ORDER_NOT_CANCELLABLE",
      409,
      "Este pedido não pode mais ser cancelado.",
    );
  }

  return new CancelCheckoutError(
    "CHECKOUT_UNAVAILABLE",
    503,
    "Não foi possível cancelar o pedido.",
  );
}

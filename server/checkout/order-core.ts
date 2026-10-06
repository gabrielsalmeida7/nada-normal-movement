import { z } from "zod";

export const MAX_ORDER_BODY_BYTES = 12 * 1024;
export const MAX_ORDER_ITEMS = 20;
export const MAX_ORDER_QUANTITY_PER_VARIANT = 10;
export const MAX_ORDER_TOTAL_QUANTITY = 50;

const orderItemSchema = z.object({
  variantId: z.string().uuid(),
  quantity: z.number().int().min(1).max(MAX_ORDER_QUANTITY_PER_VARIANT),
});

const orderPayloadSchema = z.object({
  items: z.array(orderItemSchema).min(1).max(MAX_ORDER_ITEMS),
  shippingAddressId: z.string().uuid(),
  paymentMethod: z.enum(["pix", "credit_card"]),
});

const orderResultSchema = z.object({
  orderId: z.string().uuid(),
  paymentAttemptId: z.string().uuid(),
  status: z.literal("created"),
  currency: z.literal("BRL"),
  subtotalCents: z.number().int().positive(),
  shippingCents: z.number().int().nonnegative(),
  totalCents: z.number().int().positive(),
  reservationExpiresAt: z.string().datetime({ offset: true }),
  shippingRuleVersion: z.number().int().positive(),
});

export type CheckoutOrderPayload = z.infer<typeof orderPayloadSchema>;
export type CheckoutOrderResult = z.infer<typeof orderResultSchema>;

export class CheckoutOrderError extends Error {
  constructor(
    public readonly code:
      | "INVALID_CHECKOUT_PAYLOAD"
      | "VARIANT_UNAVAILABLE"
      | "INSUFFICIENT_STOCK"
      | "SHIPPING_ADDRESS_UNAVAILABLE"
      | "IDEMPOTENCY_CONFLICT"
      | "CHECKOUT_AMOUNT_INVALID"
      | "CHECKOUT_UNAVAILABLE",
    public readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = "CheckoutOrderError";
  }
}

export function parseIdempotencyKey(header: string | string[] | undefined): string {
  const value = (Array.isArray(header) ? header[0] : header)?.trim();
  if (!value || !/^[A-Za-z0-9._:-]{8,128}$/.test(value)) {
    throw new CheckoutOrderError(
      "INVALID_CHECKOUT_PAYLOAD",
      400,
      "Chave de idempotência inválida.",
    );
  }
  return value;
}

export function parseOrderRequestBody(body: unknown): unknown {
  if (typeof body === "string") {
    if (Buffer.byteLength(body, "utf8") > MAX_ORDER_BODY_BYTES) {
      throw invalidPayloadError();
    }

    try {
      return JSON.parse(body) as unknown;
    } catch {
      throw invalidPayloadError();
    }
  }

  let serialized: string;
  try {
    serialized = JSON.stringify(body);
  } catch {
    throw invalidPayloadError();
  }
  if (!serialized || Buffer.byteLength(serialized, "utf8") > MAX_ORDER_BODY_BYTES) {
    throw invalidPayloadError();
  }
  return body;
}

export function parseCheckoutOrderPayload(input: unknown): CheckoutOrderPayload {
  const result = orderPayloadSchema.safeParse(input);
  if (!result.success) {
    throw invalidPayloadError();
  }

  const quantities = new Map<string, number>();
  for (const item of result.data.items) {
    quantities.set(item.variantId, (quantities.get(item.variantId) ?? 0) + item.quantity);
  }

  const items = Array.from(quantities, ([variantId, quantity]) => {
    if (quantity > MAX_ORDER_QUANTITY_PER_VARIANT) {
      throw invalidPayloadError();
    }
    return { variantId, quantity };
  });

  const totalQuantity = items.reduce((total, item) => total + item.quantity, 0);
  if (totalQuantity > MAX_ORDER_TOTAL_QUANTITY) {
    throw invalidPayloadError();
  }

  return {
    items,
    shippingAddressId: result.data.shippingAddressId,
    paymentMethod: result.data.paymentMethod,
  };
}

export function parseCheckoutOrderResult(input: unknown): CheckoutOrderResult {
  const result = orderResultSchema.safeParse(input);
  if (!result.success || result.data.totalCents !== result.data.subtotalCents + result.data.shippingCents) {
    throw new CheckoutOrderError(
      "CHECKOUT_UNAVAILABLE",
      503,
      "Não foi possível criar o pedido.",
    );
  }
  return result.data;
}

export function mapCheckoutDatabaseError(error: unknown): CheckoutOrderError {
  const message =
    typeof error === "object" && error !== null && "message" in error
      ? String(error.message)
      : "";

  if (message.includes("INVALID_CHECKOUT_PAYLOAD")) {
    return invalidPayloadError();
  }
  if (message.includes("VARIANT_UNAVAILABLE")) {
    return new CheckoutOrderError(
      "VARIANT_UNAVAILABLE",
      422,
      "Um ou mais itens não estão disponíveis.",
    );
  }
  if (message.includes("INSUFFICIENT_STOCK")) {
    return new CheckoutOrderError(
      "INSUFFICIENT_STOCK",
      409,
      "Estoque insuficiente para um ou mais itens.",
    );
  }
  if (message.includes("SHIPPING_ADDRESS_UNAVAILABLE")) {
    return new CheckoutOrderError(
      "SHIPPING_ADDRESS_UNAVAILABLE",
      422,
      "Endereço de entrega indisponível.",
    );
  }
  if (message.includes("IDEMPOTENCY_CONFLICT")) {
    return new CheckoutOrderError(
      "IDEMPOTENCY_CONFLICT",
      409,
      "A chave de idempotência já foi usada para outro pedido.",
    );
  }
  if (message.includes("CHECKOUT_AMOUNT_INVALID")) {
    return new CheckoutOrderError(
      "CHECKOUT_AMOUNT_INVALID",
      422,
      "Não foi possível calcular o valor do pedido.",
    );
  }

  return new CheckoutOrderError(
    "CHECKOUT_UNAVAILABLE",
    503,
    "Não foi possível criar o pedido.",
  );
}

function invalidPayloadError(): CheckoutOrderError {
  return new CheckoutOrderError(
    "INVALID_CHECKOUT_PAYLOAD",
    400,
    "Dados do pedido inválidos.",
  );
}

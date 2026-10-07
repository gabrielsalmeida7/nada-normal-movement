import { z } from "zod";

const MAX_LINES = 20;
const MAX_QUANTITY = 10;
const MAX_CENTS = 100_000_000;
const OPAQUE_TOKEN = /^(?=.*[A-Za-z])[A-Za-z0-9._:-]{8,128}$/;

const gatewayOrderLineSchema = z
  .object({
    variantId: z.string().uuid(),
    name: z.string().trim().min(1).max(200),
    quantity: z.number().int().min(1).max(MAX_QUANTITY),
    unitPriceCents: z.number().int().nonnegative().max(MAX_CENTS),
  })
  .strict();

const gatewayOrderSchema = z
  .object({
    id: z.string().uuid(),
    currency: z.literal("BRL"),
    lines: z.array(gatewayOrderLineSchema).min(1).max(MAX_LINES),
    subtotalCents: z.number().int().nonnegative().max(MAX_CENTS),
    discountCents: z.number().int().nonnegative().max(MAX_CENTS),
    shippingCents: z.number().int().nonnegative().max(MAX_CENTS),
    totalCents: z.number().int().positive().max(MAX_CENTS),
  })
  .strict();

const gatewayPaymentSchema = z
  .object({
    attemptId: z.string().uuid(),
    idempotencyKey: z.string().regex(/^[A-Za-z0-9._:-]{8,128}$/),
    attemptNumber: z.number().int().positive().max(20),
    method: z.enum(["pix", "credit_card"]),
    amountCents: z.number().int().positive().max(MAX_CENTS),
    currency: z.literal("BRL"),
    order: gatewayOrderSchema,
    paymentToken: z.string().min(1).max(128).nullable(),
  })
  .strict();

export type GatewayOrderLine = z.infer<typeof gatewayOrderLineSchema>;
export type GatewayOrder = z.infer<typeof gatewayOrderSchema>;
export type GatewayPayment = z.infer<typeof gatewayPaymentSchema>;
export type GatewayPaymentMethod = GatewayPayment["method"];

interface GatewayResultBase {
  provider: "simulated";
  attemptId: string;
  orderId: string;
  idempotencyKey: string;
}

export interface ApprovedGatewayPaymentResult extends GatewayResultBase {
  disposition: "approved";
  attemptStatus: "paid";
  orderFinancialStatus: "paid";
  paid: true;
  providerOrderId: string;
  providerPaymentId: string;
  resolvedAt: string;
}

/** Autorização em análise antifraude. Não confirma a venda e não está paga. */
export interface AuthorizedGatewayPaymentResult extends GatewayResultBase {
  disposition: "authorized";
  attemptStatus: "authorized";
  orderFinancialStatus: "authorized";
  paid: false;
  providerOrderId: string;
  providerPaymentId: string;
  resolvedAt: string;
}

export interface DeclinedGatewayPaymentResult extends GatewayResultBase {
  disposition: "declined";
  attemptStatus: "failed";
  orderFinancialStatus: "failed";
  paid: false;
  failureCode: "simulated_declined";
  failureMessage: string;
  providerOrderId: string;
  providerPaymentId: string;
  resolvedAt: string;
}

/** Timeout depois do envio. O resultado é desconhecido e não autoriza nova cobrança. */
export interface UnknownGatewayPaymentResult extends GatewayResultBase {
  disposition: "unknown";
  attemptStatus: "unknown";
  orderFinancialStatus: "pending";
  paid: false;
  reason: "timeout";
  safeToRetry: false;
  providerOrderId: null;
  providerPaymentId: null;
  resolvedAt: null;
}

export type GatewayPaymentResult =
  | ApprovedGatewayPaymentResult
  | AuthorizedGatewayPaymentResult
  | DeclinedGatewayPaymentResult
  | UnknownGatewayPaymentResult;

export interface PaymentGateway {
  submitPayment(payment: GatewayPayment): Promise<GatewayPaymentResult>;
}

export class PaymentGatewayError extends Error {
  constructor(
    public readonly code: "INVALID_GATEWAY_PAYMENT" | "IDEMPOTENCY_CONFLICT",
    message: string,
  ) {
    super(message);
    this.name = "PaymentGatewayError";
  }
}

export function parseGatewayPayment(input: unknown): GatewayPayment {
  const parsed = gatewayPaymentSchema.safeParse(input);
  if (!parsed.success) {
    throw invalidPayment();
  }

  const payment = parsed.data;
  assertPaymentToken(payment.method, payment.paymentToken);
  assertAmountInvariant(payment);
  return payment;
}

function assertPaymentToken(method: GatewayPaymentMethod, token: string | null): void {
  switch (method) {
    case "pix":
      if (token !== null) throw invalidPayment();
      return;
    case "credit_card":
      if (token === null || !OPAQUE_TOKEN.test(token)) throw invalidPayment();
      return;
    default: {
      const unexpected: never = method;
      throw invalidPayment(unexpected);
    }
  }
}

function assertAmountInvariant(payment: GatewayPayment): void {
  const variantIds = new Set<string>();
  let subtotal = 0;

  for (const line of payment.order.lines) {
    if (variantIds.has(line.variantId)) throw invalidPayment();
    variantIds.add(line.variantId);

    const lineTotal = line.quantity * line.unitPriceCents;
    if (!Number.isSafeInteger(lineTotal)) throw invalidPayment();
    subtotal += lineTotal;
  }

  if (subtotal !== payment.order.subtotalCents) throw invalidPayment();
  if (payment.order.discountCents > payment.order.subtotalCents) throw invalidPayment();

  const total =
    payment.order.subtotalCents - payment.order.discountCents + payment.order.shippingCents;
  if (
    !Number.isSafeInteger(total) ||
    total !== payment.order.totalCents ||
    total !== payment.amountCents ||
    payment.currency !== payment.order.currency
  ) {
    throw invalidPayment();
  }
}

function invalidPayment(unexpected?: never): PaymentGatewayError {
  void unexpected;
  return new PaymentGatewayError("INVALID_GATEWAY_PAYMENT", "Dados do pagamento inválidos.");
}

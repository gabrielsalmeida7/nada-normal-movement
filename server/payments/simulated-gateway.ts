import { createHash } from "node:crypto";
import {
  type GatewayPayment,
  type GatewayPaymentResult,
  type PaymentGateway,
  PaymentGatewayError,
  parseGatewayPayment,
} from "./gateway";

export const SIMULATED_PAYMENT_SCENARIOS = ["approved", "authorized", "declined", "timeout"] as const;

export type SimulatedPaymentScenario = (typeof SIMULATED_PAYMENT_SCENARIOS)[number];

export interface StoredSimulatedAttempt {
  fingerprint: string;
  submissions: number;
  result: GatewayPaymentResult;
}

export interface SimulatedAttemptLedger {
  get(idempotencyKey: string): StoredSimulatedAttempt | undefined;
  set(idempotencyKey: string, attempt: StoredSimulatedAttempt): void;
}

/**
 * Resolve uma tentativa no adaptador simulado.
 * A primeira submissão grava o resultado. Repetir a mesma chave devolve esse
 * resultado, inclusive quando ele é timeout desconhecido. Não há chamada de rede.
 */
export function submitSimulatedAttempt(
  ledger: SimulatedAttemptLedger,
  payment: GatewayPayment,
  resolve: {
    scenario: () => SimulatedPaymentScenario;
    now: () => string;
  },
): GatewayPaymentResult {
  const fingerprint = paymentFingerprint(payment);
  const existing = ledger.get(payment.idempotencyKey);

  if (existing) {
    if (existing.fingerprint !== fingerprint) {
      throw new PaymentGatewayError(
        "IDEMPOTENCY_CONFLICT",
        "A chave de idempotência já foi usada para outra tentativa.",
      );
    }
    return existing.result;
  }

  const result = freezeResult(buildSimulatedResult(payment, resolve.scenario(), resolve.now()));
  ledger.set(payment.idempotencyKey, {
    fingerprint,
    submissions: 1,
    result,
  });
  return result;
}

export class SimulatedPaymentGateway implements PaymentGateway {
  private readonly ledger = new Map<string, StoredSimulatedAttempt>();
  private readonly scenarioFor: (payment: GatewayPayment) => SimulatedPaymentScenario;
  private readonly now: () => string;

  constructor(options: {
    scenario: SimulatedPaymentScenario | ((payment: GatewayPayment) => SimulatedPaymentScenario);
    now?: () => string;
  }) {
    const { scenario } = options;
    this.scenarioFor = typeof scenario === "function" ? scenario : () => scenario;
    this.now = options.now ?? (() => new Date().toISOString());
  }

  submissionsFor(idempotencyKey: string): number {
    return this.ledger.get(idempotencyKey)?.submissions ?? 0;
  }

  async submitPayment(payment: GatewayPayment): Promise<GatewayPaymentResult> {
    const parsed = parseGatewayPayment(payment);
    return submitSimulatedAttempt(this.ledger, parsed, {
      scenario: () => this.scenarioFor(parsed),
      now: this.now,
    });
  }
}

export function createSimulatedPaymentGateway(options: {
  scenario: SimulatedPaymentScenario | ((payment: GatewayPayment) => SimulatedPaymentScenario);
  now?: () => string;
}): SimulatedPaymentGateway {
  return new SimulatedPaymentGateway(options);
}

function buildSimulatedResult(
  payment: GatewayPayment,
  scenario: SimulatedPaymentScenario,
  now: string,
): GatewayPaymentResult {
  const base = {
    provider: "simulated" as const,
    attemptId: payment.attemptId,
    orderId: payment.order.id,
    idempotencyKey: payment.idempotencyKey,
  };

  switch (scenario) {
    case "approved":
      return {
        ...base,
        disposition: "approved",
        attemptStatus: "paid",
        orderFinancialStatus: "paid",
        paid: true,
        providerOrderId: simulatedOrderId(payment.attemptId),
        providerPaymentId: simulatedPaymentId(payment.attemptId),
        resolvedAt: now,
      };
    case "authorized":
      return {
        ...base,
        disposition: "authorized",
        attemptStatus: "authorized",
        orderFinancialStatus: "authorized",
        paid: false,
        providerOrderId: simulatedOrderId(payment.attemptId),
        providerPaymentId: simulatedPaymentId(payment.attemptId),
        resolvedAt: now,
      };
    case "declined":
      return {
        ...base,
        disposition: "declined",
        attemptStatus: "failed",
        orderFinancialStatus: "failed",
        paid: false,
        failureCode: "simulated_declined",
        failureMessage: "Pagamento recusado pelo adaptador simulado.",
        providerOrderId: simulatedOrderId(payment.attemptId),
        providerPaymentId: simulatedPaymentId(payment.attemptId),
        resolvedAt: now,
      };
    case "timeout":
      return {
        ...base,
        disposition: "unknown",
        attemptStatus: "unknown",
        orderFinancialStatus: "pending",
        paid: false,
        reason: "timeout",
        safeToRetry: false,
        providerOrderId: null,
        providerPaymentId: null,
        resolvedAt: null,
      };
    default: {
      const unexpected: never = scenario;
      throw new PaymentGatewayError("INVALID_GATEWAY_PAYMENT", unexpectedPayment(unexpected));
    }
  }
}

function paymentFingerprint(payment: GatewayPayment): string {
  const lines = payment.order.lines
    .map((line) => ({
      variantId: line.variantId,
      name: line.name,
      quantity: line.quantity,
      unitPriceCents: line.unitPriceCents,
    }))
    .sort((left, right) => left.variantId.localeCompare(right.variantId));

  return JSON.stringify({
    attemptId: payment.attemptId,
    attemptNumber: payment.attemptNumber,
    method: payment.method,
    amountCents: payment.amountCents,
    currency: payment.currency,
    paymentToken: tokenFingerprint(payment.paymentToken),
    order: {
      id: payment.order.id,
      currency: payment.order.currency,
      subtotalCents: payment.order.subtotalCents,
      discountCents: payment.order.discountCents,
      shippingCents: payment.order.shippingCents,
      totalCents: payment.order.totalCents,
      lines,
    },
  });
}

function tokenFingerprint(token: string | null): string | null {
  if (token === null) return null;
  return createHash("sha256").update(token, "utf8").digest("hex");
}

function simulatedOrderId(attemptId: string): string {
  return `simulated-order:${attemptId}`;
}

function simulatedPaymentId(attemptId: string): string {
  return `simulated-payment:${attemptId}`;
}

function freezeResult(result: GatewayPaymentResult): GatewayPaymentResult {
  return Object.freeze(result);
}

function unexpectedPayment(scenario: never): string {
  return `Cenário de pagamento não tratado: ${String(scenario)}`;
}

import { readdirSync, statSync } from "node:fs";
import path from "node:path";
import { describe, expect, it, vi } from "vitest";
import { PaymentGatewayError, type GatewayPayment } from "./gateway";
import { createSimulatedPaymentGateway, type SimulatedPaymentScenario } from "./simulated-gateway";

const NOW = "2026-10-07T12:00:00.000Z";
const ORDER_ID = "30000000-0000-4000-8000-000000000001";
const ATTEMPT_ID = "40000000-0000-4000-8000-000000000001";
const VARIANT_ID = "50000000-0000-4000-8000-000000000001";
const IDEMPOTENCY_KEY = "payment:attempt:request-123";

function payment(overrides: Partial<GatewayPayment> = {}): GatewayPayment {
  const order = {
    id: ORDER_ID,
    currency: "BRL" as const,
    lines: [
      {
        variantId: VARIANT_ID,
        name: "Camiseta Street",
        quantity: 2,
        unitPriceCents: 9_000,
      },
    ],
    subtotalCents: 18_000,
    discountCents: 0,
    shippingCents: 2_000,
    totalCents: 20_000,
  };

  return {
    attemptId: ATTEMPT_ID,
    idempotencyKey: IDEMPOTENCY_KEY,
    attemptNumber: 1,
    method: "credit_card",
    amountCents: 20_000,
    currency: "BRL",
    paymentToken: "opaque-token-123",
    ...overrides,
    order: overrides.order ?? order,
  };
}

function gateway(scenario: SimulatedPaymentScenario | ((value: GatewayPayment) => SimulatedPaymentScenario)) {
  return createSimulatedPaymentGateway({ scenario, now: () => NOW });
}

describe("adaptador de pagamento simulado", () => {
  it("aprova a tentativa e marca o pedido como pago", async () => {
    const pixAttemptId = "40000000-0000-4000-8000-000000000002";
    const pix = await gateway("approved").submitPayment(
      payment({
        attemptId: pixAttemptId,
        idempotencyKey: "payment:attempt:pix-123",
        method: "pix",
        paymentToken: null,
      }),
    );
    const result = await gateway("approved").submitPayment(payment());

    expect(pix).toEqual({
      provider: "simulated",
      disposition: "approved",
      attemptId: pixAttemptId,
      orderId: ORDER_ID,
      idempotencyKey: "payment:attempt:pix-123",
      attemptStatus: "paid",
      orderFinancialStatus: "paid",
      paid: true,
      providerOrderId: `simulated-order:${pixAttemptId}`,
      providerPaymentId: `simulated-payment:${pixAttemptId}`,
      resolvedAt: NOW,
    });
    expect(result).toEqual({
      provider: "simulated",
      disposition: "approved",
      attemptId: ATTEMPT_ID,
      orderId: ORDER_ID,
      idempotencyKey: IDEMPOTENCY_KEY,
      attemptStatus: "paid",
      orderFinancialStatus: "paid",
      paid: true,
      providerOrderId: `simulated-order:${ATTEMPT_ID}`,
      providerPaymentId: `simulated-payment:${ATTEMPT_ID}`,
      resolvedAt: NOW,
    });
  });

  it("autoriza em análise sem marcar a tentativa como paga", async () => {
    const result = await gateway("authorized").submitPayment(payment());

    expect(result).toMatchObject({
      disposition: "authorized",
      attemptStatus: "authorized",
      orderFinancialStatus: "authorized",
      paid: false,
      providerOrderId: `simulated-order:${ATTEMPT_ID}`,
      providerPaymentId: `simulated-payment:${ATTEMPT_ID}`,
    });
  });

  it("recusa o pagamento sem confirmar a venda", async () => {
    const result = await gateway("declined").submitPayment(payment());

    expect(result).toMatchObject({
      disposition: "declined",
      attemptStatus: "failed",
      orderFinancialStatus: "failed",
      paid: false,
      failureCode: "simulated_declined",
      failureMessage: "Pagamento recusado pelo adaptador simulado.",
    });
  });

  it("registra timeout como desconhecido e não submete a tentativa outra vez", async () => {
    let scenarioReads = 0;
    const simulated = gateway(() => {
      scenarioReads += 1;
      return scenarioReads === 1 ? "timeout" : "approved";
    });
    const first = await simulated.submitPayment(payment());
    const second = await simulated.submitPayment(payment());

    expect(first).toEqual({
      provider: "simulated",
      disposition: "unknown",
      attemptId: ATTEMPT_ID,
      orderId: ORDER_ID,
      idempotencyKey: IDEMPOTENCY_KEY,
      attemptStatus: "unknown",
      orderFinancialStatus: "pending",
      paid: false,
      reason: "timeout",
      safeToRetry: false,
      providerOrderId: null,
      providerPaymentId: null,
      resolvedAt: null,
    });
    expect(second).toBe(first);
    expect(scenarioReads).toBe(1);
    expect(simulated.submissionsFor(IDEMPOTENCY_KEY)).toBe(1);
  });

  it("devolve o mesmo resultado pago para a mesma tentativa", async () => {
    const simulated = gateway("approved");
    const first = await simulated.submitPayment(payment());
    const second = await simulated.submitPayment(payment());

    expect(second).toBe(first);
    expect(first.paid).toBe(true);
    expect(simulated.submissionsFor(IDEMPOTENCY_KEY)).toBe(1);
  });

  it("rejeita reutilizar a chave com outro valor", async () => {
    const simulated = gateway("approved");
    await simulated.submitPayment(payment());
    const changed = payment({
      amountCents: 21_000,
      order: {
        ...payment().order,
        shippingCents: 3_000,
        totalCents: 21_000,
      },
    });

    await expect(simulated.submitPayment(changed)).rejects.toEqual(
      expect.objectContaining<Partial<PaymentGatewayError>>({
        code: "IDEMPOTENCY_CONFLICT",
      }),
    );
    expect(simulated.submissionsFor(IDEMPOTENCY_KEY)).toBe(1);
  });

  it("aceita outra tentativa com chave nova", async () => {
    const simulated = gateway("declined");
    const first = await simulated.submitPayment(payment());
    const secondAttemptId = "40000000-0000-4000-8000-000000000002";
    const second = await simulated.submitPayment(
      payment({
        attemptId: secondAttemptId,
        idempotencyKey: "payment:attempt:request-456",
        attemptNumber: 2,
      }),
    );

    expect(first.attemptId).not.toBe(second.attemptId);
    expect(simulated.submissionsFor(IDEMPOTENCY_KEY)).toBe(1);
    expect(simulated.submissionsFor("payment:attempt:request-456")).toBe(1);
  });

  it("recusa total divergente, PAN e campos de cartão", async () => {
    const simulated = gateway("approved");
    const mismatched = payment({ amountCents: 19_000 });

    await expect(simulated.submitPayment(mismatched)).rejects.toMatchObject({
      code: "INVALID_GATEWAY_PAYMENT",
    });
    await expect(
      simulated.submitPayment({
        ...payment(),
        paymentToken: "4111111111111111",
      }),
    ).rejects.toMatchObject({ code: "INVALID_GATEWAY_PAYMENT" });
    await expect(
      simulated.submitPayment({
        ...payment(),
        pan: "4111111111111111",
        cvv: "123",
      } as GatewayPayment),
    ).rejects.toMatchObject({ code: "INVALID_GATEWAY_PAYMENT" });
    expect(simulated.submissionsFor(IDEMPOTENCY_KEY)).toBe(0);
  });

  it("não chama a rede nem devolve o token", async () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);
    const token = "opaque-token-123";

    try {
      const result = await gateway("approved").submitPayment(payment({ paymentToken: token }));
      expect(fetchSpy).not.toHaveBeenCalled();
      expect(JSON.stringify(result)).not.toContain(token);
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it("mantém os handlers dentro do limite de funções do plano Hobby", () => {
    const files = listFunctionFiles(path.resolve(process.cwd(), "api"));
    expect(files.length).toBeLessThanOrEqual(12);
    expect(files.some((file) => file.includes(`${path.sep}payments${path.sep}`))).toBe(false);
  });
});

function listFunctionFiles(directory: string): string[] {
  const entries = readdirSync(directory);
  const files: string[] = [];

  for (const entry of entries) {
    const fullPath = path.join(directory, entry);
    if (statSync(fullPath).isDirectory()) {
      files.push(...listFunctionFiles(fullPath));
      continue;
    }
    if (/\.(?:ts|tsx|js|jsx|mjs|cjs)$/.test(entry)) {
      files.push(fullPath);
    }
  }

  return files;
}

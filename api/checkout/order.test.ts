import type { VercelRequest, VercelResponse } from "@vercel/node";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import handler from "./order";

const mocks = vi.hoisted(() => ({
  createClient: vi.fn(),
}));

vi.mock("@supabase/supabase-js", () => ({
  createClient: mocks.createClient,
}));

const USER_ID = "10000000-0000-4000-8000-000000000001";
const VARIANT_ID = "20000000-0000-4000-8000-000000000001";
const ADDRESS_ID = "30000000-0000-4000-8000-000000000001";
const ORDER_ID = "40000000-0000-4000-8000-000000000001";
const ATTEMPT_ID = "50000000-0000-4000-8000-000000000001";

const orderResult = {
  orderId: ORDER_ID,
  paymentAttemptId: ATTEMPT_ID,
  status: "created",
  currency: "BRL",
  subtotalCents: 18_990,
  shippingCents: 2_000,
  totalCents: 20_990,
};

function makeResponse() {
  const json = vi.fn();
  const status = vi.fn(() => ({ json }));
  const setHeader = vi.fn();
  return {
    response: { status, setHeader } as unknown as VercelResponse,
    status,
    json,
    setHeader,
  };
}

function makeRequest(overrides: Partial<VercelRequest> = {}): VercelRequest {
  return {
    method: "POST",
    headers: {
      authorization: "Bearer valid-token",
      "idempotency-key": "checkout-request-123",
    },
    query: {},
    body: {
      items: [{ variantId: VARIANT_ID, quantity: 1 }],
      shippingAddressId: ADDRESS_ID,
      paymentMethod: "pix",
    },
    ...overrides,
  } as VercelRequest;
}

function mockAuthenticatedUser() {
  mocks.createClient.mockReturnValueOnce({
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: { user: { id: USER_ID } },
        error: null,
      }),
    },
  });
}

function mockOrderRpc(result: { data: unknown; error: unknown }) {
  const rpc = vi.fn().mockResolvedValue(result);
  mocks.createClient.mockReturnValueOnce({ rpc });
  return rpc;
}

describe("POST /api/checkout/order", () => {
  beforeEach(() => {
    process.env.SUPABASE_URL = "https://example.supabase.co";
    process.env.SUPABASE_PUBLISHABLE_KEY = "publishable";
    process.env.SUPABASE_SECRET_KEY = "secret";
  });

  afterEach(() => {
    vi.clearAllMocks();
    delete process.env.SUPABASE_URL;
    delete process.env.SUPABASE_PUBLISHABLE_KEY;
    delete process.env.SUPABASE_SECRET_KEY;
  });

  it("exige sessão e chave idempotente", async () => {
    const noSession = makeResponse();
    await handler(
      makeRequest({
        headers: { "idempotency-key": "checkout-request-123" },
      }),
      noSession.response,
    );
    expect(noSession.status).toHaveBeenCalledWith(401);

    mockAuthenticatedUser();
    const noKey = makeResponse();
    await handler(
      makeRequest({ headers: { authorization: "Bearer valid-token" } }),
      noKey.response,
    );
    expect(noKey.status).toHaveBeenCalledWith(400);
    expect(mocks.createClient).toHaveBeenCalledTimes(1);
  });

  it("usa o usuário autenticado e envia somente IDs e quantidades autoritativos", async () => {
    mockAuthenticatedUser();
    const rpc = mockOrderRpc({ data: orderResult, error: null });
    const result = makeResponse();

    await handler(
      makeRequest({
        body: {
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
          userId: "attacker",
          subtotalCents: 2,
          totalCents: 2,
        },
      }),
      result.response,
    );

    expect(rpc).toHaveBeenCalledWith("create_checkout_order", {
      p_user_id: USER_ID,
      p_idempotency_key: "checkout-request-123",
      p_items: [{ variantId: VARIANT_ID, quantity: 2 }],
      p_shipping_address_id: ADDRESS_ID,
      p_payment_method: "pix",
    });
    expect(result.status).toHaveBeenCalledWith(200);
    expect(result.json).toHaveBeenCalledWith(orderResult);
  });

  it("retorna o mesmo resultado autoritativo em reenvios da mesma chave", async () => {
    for (let requestNumber = 0; requestNumber < 2; requestNumber += 1) {
      mockAuthenticatedUser();
      mockOrderRpc({ data: orderResult, error: null });
      const result = makeResponse();

      await handler(makeRequest(), result.response);

      expect(result.status).toHaveBeenCalledWith(200);
      expect(result.json).toHaveBeenCalledWith(orderResult);
    }
  });

  it("traduz estoque insuficiente sem expor detalhes internos", async () => {
    mockAuthenticatedUser();
    mockOrderRpc({
      data: null,
      error: {
        message: "INSUFFICIENT_STOCK",
        details: "stock_quantity=0, variant=secret",
      },
    });
    const result = makeResponse();

    await handler(makeRequest(), result.response);

    expect(result.status).toHaveBeenCalledWith(409);
    expect(result.json).toHaveBeenCalledWith({
      code: "INSUFFICIENT_STOCK",
      error: "Estoque insuficiente para um ou mais itens.",
    });
    expect(JSON.stringify(result.json.mock.calls)).not.toContain("stock_quantity");
  });
});

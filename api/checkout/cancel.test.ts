import type { VercelRequest, VercelResponse } from "@vercel/node";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import handler from "./cancel";

const mocks = vi.hoisted(() => ({
  createClient: vi.fn(),
}));

vi.mock("@supabase/supabase-js", () => ({
  createClient: mocks.createClient,
}));

const USER_ID = "10000000-0000-4000-8000-000000000001";
const ORDER_ID = "40000000-0000-4000-8000-000000000001";

const cancelResult = {
  orderId: ORDER_ID,
  released: true,
  stockUnits: 2,
  reservationState: "released",
  financialStatus: "cancelled",
};

function makeResponse() {
  const json = vi.fn();
  const status = vi.fn(() => ({ json }));
  const setHeader = vi.fn();
  return {
    response: { status, setHeader } as unknown as VercelResponse,
    status,
    json,
  };
}

function makeRequest(overrides: Partial<VercelRequest> = {}): VercelRequest {
  return {
    method: "POST",
    headers: { authorization: "Bearer valid-token" },
    query: {},
    body: { orderId: ORDER_ID },
    ...overrides,
  } as VercelRequest;
}

describe("POST /api/checkout/cancel", () => {
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

  it("exige a sessão do dono do pedido", async () => {
    const result = makeResponse();

    await handler(makeRequest({ headers: {} as VercelRequest["headers"] }), result.response);

    expect(result.status).toHaveBeenCalledWith(401);
    expect(mocks.createClient).not.toHaveBeenCalled();
  });

  it("cancela com o usuário autenticado e devolve a trilha resumida", async () => {
    mocks.createClient.mockReturnValueOnce({
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: USER_ID } },
          error: null,
        }),
      },
    });
    const rpc = vi.fn().mockResolvedValue({ data: cancelResult, error: null });
    mocks.createClient.mockReturnValueOnce({ rpc });
    const result = makeResponse();

    await handler(
      makeRequest({ body: { orderId: ORDER_ID, userId: "attacker" } }),
      result.response,
    );

    expect(rpc).toHaveBeenCalledWith("cancel_checkout_order", {
      p_user_id: USER_ID,
      p_order_id: ORDER_ID,
    });
    expect(result.status).toHaveBeenCalledWith(200);
    expect(result.json).toHaveBeenCalledWith(cancelResult);
  });

  it("recusa pedido pago sem expor o erro interno", async () => {
    mocks.createClient.mockReturnValueOnce({
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: USER_ID } },
          error: null,
        }),
      },
    });
    mocks.createClient.mockReturnValueOnce({
      rpc: vi.fn().mockResolvedValue({
        data: null,
        error: { message: "ORDER_NOT_CANCELLABLE", details: "financial_status=paid" },
      }),
    });
    const result = makeResponse();

    await handler(makeRequest(), result.response);

    expect(result.status).toHaveBeenCalledWith(409);
    expect(result.json).toHaveBeenCalledWith({
      code: "ORDER_NOT_CANCELLABLE",
      error: "Este pedido não pode mais ser cancelado.",
    });
    expect(JSON.stringify(result.json.mock.calls)).not.toContain("financial_status");
  });
});

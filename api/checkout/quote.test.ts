import type { VercelRequest, VercelResponse } from "@vercel/node";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import handler from "./quote";

const mocks = vi.hoisted(() => ({
  createClient: vi.fn(),
}));

vi.mock("@supabase/supabase-js", () => ({
  createClient: mocks.createClient,
}));

const VARIANT_ID = "10000000-0000-4000-8000-000000000001";
const PRODUCT_ID = "20000000-0000-4000-8000-000000000001";

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
    headers: { authorization: "Bearer valid-token" },
    query: {},
    body: {
      items: [{ variantId: VARIANT_ID, quantity: 1 }],
      shippingState: "SP",
    },
    ...overrides,
  } as VercelRequest;
}

function mockAuthenticatedUser() {
  mocks.createClient.mockReturnValueOnce({
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: { user: { id: "customer-id" } },
        error: null,
      }),
    },
  });
}

function mockCatalogResult(result: { data: unknown; error: unknown }) {
  const inVariants = vi.fn().mockResolvedValue(result);
  const select = vi.fn(() => ({ in: inVariants }));
  const from = vi.fn(() => ({ select }));
  mocks.createClient.mockReturnValueOnce({ from });
  return { from, select, inVariants };
}

describe("POST /api/checkout/quote", () => {
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

  it("exige uma sessão autenticada", async () => {
    const result = makeResponse();

    await handler(
      makeRequest({ headers: {} as VercelRequest["headers"] }),
      result.response,
    );

    expect(result.status).toHaveBeenCalledWith(401);
    expect(mocks.createClient).not.toHaveBeenCalled();
  });

  it("consulta somente as variantes pedidas e retorna centavos autoritativos", async () => {
    mockAuthenticatedUser();
    const catalog = mockCatalogResult({
      data: [
        {
          id: VARIANT_ID,
          product_id: PRODUCT_ID,
          size: "M",
          color_name: "Preto",
          stock_quantity: 3,
          is_active: true,
          products: {
            id: PRODUCT_ID,
            name: "Produto real",
            price_cents: 10_000,
            is_active: true,
          },
        },
      ],
      error: null,
    });
    const result = makeResponse();

    await handler(
      makeRequest({
        body: {
          items: [{ variantId: VARIANT_ID, quantity: 2, price: 1 }],
          shippingState: "SP",
          total: 2,
        },
      }),
      result.response,
    );

    expect(catalog.from).toHaveBeenCalledWith("product_variants");
    expect(catalog.inVariants).toHaveBeenCalledWith("id", [VARIANT_ID]);
    expect(result.status).toHaveBeenCalledWith(200);
    expect(result.json).toHaveBeenCalledWith(
      expect.objectContaining({
        subtotalCents: 20_000,
        shippingCents: 2_000,
        totalCents: 22_000,
      }),
    );
  });

  it("não expõe detalhes de erro do Supabase", async () => {
    mockAuthenticatedUser();
    mockCatalogResult({
      data: null,
      error: { message: "relation product_variants does not exist", details: "internal" },
    });
    const result = makeResponse();

    await handler(makeRequest(), result.response);

    expect(result.status).toHaveBeenCalledWith(503);
    expect(result.json).toHaveBeenCalledWith({
      code: "CATALOG_UNAVAILABLE",
      error: "Não foi possível calcular o orçamento.",
    });
    expect(JSON.stringify(result.json.mock.calls)).not.toContain("product_variants does not exist");
  });
});

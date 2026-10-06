import { describe, expect, it } from "vitest";
import {
  buildAuthoritativeQuote,
  MAX_QUOTE_ITEMS,
  parseQuotePayload,
  QuoteError,
} from "./quote-core";

const VARIANT_ID = "10000000-0000-4000-8000-000000000001";
const PRODUCT_ID = "20000000-0000-4000-8000-000000000001";

function catalogVariant(overrides: Record<string, unknown> = {}) {
  return {
    id: VARIANT_ID,
    product_id: PRODUCT_ID,
    size: "M",
    color_name: "Preto",
    stock_quantity: 5,
    is_active: true,
    products: {
      id: PRODUCT_ID,
      name: "Camiseta autoritativa",
      price_cents: 18_990,
      is_active: true,
    },
    ...overrides,
  };
}

describe("orçamento autoritativo", () => {
  it("ignora preço, nome e total adulterados e usa os valores do catálogo", () => {
    const payload = parseQuotePayload({
      items: [
        {
          variantId: VARIANT_ID,
          quantity: 2,
          price: 1,
          name: "Produto adulterado",
          total: 2,
        },
      ],
      shippingState: "sp",
      subtotal: 2,
      total: 2,
    });

    const quote = buildAuthoritativeQuote(payload, [catalogVariant()]);

    expect(payload).toEqual({
      items: [{ variantId: VARIANT_ID, quantity: 2 }],
      shippingState: "SP",
    });
    expect(quote.items[0]).toMatchObject({
      name: "Camiseta autoritativa",
      unitPriceCents: 18_990,
      lineTotalCents: 37_980,
    });
    expect(quote).toMatchObject({
      subtotalCents: 37_980,
      shippingCents: 0,
      totalCents: 37_980,
    });
  });

  it.each([
    ["inexistente", []],
    ["desativada", [catalogVariant({ is_active: false })]],
    [
      "com produto inativo",
      [
        catalogVariant({
          products: {
            id: PRODUCT_ID,
            name: "Camiseta",
            price_cents: 18_990,
            is_active: false,
          },
        }),
      ],
    ],
  ])("rejeita variante %s sem revelar detalhes do catálogo", (_case, rows) => {
    const payload = parseQuotePayload({
      items: [{ variantId: VARIANT_ID, quantity: 1 }],
      shippingState: "SP",
    });

    expect(() => buildAuthoritativeQuote(payload, rows)).toThrowError(
      expect.objectContaining<Partial<QuoteError>>({
        code: "VARIANT_UNAVAILABLE",
        status: 422,
      }),
    );
  });

  it("rejeita estoque insuficiente", () => {
    const payload = parseQuotePayload({
      items: [{ variantId: VARIANT_ID, quantity: 3 }],
      shippingState: "SP",
    });

    expect(() =>
      buildAuthoritativeQuote(payload, [catalogVariant({ stock_quantity: 2 })]),
    ).toThrowError(
      expect.objectContaining<Partial<QuoteError>>({
        code: "INSUFFICIENT_STOCK",
        status: 409,
      }),
    );
  });

  it.each([0, -1, 1.5, 11, "2"])("rejeita quantidade inválida: %j", (quantity) => {
    expect(() =>
      parseQuotePayload({
        items: [{ variantId: VARIANT_ID, quantity }],
        shippingState: "SP",
      }),
    ).toThrowError(
      expect.objectContaining<Partial<QuoteError>>({
        code: "INVALID_PAYLOAD",
        status: 400,
      }),
    );
  });

  it("limita a quantidade de linhas do payload", () => {
    const items = Array.from({ length: MAX_QUOTE_ITEMS + 1 }, (_, index) => ({
      variantId: `10000000-0000-4000-8000-${String(index).padStart(12, "0")}`,
      quantity: 1,
    }));

    expect(() => parseQuotePayload({ items, shippingState: "SP" })).toThrowError(
      expect.objectContaining<Partial<QuoteError>>({ code: "INVALID_PAYLOAD" }),
    );
  });

  it.each([
    ["Sul/Sudeste", "SP", 10_000, 2_000],
    ["demais estados", "BA", 10_000, 3_000],
    ["grátis a partir de R$ 300", "BA", 30_000, 0],
  ])("calcula frete para %s", (_case, shippingState, priceCents, shippingCents) => {
    const payload = parseQuotePayload({
      items: [{ variantId: VARIANT_ID, quantity: 1 }],
      shippingState,
    });
    const quote = buildAuthoritativeQuote(payload, [
      catalogVariant({
        products: {
          id: PRODUCT_ID,
          name: "Produto",
          price_cents: priceCents,
          is_active: true,
        },
      }),
    ]);

    expect(quote.shippingCents).toBe(shippingCents);
    expect(quote.totalCents).toBe(priceCents + shippingCents);
  });
});

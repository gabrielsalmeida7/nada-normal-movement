import { z } from "zod";
import { getShippingCostCents } from "../../src/lib/shipping-rules";

export const MAX_QUOTE_ITEMS = 20;
export const MAX_QUANTITY_PER_VARIANT = 10;
export const MAX_TOTAL_QUANTITY = 50;

const BRAZIL_STATES = new Set([
  "AC",
  "AL",
  "AP",
  "AM",
  "BA",
  "CE",
  "DF",
  "ES",
  "GO",
  "MA",
  "MT",
  "MS",
  "MG",
  "PA",
  "PB",
  "PR",
  "PE",
  "PI",
  "RJ",
  "RN",
  "RS",
  "RO",
  "RR",
  "SC",
  "SP",
  "SE",
  "TO",
]);

const quoteItemSchema = z.object({
  variantId: z.string().uuid(),
  quantity: z.number().int().min(1).max(MAX_QUANTITY_PER_VARIANT),
});

const quotePayloadSchema = z.object({
  items: z.array(quoteItemSchema).min(1).max(MAX_QUOTE_ITEMS),
  shippingState: z
    .string()
    .trim()
    .transform((value) => value.toUpperCase())
    .refine((value) => BRAZIL_STATES.has(value)),
});

const catalogProductSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1),
  price_cents: z.number().int().nonnegative(),
  is_active: z.boolean(),
});

const catalogVariantSchema = z.object({
  id: z.string().uuid(),
  product_id: z.string().uuid(),
  size: z.string().min(1),
  color_name: z.string().nullable(),
  stock_quantity: z.number().int().nonnegative(),
  products: z.union([catalogProductSchema, z.array(catalogProductSchema).length(1)]),
});

export type QuotePayload = z.infer<typeof quotePayloadSchema>;
export type CatalogVariant = z.infer<typeof catalogVariantSchema>;

export interface AuthoritativeQuote {
  currency: "BRL";
  items: Array<{
    variantId: string;
    productId: string;
    name: string;
    size: string;
    colorName: string | null;
    quantity: number;
    unitPriceCents: number;
    lineTotalCents: number;
  }>;
  subtotalCents: number;
  shippingCents: number;
  totalCents: number;
}

export class QuoteError extends Error {
  constructor(
    public readonly code:
      | "INVALID_PAYLOAD"
      | "VARIANT_UNAVAILABLE"
      | "INSUFFICIENT_STOCK"
      | "CATALOG_UNAVAILABLE",
    public readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = "QuoteError";
  }
}

export function parseQuotePayload(input: unknown): QuotePayload {
  const result = quotePayloadSchema.safeParse(input);
  if (!result.success) {
    throw new QuoteError("INVALID_PAYLOAD", 400, "Dados do orçamento inválidos.");
  }

  const quantities = new Map<string, number>();
  for (const item of result.data.items) {
    quantities.set(item.variantId, (quantities.get(item.variantId) ?? 0) + item.quantity);
  }

  const items = Array.from(quantities, ([variantId, quantity]) => {
    if (quantity > MAX_QUANTITY_PER_VARIANT) {
      throw new QuoteError("INVALID_PAYLOAD", 400, "Dados do orçamento inválidos.");
    }
    return { variantId, quantity };
  });

  const totalQuantity = items.reduce((total, item) => total + item.quantity, 0);
  if (totalQuantity > MAX_TOTAL_QUANTITY) {
    throw new QuoteError("INVALID_PAYLOAD", 400, "Dados do orçamento inválidos.");
  }

  return { items, shippingState: result.data.shippingState };
}

export function buildAuthoritativeQuote(
  payload: QuotePayload,
  catalogRows: unknown,
): AuthoritativeQuote {
  const parsedRows = z.array(catalogVariantSchema).safeParse(catalogRows);
  if (!parsedRows.success) {
    throw new QuoteError("CATALOG_UNAVAILABLE", 503, "Não foi possível calcular o orçamento.");
  }

  const variants = new Map(parsedRows.data.map((variant) => [variant.id, variant]));
  const items = payload.items.map((requestedItem) => {
    const variant = variants.get(requestedItem.variantId);
    const product = variant
      ? Array.isArray(variant.products)
        ? variant.products[0]
        : variant.products
      : null;

    if (!variant || !product?.is_active) {
      throw new QuoteError(
        "VARIANT_UNAVAILABLE",
        422,
        "Um ou mais itens não estão disponíveis.",
      );
    }
    if (requestedItem.quantity > variant.stock_quantity) {
      throw new QuoteError(
        "INSUFFICIENT_STOCK",
        409,
        "Estoque insuficiente para um ou mais itens.",
      );
    }

    return {
      variantId: variant.id,
      productId: variant.product_id,
      name: product.name,
      size: variant.size,
      colorName: variant.color_name,
      quantity: requestedItem.quantity,
      unitPriceCents: product.price_cents,
      lineTotalCents: product.price_cents * requestedItem.quantity,
    };
  });

  const subtotalCents = items.reduce((total, item) => total + item.lineTotalCents, 0);
  const shippingCents = getShippingCostCents(payload.shippingState, subtotalCents);

  return {
    currency: "BRL",
    items,
    subtotalCents,
    shippingCents,
    totalCents: subtotalCents + shippingCents,
  };
}

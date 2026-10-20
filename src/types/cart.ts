/**
 * Tipos do carrinho de compras.
 * Chave de unicidade: productId + size + colorName
 */

export interface CartItem {
  productId: string;
  productVariantId?: string | null;
  quantity: number;
  name: string;
  price: number;
  image: string;
  slug?: string | null;
  size?: string | null;
  colorName?: string | null;
  colorHex?: string | null;
}

/** Payload para adicionar item (quantity opcional, padrão 1) */
export type AddToCartPayload = Omit<CartItem, "quantity"> & { quantity?: number };

import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import { ProductCard } from "@/components/ProductCard";
import { useCartStore } from "@/stores/cart-store";
import type { Product } from "@/types/product";

const streetProduct: Product = {
  id: "street-1",
  name: "Camiseta Street",
  price: 129.9,
  image: "/placeholder.svg",
  category: "Street",
  variants: [
    {
      id: "variant-p",
      size: "P",
      colorName: "Preto",
      colorHex: "#000000",
      stockQuantity: 2,
    },
    {
      id: "variant-m",
      size: "M",
      colorName: "Preto",
      colorHex: "#000000",
      stockQuantity: 0,
    },
  ],
};

describe("ProductCard", () => {
  beforeEach(() => {
    useCartStore.setState({ items: [] });
  });

  it("oculta tamanhos no card e adiciona a primeira variante disponível", () => {
    render(
      <ProductCard
        product={streetProduct}
        index={0}
        accentKey="nn-lime"
        availableForPurchase
      />,
    );

    expect(screen.queryByRole("button", { name: "P • Preto" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "M • Preto" })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /adicionar ao carrinho/i }));

    expect(useCartStore.getState().items).toEqual([
      expect.objectContaining({
        productId: "street-1",
        productVariantId: "variant-p",
        size: "P",
        colorName: "Preto",
        quantity: 1,
      }),
    ]);
  });

  it("mantém um produto indisponível fora do fluxo de compra", () => {
    render(<ProductCard product={streetProduct} index={0} />);

    expect(screen.queryByRole("button", { name: /adicionar ao carrinho/i })).not.toBeInTheDocument();
  });
});

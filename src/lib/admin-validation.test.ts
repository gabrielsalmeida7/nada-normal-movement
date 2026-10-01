import { describe, expect, it } from "vitest";
import {
  priceReaisToCents,
  productEditorSchema,
  slugifyProductName,
} from "@/lib/admin-validation";

const validProduct = {
  name: "Camiseta Street",
  slug: "camiseta-street",
  description: "",
  priceReais: "129,90",
  category: "street",
  material: "Algodão",
  tag: "",
  tagColor: "",
  weightGrams: 250,
  widthCm: null,
  heightCm: null,
  lengthCm: null,
  isActive: true,
  variants: [
    {
      size: "M",
      colorName: "Preto",
      colorHex: "#000000",
      stockQuantity: 8,
    },
  ],
};

describe("validação do produto administrativo", () => {
  it("aceita um produto e estoque válidos", () => {
    expect(productEditorSchema.safeParse(validProduct).success).toBe(true);
  });

  it("rejeita estoque negativo, slug inválido e ausência de variantes", () => {
    expect(
      productEditorSchema.safeParse({
        ...validProduct,
        slug: "Slug Inválido",
        variants: [],
      }).success,
    ).toBe(false);
    expect(
      productEditorSchema.safeParse({
        ...validProduct,
        variants: [{ ...validProduct.variants[0], stockQuantity: -1 }],
      }).success,
    ).toBe(false);
  });

  it("rejeita preço com mais de duas casas decimais", () => {
    expect(productEditorSchema.safeParse({ ...validProduct, priceReais: "189,999" }).success).toBe(false);
  });

  it("converte o preço em reais para centavos ao salvar", () => {
    expect(priceReaisToCents("189,90")).toBe(18990);
  });

  it("gera slug previsível a partir do nome", () => {
    expect(slugifyProductName("  Camiseta Órbita Street! ")).toBe("camiseta-orbita-street");
  });
});

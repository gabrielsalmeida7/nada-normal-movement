import { z } from "zod";

const optionalPositiveNumber = z.preprocess(
  (value) => (value === "" || value === null || Number.isNaN(value) ? null : Number(value)),
  z.number().positive("Use um valor maior que zero.").nullable(),
);

export const productEditorSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().trim().min(2, "Informe o nome do produto."),
  slug: z
    .string()
    .trim()
    .min(2, "Informe o slug.")
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Use letras minúsculas, números e hífens."),
  description: z.string(),
  priceReais: z
    .string()
    .trim()
    .min(1, "Informe o preço.")
    .regex(/^\d+(?:[,.]\d{1,2})?$/, "Use um valor como 189,90."),
  category: z.enum(["running", "street", "social"]),
  material: z.string(),
  tag: z.string(),
  tagColor: z.string(),
  weightGrams: optionalPositiveNumber,
  widthCm: optionalPositiveNumber,
  heightCm: optionalPositiveNumber,
  lengthCm: optionalPositiveNumber,
  isActive: z.boolean(),
  variants: z
    .array(
      z.object({
        id: z.string().uuid().optional(),
        size: z.string().trim().min(1, "Informe o tamanho."),
        colorName: z.string(),
        colorHex: z
          .string()
          .refine((value) => value === "" || /^#[0-9a-fA-F]{6}$/.test(value), "Use uma cor hexadecimal, como #FFFFFF."),
        stockQuantity: z.coerce.number().int().min(0, "O estoque não pode ser negativo."),
      }),
    )
    .min(1, "Adicione pelo menos uma variante."),
});

export type ProductEditorFormData = z.infer<typeof productEditorSchema>;

export function priceReaisToCents(value: string): number {
  return Math.round(Number(value.replace(",", ".")) * 100);
}

export function slugifyProductName(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

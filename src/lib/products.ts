import { supabase } from "@/lib/supabase";
import type { Product, ProductRow } from "@/types/product";

const CATEGORY_LABEL: Record<string, string> = {
  running: "Running",
  street: "Street",
  social: "Social",
};

const CATEGORY_COLOR: Record<string, string> = {
  running: "text-nn-orange",
  street: "text-nn-lime",
  social: "text-nn-yellow",
};

/**
 * URL pública de uma imagem no bucket Storage "products".
 * Se supabase não estiver configurado, retorna string vazia (fallback no componente).
 */
export function getProductImageUrl(path: string | null | undefined): string {
  if (!path) return "";
  if (!supabase) return "";
  const { data } = supabase.storage.from("products").getPublicUrl(path);
  return data.publicUrl;
}

/**
 * Mapeia uma linha do Supabase (com joins) para o tipo Product usado pelo ProductCard.
 */
export function mapProductRowToProduct(row: ProductRow): Product {
  const firstImage = row.product_images?.sort((a, b) => a.sort_order - b.sort_order)[0];
  const imageUrl = firstImage ? getProductImageUrl(firstImage.path) : "";
  const image = imageUrl || "/placeholder.svg";

  const sizes = [...new Set((row.product_variants ?? []).map((v) => v.size).filter(Boolean))];
  const colorMap = new Map<string, string>();
  (row.product_variants ?? []).forEach((v) => {
    if (v.color_name && v.color_hex) colorMap.set(v.color_name, v.color_hex);
  });
  const colors = Array.from(colorMap.entries()).map(([name, hex]) => ({ name, hex }));

  return {
    id: row.id,
    name: row.name,
    slug: row.slug ?? undefined,
    price: row.price_cents / 100,
    image,
    tag: row.tag ?? null,
    tagColor: row.tag_color ?? null,
    description: row.description ?? undefined,
    material: row.material ?? undefined,
    sizes: sizes.length ? sizes : undefined,
    colors: colors.length ? colors : undefined,
    category: CATEGORY_LABEL[row.category],
    categoryColor: CATEGORY_COLOR[row.category] ?? null,
  };
}

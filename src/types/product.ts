/**
 * Tipos compartilhados para produtos (catálogo, listagem, página de produto).
 * Centralizado para uso em ProductCard, ProductsSection, páginas de categoria e futura API.
 * id pode ser number (legado) ou string (UUID do Supabase).
 */

export interface Product {
  id: number | string;
  name: string;
  price: number;
  image: string;
  tag?: string | null;
  tagColor?: string | null;
  /** Opcional na listagem resumida (ex.: home) */
  description?: string;
  material?: string;
  sizes?: string[];
  colors?: { name: string; hex: string }[];
  /** Cor de categoria para rótulo (ex.: text-nn-lime); usado na home */
  categoryColor?: string | null;
  /** Nome da categoria (ex.: "Running"); usado na home */
  category?: string;
  /** Slug para link (ex.: /produto/:slug) */
  slug?: string | null;
}

/** Resposta do Supabase com joins (product_images, product_variants) */
export interface ProductRow {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  price_cents: number;
  category: "running" | "street" | "social";
  material: string | null;
  tag: string | null;
  tag_color: string | null;
  product_images: { path: string; sort_order: number }[];
  product_variants: { size: string; color_name: string | null; color_hex: string | null }[];
}

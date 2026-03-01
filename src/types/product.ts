/**
 * Tipos compartilhados para produtos (catálogo, listagem, página de produto).
 * Centralizado para uso em ProductCard, ProductsSection, páginas de categoria e futura API.
 */

export interface Product {
  id: number;
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
}

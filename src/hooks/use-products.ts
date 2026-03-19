import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import type { ProductRow } from "@/types/product";
import { mapProductRowToProduct } from "@/lib/products";

type CategorySlug = "running" | "street" | "social";

async function fetchProductsByCategory(category: CategorySlug): Promise<ProductRow[]> {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from("products")
    .select("*, product_images(*), product_variants(*)")
    .eq("category", category)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return (data ?? []) as ProductRow[];
}

async function fetchFeaturedProducts(): Promise<ProductRow[]> {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from("products")
    .select("*, product_images(*), product_variants(*)")
    .in("slug", ["camiseta-caos", "meia-compressao-nn", "jaqueta-obsessao", "regata-performance"])
    .order("created_at", { ascending: true });
  if (error) throw error;
  return (data ?? []) as ProductRow[];
}

export function useProductsByCategory(category: CategorySlug) {
  const query = useQuery({
    queryKey: ["products", "category", category],
    queryFn: () => fetchProductsByCategory(category),
    enabled: !!supabase,
  });
  return {
    ...query,
    products: (query.data ?? []).map(mapProductRowToProduct),
  };
}

export function useFeaturedProducts() {
  const query = useQuery({
    queryKey: ["products", "featured"],
    queryFn: fetchFeaturedProducts,
    enabled: !!supabase,
  });
  return {
    ...query,
    products: (query.data ?? []).map(mapProductRowToProduct),
  };
}

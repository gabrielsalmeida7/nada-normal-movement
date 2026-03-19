import { CategoryPage } from "@/components/CategoryPage";
import { CATEGORY_CONFIG } from "@/config/categories";
import { useProductsByCategory } from "@/hooks/use-products";

const CategoryRunning = () => {
  const { products, isLoading, isError } = useProductsByCategory("running");

  return (
    <CategoryPage
      config={CATEGORY_CONFIG.running}
      products={products}
      isLoading={isLoading}
      isError={isError}
    />
  );
};

export default CategoryRunning;

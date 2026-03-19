import { CategoryPage } from "@/components/CategoryPage";
import { CATEGORY_CONFIG } from "@/config/categories";
import { useProductsByCategory } from "@/hooks/use-products";

const CategoryStreet = () => {
  const { products, isLoading, isError } = useProductsByCategory("street");

  return (
    <CategoryPage
      config={CATEGORY_CONFIG.street}
      products={products}
      isLoading={isLoading}
      isError={isError}
    />
  );
};

export default CategoryStreet;

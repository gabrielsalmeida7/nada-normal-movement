import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { ProductCard } from "@/components/ProductCard";
import { useFeaturedProducts } from "@/hooks/use-products";

export const ProductsSection = () => {
  const { products, isLoading, isError } = useFeaturedProducts();

  return (
    <section className="py-24 bg-background relative overflow-hidden">
      {/* Floating brand image */}
      <motion.img
        src="/lovable-uploads/MaoNN.png"
        alt=""
        className="absolute right-5 top-20 w-28 opacity-20"
        animate={{ y: [0, -10, 0], rotate: [-3, 3, -3] }}
        transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
      />

      {/* Accent stripe */}
      <div className="absolute bottom-0 left-0 w-full h-2 bg-gradient-sunset" />

      <div className="container relative z-10">
        {/* Section Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="flex flex-col md:flex-row md:items-end justify-between mb-12"
        >
          <div>
            <h2 className="font-display text-5xl md:text-7xl mb-4">
              <span className="text-nn-pink glow-text">PRODUTOS</span>{" "}
              <span className="text-foreground">EM DESTAQUE</span>
            </h2>
            <p className="text-muted-foreground text-lg max-w-xl">
              Se todo mundo aprova, a gente descarta.
            </p>
          </div>
          <Button variant="neonV2" disabled className="mt-6 md:mt-0 btn-organic opacity-60 cursor-not-allowed">
            Ver Todos — Em Breve
          </Button>
        </motion.div>

        {/* Products Grid - dados do Supabase via useFeaturedProducts */}
        {isLoading && (
          <p className="text-muted-foreground font-display text-sm tracking-widest">Carregando…</p>
        )}
        {isError && (
          <p className="text-destructive text-sm">Não foi possível carregar os produtos.</p>
        )}
        {!isLoading && !isError && products.length > 0 && (
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {products.map((product, index) => (
              <ProductCard
                key={product.id}
                product={product}
                index={index}
                accentKey="nn-pink"
              />
            ))}
          </div>
        )}
        {!isLoading && !isError && products.length === 0 && (
          <p className="text-muted-foreground">Nenhum produto em destaque no momento.</p>
        )}
      </div>
    </section>
  );
};

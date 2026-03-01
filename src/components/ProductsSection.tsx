import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { ProductCard } from "@/components/ProductCard";
import type { Product } from "@/types/product";
import productTshirt from "@/assets/product-tshirt.jpg";
import productSocks from "@/assets/product-socks.jpg";
import productJacket from "@/assets/product-jacket.jpg";
import productTank from "@/assets/product-tank.jpg";

const products: Product[] = [
  {
    id: 1,
    name: "Camiseta Caos",
    category: "Running",
    price: 189.90,
    image: productTshirt,
    tag: "Novo",
    tagColor: "bg-nn-lime",
    categoryColor: "text-nn-lime",
  },
  {
    id: 2,
    name: "Meia Compressão NN",
    category: "Running",
    price: 89.90,
    image: productSocks,
    tag: "Bestseller",
    tagColor: "bg-nn-orange",
    categoryColor: "text-nn-orange",
  },
  {
    id: 3,
    name: "Jaqueta Obsessão",
    category: "Street",
    price: 449.90,
    image: productJacket,
    tag: null,
    tagColor: null,
    categoryColor: "text-nn-yellow",
  },
  {
    id: 4,
    name: "Regata Performance",
    category: "Running",
    price: 149.90,
    image: productTank,
    tag: "Limitado",
    tagColor: "bg-nn-red",
    categoryColor: "text-nn-red",
  },
];

export const ProductsSection = () => {
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
          <Button variant="neonV2" className="mt-6 md:mt-0 btn-organic">
            Ver Todos
          </Button>
        </motion.div>

        {/* Products Grid - reutiliza ProductCard com layout resumido (sem description/material/sizes/colors) */}
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
      </div>
    </section>
  );
};

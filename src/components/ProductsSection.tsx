import { motion } from "framer-motion";
import { ShoppingBag, Heart, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import productTshirt from "@/assets/product-tshirt.jpg";
import productSocks from "@/assets/product-socks.jpg";
import productJacket from "@/assets/product-jacket.jpg";
import productTank from "@/assets/product-tank.jpg";

const products = [
  {
    id: 1,
    name: "Camiseta Caos",
    category: "Running",
    price: 189.90,
    image: productTshirt,
    tag: "Novo",
    tagColor: "nn-cyan",
  },
  {
    id: 2,
    name: "Meia Compressão NN",
    category: "Running",
    price: 89.90,
    image: productSocks,
    tag: "Bestseller",
    tagColor: "nn-pink",
  },
  {
    id: 3,
    name: "Jaqueta Obsessão",
    category: "Street",
    price: 449.90,
    image: productJacket,
    tag: null,
    tagColor: null,
  },
  {
    id: 4,
    name: "Regata Performance",
    category: "Running",
    price: 149.90,
    image: productTank,
    tag: "Limitado",
    tagColor: "nn-yellow",
  },
];

export const ProductsSection = () => {
  return (
    <section className="py-24 bg-background">
      <div className="container">
        {/* Section Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="flex flex-col md:flex-row md:items-end justify-between mb-12"
        >
          <div>
            <h2 className="font-display text-4xl md:text-6xl mb-4">
              <span className="text-nn-yellow">PRODUTOS</span> EM DESTAQUE
            </h2>
            <p className="text-muted-foreground text-lg max-w-xl">
              Peças desenvolvidas para quem vive fora da curva
            </p>
          </div>
          <Button variant="outline" className="mt-6 md:mt-0">
            Ver Todos
          </Button>
        </motion.div>

        {/* Products Grid */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {products.map((product, index) => (
            <motion.div
              key={product.id}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.1 }}
              className="group"
            >
              {/* Image Container */}
              <div className="relative overflow-hidden bg-card border-4 border-border group-hover:border-nn-pink transition-all duration-300">
                <img
                  src={product.image}
                  alt={product.name}
                  className="w-full aspect-square object-cover transition-transform duration-500 group-hover:scale-110"
                />

                {/* Tag */}
                {product.tag && (
                  <span className={`absolute top-4 left-4 bg-${product.tagColor} text-nn-black font-display text-xs px-3 py-1 tracking-wider`}>
                    {product.tag}
                  </span>
                )}

                {/* Hover Actions */}
                <div className="absolute inset-0 bg-nn-black/60 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center gap-4">
                  <motion.button
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    className="w-12 h-12 bg-nn-pink text-nn-black flex items-center justify-center"
                  >
                    <ShoppingBag size={20} />
                  </motion.button>
                  <motion.button
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    className="w-12 h-12 bg-foreground text-background flex items-center justify-center"
                  >
                    <Heart size={20} />
                  </motion.button>
                  <motion.button
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    className="w-12 h-12 bg-nn-cyan text-nn-black flex items-center justify-center"
                  >
                    <Eye size={20} />
                  </motion.button>
                </div>
              </div>

              {/* Product Info */}
              <div className="mt-4">
                <span className="text-nn-cyan font-display text-xs tracking-widest">
                  {product.category}
                </span>
                <h3 className="font-display text-xl text-foreground mt-1 group-hover:text-nn-pink transition-colors">
                  {product.name}
                </h3>
                <p className="text-nn-yellow font-bold text-lg mt-2">
                  R$ {product.price.toFixed(2).replace('.', ',')}
                </p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

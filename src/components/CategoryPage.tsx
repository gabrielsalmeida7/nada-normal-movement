import { motion } from "framer-motion";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { ProductCard } from "@/components/ProductCard";
import type { Product } from "@/types/product";

export interface CategoryPageConfig {
  title: string;
  subtitle: string;
  /** Chave de cor para ProductCard (nn-orange, nn-lime, nn-yellow) */
  accentKey: "nn-orange" | "nn-lime" | "nn-yellow";
  heroImage: string;
  heroImageAlt: string;
  /** Classe de glow do título (ex.: glow-text-orange) */
  titleGlowClass: string;
  /** Classe da faixa superior do hero (ex.: bg-nn-orange) */
  barClass: string;
  /** Classe de cor do título (ex.: text-nn-orange) */
  titleColorClass: string;
}

interface CategoryPageProps {
  config: CategoryPageConfig;
  products: Product[];
}

export const CategoryPage = ({ config, products }: CategoryPageProps) => {
  const { title, subtitle, accentKey, heroImage, heroImageAlt, titleGlowClass, barClass, titleColorClass } = config;

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main>
        {/* Hero Banner - object-cover ancorado no topo para não cortar textos em cima; corte só em baixo */}
        <section className="relative h-[60vh] min-h-[400px] flex items-end overflow-hidden mt-28">
          <img
            src={heroImage}
            alt={heroImageAlt}
            className="absolute inset-0 w-full h-full object-cover object-top"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-background via-background/60 to-transparent" />
          <div className={`absolute top-0 left-0 w-full h-2 ${barClass}`} />

          <div className="container relative z-10 pb-12">
            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className={`font-display text-6xl md:text-8xl mb-4 ${titleColorClass} ${titleGlowClass}`}
            >
              {title}
            </motion.h1>
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="text-foreground/80 text-lg max-w-xl"
            >
              {subtitle}
            </motion.p>
          </div>
        </section>

        {/* Products Grid */}
        <section className="py-16 bg-background">
          <div className="container">
            <motion.p
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              className="text-muted-foreground mb-10 font-display text-sm tracking-widest"
            >
              {products.length} PRODUTOS
            </motion.p>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-8">
              {products.map((product, index) => (
                <ProductCard
                  key={product.id}
                  product={product}
                  index={index}
                  accentKey={accentKey}
                />
              ))}
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
};

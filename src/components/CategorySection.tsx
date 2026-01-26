import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import categoryRunning from "@/assets/category-running.jpg";
import categoryStreet from "@/assets/category-street.jpg";
import categorySocial from "@/assets/category-social.jpg";

const categories = [
  {
    id: "running",
    title: "Running",
    subtitle: "Obsessão em Movimento",
    description: "Para quem acorda às 4h da manhã e chama isso de privilégio.",
    color: "nn-pink",
    image: categoryRunning,
  },
  {
    id: "street",
    title: "Street",
    subtitle: "Autenticidade Urbana",
    description: "Leve o caos para as ruas. Vista sua anormalidade.",
    color: "nn-cyan",
    image: categoryStreet,
  },
  {
    id: "social",
    title: "Social",
    subtitle: "Caos Coletivo",
    description: "Porque a resenha pós-treino é tão importante quanto o treino.",
    color: "nn-yellow",
    image: categorySocial,
  },
];

export const CategorySection = () => {
  return (
    <section className="py-24 bg-background">
      <div className="container">
        {/* Section Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <h2 className="font-display text-4xl md:text-6xl mb-4">
            <span className="text-nn-cyan">CATEGORIAS</span>
          </h2>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            Cada peça é uma declaração. Cada categoria, um manifesto.
          </p>
        </motion.div>

        {/* Categories Grid */}
        <div className="grid md:grid-cols-3 gap-6">
          {categories.map((category, index) => (
            <motion.a
              key={category.id}
              href={`#${category.id}`}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.15 }}
              whileHover={{ y: -10 }}
              className="group relative overflow-hidden bg-card border-4 border-border hover:border-nn-pink transition-all duration-300 cursor-pointer"
            >
              {/* Image */}
              <div className="relative h-96 overflow-hidden">
                <img
                  src={category.image}
                  alt={category.title}
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-nn-black via-nn-black/50 to-transparent" />
              </div>

              {/* Content */}
              <div className="absolute bottom-0 left-0 right-0 p-6">
                <span className={`text-${category.color} font-display text-sm tracking-widest`}>
                  {category.subtitle}
                </span>
                <h3 className="font-display text-4xl text-foreground mb-2 group-hover:text-nn-pink transition-colors">
                  {category.title}
                </h3>
                <p className="text-foreground/70 text-sm mb-4">
                  {category.description}
                </p>
                <div className="flex items-center gap-2 text-nn-pink font-display text-sm uppercase tracking-wider opacity-0 translate-x-4 transition-all duration-300 group-hover:opacity-100 group-hover:translate-x-0">
                  Explorar
                  <ArrowRight size={18} />
                </div>
              </div>

              {/* Hover overlay line */}
              <div className={`absolute top-0 left-0 w-1 h-0 bg-${category.color} transition-all duration-300 group-hover:h-full`} />
            </motion.a>
          ))}
        </div>
      </div>
    </section>
  );
};

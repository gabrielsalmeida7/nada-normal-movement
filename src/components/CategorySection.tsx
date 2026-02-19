import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import categoryRunning from "@/assets/category-running.jpg";
import categoryStreet from "@/assets/category-street.jpg";
import categorySocial from "@/assets/category-social.jpg";

const categories = [
  {
    id: "running",
    title: "Running",
    subtitle: "Obsessão em Movimento",
    description: "Para quem acorda às 4h da manhã e chama isso de privilégio.",
    color: "nn-orange",
    borderColor: "border-nn-orange",
    hoverBorder: "hover:border-nn-orange",
    shadowClass: "shadow-neon-orange",
    textColor: "text-nn-orange",
    image: categoryRunning,
    organicStyle: { borderRadius: '10px 60px 10px 60px' },
    href: "/running",
  },
  {
    id: "street",
    title: "Street",
    subtitle: "Autenticidade Urbana",
    description: "Leve o caos para as ruas. Vista sua anormalidade.",
    color: "nn-lime",
    borderColor: "border-nn-lime",
    hoverBorder: "hover:border-nn-lime",
    shadowClass: "shadow-neon-lime",
    textColor: "text-nn-lime",
    image: categoryStreet,
    organicStyle: { borderRadius: '60px 10px 60px 10px' },
    href: "/street",
  },
  {
    id: "social",
    title: "Social",
    subtitle: "Caos Coletivo",
    description: "Porque a resenha pós-treino é tão importante quanto o treino.",
    color: "nn-yellow",
    borderColor: "border-nn-yellow",
    hoverBorder: "hover:border-nn-yellow",
    shadowClass: "shadow-neon-yellow",
    textColor: "text-nn-yellow",
    image: categorySocial,
    organicStyle: { borderRadius: '40px 15px 50px 10px' },
    href: "/social",
  },
];

export const CategorySection = () => {
  return (
    <section className="py-24 bg-background relative overflow-hidden">
      {/* Decorative brand image */}
      <motion.img
        src="/lovable-uploads/NN.png"
        alt=""
        className="absolute left-1/2 top-0 -translate-x-1/2 -translate-y-1/2 w-64 opacity-10"
        initial={{ opacity: 0, scale: 0.8 }}
        whileInView={{ opacity: 0.1, scale: 1 }}
        viewport={{ once: true }}
      />

      {/* Diagonal accent stripe */}
      <div className="absolute top-0 left-0 w-full h-2 bg-gradient-tropical" />

      <div className="container relative z-10">
        {/* Section Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <h2 className="font-display text-5xl md:text-7xl mb-4">
            <span className="text-nn-pink glow-text">CATEGORIAS</span>
          </h2>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            Aqui não vestimos o que agrada, vestimos o que incomoda quem vive no automático.
          </p>
        </motion.div>

        {/* Categories Grid */}
        <div className="grid md:grid-cols-3 gap-6">
          {categories.map((category, index) => (
            <motion.div
              key={category.id}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.15 }}
              whileHover={{ y: -10 }}
              className="group"
            >
              <Link
                to={category.href}
                style={category.organicStyle}
                className={`block relative overflow-hidden bg-card border-4 border-border ${category.hoverBorder} transition-all duration-300 cursor-pointer hover:${category.shadowClass}`}
              >
                {/* Image with organic mask */}
                <div className="relative h-96 overflow-hidden" style={category.organicStyle}>
                  <img
                    src={category.image}
                    alt={category.title}
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-nn-black via-nn-black/50 to-transparent" />
                </div>

                {/* Content */}
                <div className="absolute bottom-0 left-0 right-0 p-6">
                  <span className={`${category.textColor} font-display text-sm tracking-widest`}>
                    {category.subtitle}
                  </span>
                  <h3 className={`font-display text-4xl text-foreground mb-2 group-hover:${category.textColor} transition-colors`}>
                    {category.title}
                  </h3>
                  <p className="text-foreground/70 text-sm mb-4">
                    {category.description}
                  </p>
                  <div className={`flex items-center gap-2 ${category.textColor} font-display text-sm uppercase tracking-wider opacity-0 translate-x-4 transition-all duration-300 group-hover:opacity-100 group-hover:translate-x-0`}>
                    Explorar
                    <ArrowRight size={18} />
                  </div>
                </div>

                {/* Hover overlay line - organic */}
                <div 
                  className={`absolute top-0 left-0 w-2 h-0 bg-${category.color} transition-all duration-300 group-hover:h-full`}
                  style={{ borderRadius: '0 10px 10px 0' }}
                />
              </Link>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

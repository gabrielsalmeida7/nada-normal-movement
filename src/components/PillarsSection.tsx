import { motion } from "framer-motion";
import { Flame, Heart, Zap, Users } from "lucide-react";

const colorMap = {
  "nn-purple-neon": "bg-nn-purple-neon",
  "nn-blue-neon": "bg-nn-blue-neon",
  "nn-green-neon": "bg-nn-green-neon",
  "nn-pink": "bg-nn-pink",
};

const textColorMap = {
  "nn-purple-neon": "text-nn-purple-neon",
  "nn-blue-neon": "text-nn-blue-neon",
  "nn-green-neon": "text-nn-green-neon",
  "nn-pink": "text-nn-pink",
};

const shadowMap = {
  "nn-purple-neon": "shadow-neon-purple",
  "nn-blue-neon": "shadow-neon-blue",
  "nn-green-neon": "shadow-neon-green",
  "nn-pink": "shadow-neon-pink",
};

const pillars = [
  {
    icon: Flame,
    title: "Obsessão",
    subtitle: "Doidos pelo que fazem",
    description: "Para quem não vê o sacrifício como peso, mas como o único ritual que faz a vida valer a pena.",
    color: "nn-purple-neon",
  },
  {
    icon: Heart,
    title: "Autenticidade",
    subtitle: "Doidos na vida",
    description: "Ser 'Nada Normal' é ter a coragem de ser estranho em um mundo de cópias bem vestidas.",
    color: "nn-blue-neon",
  },
  {
    icon: Zap,
    title: "Performance",
    subtitle: "Fora da curva",
    description: "Estar acima da média não é arrogância, é o resultado inevitável de uma disciplina anormal.",
    color: "nn-green-neon",
  },
  {
    icon: Users,
    title: "Caos Coletivo",
    subtitle: "A resenha anormal",
    description: "Transformar o sofrimento em piada interna e o esforço individual em celebração coletiva.",
    color: "nn-pink",
  },
];

export const PillarsSection = () => {
  return (
    <section id="manifesto" className="py-24 bg-card relative overflow-hidden">
      {/* Background pattern */}
      <div className="absolute inset-0 opacity-5">
        <div className="absolute inset-0" style={{
          backgroundImage: `repeating-linear-gradient(
            45deg,
            transparent,
            transparent 20px,
            hsl(var(--nn-purple-neon)) 20px,
            hsl(var(--nn-purple-neon)) 22px
          )`
        }} />
      </div>

      {/* Watermark brand image */}
      <motion.img
        src="/lovable-uploads/NN1.png"
        alt=""
        className="absolute right-10 top-1/2 -translate-y-1/2 w-72 opacity-10"
        animate={{ rotate: [0, 5, 0, -5, 0] }}
        transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
      />

      <div className="container relative z-10">
        {/* Section Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <h2 className="font-display text-5xl md:text-7xl mb-4">
            OS <span className="text-nn-purple-neon glow-text">4 PILARES</span> DA ANORMALIDADE
          </h2>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            Cada pilar representa uma faceta do que significa ser Nada Normal
          </p>
        </motion.div>

        {/* Pillars Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {pillars.map((pillar, index) => (
            <motion.div
              key={pillar.title}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.1 }}
              whileHover={{ scale: 1.02 }}
              className={`group bg-background border-4 border-border p-6 hover:border-${pillar.color} transition-all duration-300 hover:${shadowMap[pillar.color as keyof typeof shadowMap]}`}
            >
              {/* Icon */}
              <div className={`w-16 h-16 ${colorMap[pillar.color as keyof typeof colorMap]} flex items-center justify-center mb-6 shadow-brutal group-hover:translate-x-1 group-hover:translate-y-1 group-hover:shadow-none transition-all duration-300`}>
                <pillar.icon className="text-nn-black" size={32} />
              </div>

              {/* Content */}
              <span className={`${textColorMap[pillar.color as keyof typeof textColorMap]} font-display text-xs tracking-widest`}>
                {pillar.subtitle}
              </span>
              <h3 className="font-display text-2xl text-foreground mt-1 mb-3">
                {pillar.title}
              </h3>
              <p className="text-muted-foreground text-sm leading-relaxed">
                {pillar.description}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

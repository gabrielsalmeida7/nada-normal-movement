import { motion } from "framer-motion";
import { Flame, Heart, Zap, Users } from "lucide-react";

const pillars = [
  {
    icon: Flame,
    title: "Obsessão",
    subtitle: "Doidos pelo que fazem",
    description: "Para quem não vê o sacrifício como peso, mas como o único ritual que faz a vida valer a pena.",
    color: "nn-pink",
  },
  {
    icon: Heart,
    title: "Autenticidade",
    subtitle: "Doidos na vida",
    description: "Ser 'Nada Normal' é ter a coragem de ser estranho em um mundo de cópias bem vestidas.",
    color: "nn-yellow",
  },
  {
    icon: Zap,
    title: "Performance",
    subtitle: "Fora da curva",
    description: "Estar acima da média não é arrogância, é o resultado inevitável de uma disciplina anormal.",
    color: "nn-cyan",
  },
  {
    icon: Users,
    title: "Caos Coletivo",
    subtitle: "A resenha anormal",
    description: "Transformar o sofrimento em piada interna e o esforço individual em celebração coletiva.",
    color: "nn-green",
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
            hsl(var(--nn-pink)) 20px,
            hsl(var(--nn-pink)) 22px
          )`
        }} />
      </div>

      <div className="container relative z-10">
        {/* Section Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <h2 className="font-display text-4xl md:text-6xl mb-4">
            OS <span className="text-nn-pink">4 PILARES</span> DA ANORMALIDADE
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
              className="group bg-background border-4 border-border p-6 hover:border-nn-pink transition-all duration-300"
            >
              {/* Icon */}
              <div className={`w-16 h-16 bg-${pillar.color} flex items-center justify-center mb-6 shadow-brutal group-hover:translate-x-1 group-hover:translate-y-1 group-hover:shadow-none transition-all duration-300`}>
                <pillar.icon className="text-nn-purple" size={32} />
              </div>

              {/* Content */}
              <span className={`text-${pillar.color} font-display text-xs tracking-widest`}>
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

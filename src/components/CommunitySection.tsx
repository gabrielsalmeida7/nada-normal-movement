import { motion } from "framer-motion";
import { Play, Headphones, Radio, Users2 } from "lucide-react";
import { Button } from "@/components/ui/button";

const communityFeatures = [
  {
    icon: Headphones,
    title: "Podcast Frequência Cardíaca",
    description: "Histórias de quem vive fora da curva",
  },
  {
    icon: Play,
    title: "Bastidores do Caos",
    description: "Série exclusiva com atletas NN",
  },
  {
    icon: Radio,
    title: "NN Radio",
    description: "Playlists para cada momento do treino",
  },
  {
    icon: Users2,
    title: "Eventos NN",
    description: "Corridas, desafios e experiências únicas",
  },
];

export const CommunitySection = () => {
  return (
    <section id="community" className="py-24 bg-card relative overflow-hidden">
      {/* Background gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-nn-pink/10 via-transparent to-nn-cyan/10" />

      <div className="container relative z-10">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Left Content */}
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
          >
            <span className="text-nn-cyan font-display text-sm tracking-widest">
              FAÇA PARTE
            </span>
            <h2 className="font-display text-4xl md:text-6xl mt-2 mb-6">
              COMUNIDADE{" "}
              <span className="text-nn-pink">NADA NORMAL</span>
            </h2>
            <p className="text-muted-foreground text-lg mb-8 leading-relaxed">
              Mais do que uma marca, somos um movimento. Conecte-se com corredores 
              que entendem sua loucura, participe de experiências únicas e faça parte 
              do caos coletivo que celebra a anormalidade.
            </p>

            <div className="space-y-4 mb-8">
              {communityFeatures.map((feature, index) => (
                <motion.div
                  key={feature.title}
                  initial={{ opacity: 0, x: -20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.1 }}
                  className="flex items-center gap-4 group"
                >
                  <div className="w-12 h-12 bg-nn-pink text-nn-black flex items-center justify-center shadow-brutal group-hover:translate-x-1 group-hover:translate-y-1 group-hover:shadow-none transition-all duration-300">
                    <feature.icon size={24} />
                  </div>
                  <div>
                    <h4 className="font-display text-lg text-foreground group-hover:text-nn-pink transition-colors">
                      {feature.title}
                    </h4>
                    <p className="text-muted-foreground text-sm">
                      {feature.description}
                    </p>
                  </div>
                </motion.div>
              ))}
            </div>

            <Button variant="hero" size="lg">
              Junte-se ao Movimento
            </Button>
          </motion.div>

          {/* Right Content - Image Grid */}
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            className="grid grid-cols-2 gap-4"
          >
            <div className="space-y-4">
              <div className="relative overflow-hidden border-4 border-border hover:border-nn-pink transition-all duration-300">
                <img
                  src="https://images.unsplash.com/photo-1552674605-db6ffd4facb5?w=400&q=80"
                  alt="Runner"
                  className="w-full aspect-[3/4] object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-nn-black/60 to-transparent" />
              </div>
              <div className="relative overflow-hidden border-4 border-border hover:border-nn-cyan transition-all duration-300">
                <img
                  src="https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?w=400&q=80"
                  alt="Community"
                  className="w-full aspect-square object-cover"
                />
              </div>
            </div>
            <div className="space-y-4 pt-8">
              <div className="relative overflow-hidden border-4 border-border hover:border-nn-yellow transition-all duration-300">
                <img
                  src="https://images.unsplash.com/photo-1517836357463-d25dfeac3438?w=400&q=80"
                  alt="Training"
                  className="w-full aspect-square object-cover"
                />
              </div>
              <div className="relative overflow-hidden border-4 border-border hover:border-nn-green transition-all duration-300">
                <img
                  src="https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?w=400&q=80"
                  alt="Event"
                  className="w-full aspect-[3/4] object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-nn-black/60 to-transparent" />
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
};

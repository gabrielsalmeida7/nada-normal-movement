import { motion } from "framer-motion";
import { Instagram, Youtube, MessageCircle, CalendarCheck } from "lucide-react";
import { Button } from "@/components/ui/button";

const blobClasses = ['shape-blob-1', 'shape-blob-2', 'shape-blob-3', 'shape-blob-4'];

const imageOrganicStyles = [
  { borderRadius: '10px 40px 10px 40px' },
  { borderRadius: '40px 10px 40px 10px' },
  { borderRadius: '5px 30px 50px 15px' },
  { borderRadius: '50px 15px 5px 35px' },
];

const communityFeatures = [
  {
    icon: Instagram,
    title: "Perfil no Instagram",
    description: "Acompanhe o caos diário no nosso Insta",
    iconBg: "bg-nn-orange",
  },
  {
    icon: Youtube,
    title: "Canal no YouTube",
    description: "Séries exclusivas com atletas NN — no YouTube",
    iconBg: "bg-nn-lime",
  },
  {
    icon: MessageCircle,
    title: "Comunidade no WhatsApp",
    description: "Entre no grupo e faça parte da tribo",
    iconBg: "bg-nn-yellow",
  },
  {
    icon: CalendarCheck,
    title: "Eventos NN",
    description: "Corridas, desafios e experiências únicas",
    iconBg: "bg-nn-red",
  },
];

export const CommunitySection = () => {
  return (
    <section id="community" className="py-24 relative overflow-hidden bg-gradient-to-br from-nn-pink via-nn-purple-neon to-nn-blue-neon">
      {/* Graffiti brand image */}
      <motion.img
        src="/lovable-uploads/Norm.png"
        alt=""
        className="absolute right-0 bottom-0 w-80 opacity-20"
        initial={{ x: 100, opacity: 0 }}
        whileInView={{ x: 0, opacity: 0.2 }}
        viewport={{ once: true }}
        transition={{ duration: 0.8 }}
      />

      <div className="container relative z-10">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Left Content */}
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
          >
            <span className="text-nn-lime font-display text-sm tracking-widest glow-text-lime">
              FAÇA PARTE
            </span>
            <h2 className="font-display text-5xl md:text-7xl mt-2 mb-6 text-nn-white">
              COMUNIDADE{" "}
              <span className="text-nn-lime drop-shadow-[0_2px_4px_rgba(0,0,0,0.3)]">NADA NORMAL</span>
            </h2>
            <p className="text-nn-white/90 text-lg mb-8 leading-relaxed font-medium">
              Ser normal nunca mudou nada. Por isso escolhemos ser diferentes. 
              Conecte-se com pessoas que entendem sua loucura e faça parte 
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
                  {/* Icon with blob shape */}
                  <div className={`w-12 h-12 ${feature.iconBg} ${blobClasses[index]} text-nn-black flex items-center justify-center shadow-brutal group-hover:translate-x-1 group-hover:translate-y-1 group-hover:shadow-none transition-all duration-300`}>
                    <feature.icon size={24} />
                  </div>
                  <div>
                    <h4 className="font-display text-lg text-nn-white group-hover:text-nn-lime transition-colors">
                      {feature.title}
                    </h4>
                    <p className="text-nn-white/70 text-sm">
                      {feature.description}
                    </p>
                  </div>
                </motion.div>
              ))}
            </div>

            <Button variant="chaosV2" size="lg" className="btn-organic">
              Junte-se ao Movimento
            </Button>
          </motion.div>

          {/* Right Content - Image Grid with organic shapes */}
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            className="grid grid-cols-2 gap-4"
          >
            <div className="space-y-4">
              <div 
                style={imageOrganicStyles[0]}
                className="relative overflow-hidden border-4 border-nn-black hover:border-nn-orange transition-all duration-300 hover:shadow-neon-orange"
              >
                <img
                  src="https://images.unsplash.com/photo-1552674605-db6ffd4facb5?w=400&q=80"
                  alt="Runner"
                  className="w-full aspect-[3/4] object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-nn-black/60 to-transparent" />
              </div>
              <div 
                style={imageOrganicStyles[1]}
                className="relative overflow-hidden border-4 border-nn-black hover:border-nn-lime transition-all duration-300 hover:shadow-neon-lime"
              >
                <img
                  src="https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?w=400&q=80"
                  alt="Community"
                  className="w-full aspect-square object-cover"
                />
              </div>
            </div>
            <div className="space-y-4 pt-8">
              <div 
                style={imageOrganicStyles[2]}
                className="relative overflow-hidden border-4 border-nn-black hover:border-nn-yellow transition-all duration-300 hover:shadow-neon-yellow"
              >
                <img
                  src="https://images.unsplash.com/photo-1517836357463-d25dfeac3438?w=400&q=80"
                  alt="Training"
                  className="w-full aspect-square object-cover"
                />
              </div>
              <div 
                style={imageOrganicStyles[3]}
                className="relative overflow-hidden border-4 border-nn-black hover:border-nn-red transition-all duration-300 hover:shadow-neon-red"
              >
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

import { motion } from "framer-motion";
import { Laugh, Brain, Users, Flame } from "lucide-react";
const pillars = [{
  icon: Laugh,
  title: "Resenha Total",
  subtitle: "A zoeira não para",
  description: "Onde o treino vira festa e o sofrimento vira piada. A resenha é o combustível.",
  bgColor: "bg-nn-orange",
  textColor: "text-nn-orange",
  hoverBorder: "hover:border-nn-orange",
  shadowClass: "hover:shadow-neon-orange",
  blobClass: "shape-blob-1",
  cardStyle: {
    borderRadius: '10px 40px 10px 40px'
  }
}, {
  icon: Brain,
  title: "Caos Organizado",
  subtitle: "Método na loucura",
  description: "Parece bagunça, mas cada passo é calculado. O caos é só a superfície.",
  bgColor: "bg-nn-lime",
  textColor: "text-nn-lime",
  hoverBorder: "hover:border-nn-lime",
  shadowClass: "hover:shadow-neon-lime",
  blobClass: "shape-blob-2",
  cardStyle: {
    borderRadius: '40px 10px 40px 10px'
  }
}, {
  icon: Users,
  title: "Pertencimento",
  subtitle: "Sua tribo te espera",
  description: "Aqui ninguém corre sozinho. A manada anormal é sua família.",
  bgColor: "bg-nn-yellow",
  textColor: "text-nn-yellow",
  hoverBorder: "hover:border-nn-yellow",
  shadowClass: "hover:shadow-neon-yellow",
  blobClass: "shape-blob-3",
  cardStyle: {
    borderRadius: '5px 30px 50px 15px'
  }
}, {
  icon: Flame,
  title: "Descontrole",
  subtitle: "Sem freio, sem limite",
  description: "Quando você solta o controle, descobre que nunca precisou dele.",
  bgColor: "bg-nn-red",
  textColor: "text-nn-red",
  hoverBorder: "hover:border-nn-red",
  shadowClass: "hover:shadow-neon-red",
  blobClass: "shape-blob-4",
  cardStyle: {
    borderRadius: '50px 15px 5px 35px'
  }
}];
export const PillarsSection = () => {
  return <section id="manifesto" className="py-24 relative overflow-hidden bg-gradient-to-br from-nn-purple-neon via-nn-pink to-nn-orange">
      {/* Background pattern */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute inset-0" style={{
        backgroundImage: `repeating-linear-gradient(
            45deg,
            transparent,
            transparent 20px,
            hsl(var(--nn-black)) 20px,
            hsl(var(--nn-black)) 22px
          )`
      }} />
      </div>

      {/* Watermark brand image */}
      <motion.img src="/lovable-uploads/NN1.png" alt="" className="absolute right-10 top-1/2 -translate-y-1/2 w-72 opacity-20" animate={{
      rotate: [0, 5, 0, -5, 0]
    }} transition={{
      duration: 10,
      repeat: Infinity,
      ease: "easeInOut"
    }} />

      <div className="container relative z-10">
        {/* Section Header */}
        <motion.div initial={{
        opacity: 0,
        y: 20
      }} whileInView={{
        opacity: 1,
        y: 0
      }} viewport={{
        once: true
      }} className="text-center mb-16">
          <h2 className="font-display text-5xl md:text-7xl mb-4 text-nn-black">
            OS <span className="text-nn-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.5)]">4 PILARES</span> DA ANORMALIDADE
          </h2>
          <p className="text-nn-black/80 text-lg max-w-2xl mx-auto font-medium">
            Cada pilar representa uma faceta do que significa ser Nada Normal
          </p>
        </motion.div>

        {/* Pillars Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {pillars.map((pillar, index) => <motion.div key={pillar.title} initial={{
          opacity: 0,
          y: 30
        }} whileInView={{
          opacity: 1,
          y: 0
        }} viewport={{
          once: true
        }} transition={{
          delay: index * 0.1
        }} whileHover={{
          scale: 1.02
        }} style={pillar.cardStyle} className={`group bg-nn-black border-4 border-nn-black p-6 ${pillar.hoverBorder} transition-all duration-300 ${pillar.shadowClass} overflow-hidden`}>
              {/* Icon with blob shape */}
              <div className={`w-16 h-16 ${pillar.bgColor} ${pillar.blobClass} flex items-center justify-center mb-6 shadow-brutal group-hover:translate-x-1 group-hover:translate-y-1 group-hover:shadow-none transition-all duration-300`}>
                <pillar.icon className="text-nn-black" size={32} />
              </div>

              {/* Content */}
              <span className={`${pillar.textColor} font-display text-xs tracking-widest`}>
                {pillar.subtitle}
              </span>
              <h3 className="font-display text-nn-white mt-1 mb-3 break-words text-center text-lg">
                {pillar.title}
              </h3>
              <p className="text-nn-white/70 text-sm leading-relaxed">
                {pillar.description}
              </p>
            </motion.div>)}
        </div>
      </div>
    </section>;
};
import { motion } from "framer-motion";
import { ChevronDown, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";

export const HeroSection = () => {
  return (
    <section
      id="home"
      className="relative min-h-screen flex items-center justify-center overflow-hidden pt-28"
    >
      {/* Background with gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-br from-background via-[hsl(270,30%,12%)] to-background" />
      
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden">
        <motion.div
          animate={{
            rotate: [0, 360],
            scale: [1, 1.2, 1],
          }}
          transition={{
            duration: 20,
            repeat: Infinity,
            ease: "linear",
          }}
          className="absolute -top-1/2 -right-1/2 w-full h-full bg-gradient-to-br from-nn-purple-neon/30 to-transparent rounded-full blur-3xl"
        />
        <motion.div
          animate={{
            rotate: [360, 0],
            scale: [1, 1.3, 1],
          }}
          transition={{
            duration: 25,
            repeat: Infinity,
            ease: "linear",
          }}
          className="absolute -bottom-1/2 -left-1/2 w-full h-full bg-gradient-to-tr from-nn-blue-neon/30 to-transparent rounded-full blur-3xl"
        />
      </div>

      {/* Floating Brand Images */}
      <motion.img
        src="/lovable-uploads/NNRaio.png"
        alt=""
        className="absolute right-10 top-40 w-32 md:w-48 opacity-90 drop-shadow-[0_0_30px_hsl(270,100%,60%,0.6)]"
        animate={{ y: [0, -20, 0], rotate: [-5, 5, -5] }}
        transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.img
        src="/lovable-uploads/MaoNN.png"
        alt=""
        className="absolute left-10 bottom-40 w-24 md:w-40 opacity-80 drop-shadow-[0_0_25px_hsl(210,100%,55%,0.6)]"
        animate={{ y: [0, -15, 0], rotate: [5, -5, 5] }}
        transition={{ duration: 3.5, repeat: Infinity, ease: "easeInOut" }}
      />

      {/* Marquee Banner */}
      <div className="absolute top-28 left-0 right-0 overflow-hidden bg-gradient-to-r from-nn-purple-neon via-nn-blue-neon to-nn-purple-neon py-3">
        <div className="animate-marquee flex whitespace-nowrap">
          {[...Array(10)].map((_, i) => (
            <span key={i} className="font-display text-nn-black text-lg mx-8 flex items-center gap-4">
              <Zap className="fill-nn-black" size={20} />
              ONDE A SUA LOUCURA FAZ SENTIDO
              <Zap className="fill-nn-black" size={20} />
              DOIDOS PELO QUE FAZEM
            </span>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="container relative z-10 text-center px-4 pt-20 md:pt-16 lg:pt-12">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="max-w-5xl mx-auto"
        >
          {/* Main title with glitch effect */}
          <h1
            className="font-display text-5xl sm:text-6xl md:text-8xl lg:text-[10rem] leading-none mb-6 md:mb-8 glitch mt-8 md:mt-4"
            data-text="NADA NORMAL"
          >
            <span className="text-nn-purple-neon text-stroke glow-text">NADA</span>{" "}
            <span className="text-nn-green-neon text-stroke glow-text-green">NORMAL</span>
          </h1>

          {/* Manifesto */}
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6 }}
            className="text-base sm:text-lg md:text-xl text-foreground/80 max-w-3xl mx-auto mb-8 md:mb-12 leading-relaxed px-2"
          >
            Não corremos para caber em planilhas. Corremos porque o silêncio do asfalto 
            é o único lugar que entende nossa loucura.{" "}
            <span className="text-nn-purple-neon font-semibold">
              Ser comum é uma escolha. Nós escolhemos o oposto.
            </span>
          </motion.p>

          {/* CTAs */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.9 }}
            className="flex flex-col sm:flex-row items-center justify-center gap-4"
          >
            <Button variant="hero" size="xl">
              Entrar no Movimento
            </Button>
            <Button variant="chaos" size="xl">
              Ver Coleção
            </Button>
          </motion.div>
        </motion.div>
      </div>

    </section>
  );
};

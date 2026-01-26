import { motion } from "framer-motion";
import { ChevronDown, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";

export const HeroSection = () => {
  return (
    <section
      id="home"
      className="relative min-h-screen flex items-center justify-center overflow-hidden pt-20"
    >
      {/* Background with gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-br from-nn-black via-background to-nn-black" />
      
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
          className="absolute -top-1/2 -right-1/2 w-full h-full bg-gradient-to-br from-nn-pink/20 to-transparent rounded-full blur-3xl"
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
          className="absolute -bottom-1/2 -left-1/2 w-full h-full bg-gradient-to-tr from-nn-cyan/20 to-transparent rounded-full blur-3xl"
        />
      </div>

      {/* Marquee Banner */}
      <div className="absolute top-24 left-0 right-0 overflow-hidden bg-nn-pink py-3">
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
      <div className="container relative z-10 text-center px-4">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="max-w-5xl mx-auto"
        >
          {/* Pre-title */}
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="text-nn-cyan font-display text-xl md:text-2xl mb-6 tracking-widest"
          >
            BEM-VINDO AO MOVIMENTO
          </motion.p>

          {/* Main title with glitch effect */}
          <h1
            className="font-display text-6xl md:text-8xl lg:text-9xl leading-none mb-8 glitch"
            data-text="NADA NORMAL"
          >
            <span className="text-nn-pink text-stroke">NADA</span>{" "}
            <span className="text-nn-yellow text-stroke">NORMAL</span>
          </h1>

          {/* Manifesto */}
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6 }}
            className="text-lg md:text-xl text-foreground/80 max-w-3xl mx-auto mb-12 leading-relaxed"
          >
            Não corremos para caber em planilhas. Corremos porque o silêncio do asfalto 
            é o único lugar que entende nossa loucura.{" "}
            <span className="text-nn-pink font-semibold">
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

      {/* Scroll indicator */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.2 }}
        className="absolute bottom-8 left-1/2 -translate-x-1/2"
      >
        <motion.div
          animate={{ y: [0, 10, 0] }}
          transition={{ duration: 1.5, repeat: Infinity }}
          className="flex flex-col items-center gap-2 text-foreground/60"
        >
          <span className="text-xs uppercase tracking-widest font-display">Rolar</span>
          <ChevronDown size={24} />
        </motion.div>
      </motion.div>
    </section>
  );
};

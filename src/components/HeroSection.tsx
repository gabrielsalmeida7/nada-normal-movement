import { motion } from "framer-motion";
import { Flame, Star } from "lucide-react";
import { Button } from "@/components/ui/button";

export const HeroSection = () => {
  return (
    <section
      id="home"
      className="relative min-h-screen flex items-center justify-center overflow-hidden pt-28"
    >
      {/* Background with lighter dark tone */}
      <div className="absolute inset-0 bg-[hsl(260,15%,14%)]" />
      
      {/* Organic flowing shapes */}
      <div className="absolute inset-0 overflow-hidden">
        {/* Purple organic blob */}
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ 
            scale: [1, 1.1, 1],
            opacity: 1,
            x: [0, 20, 0],
            y: [0, -10, 0]
          }}
          transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
          className="absolute -left-20 top-1/4 w-[500px] h-[400px] bg-nn-purple-neon/30 blur-3xl"
          style={{ borderRadius: "60% 40% 30% 70% / 60% 30% 70% 40%" }}
        />
        
        {/* Pink organic blob */}
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ 
            scale: [1, 1.15, 1],
            opacity: 1,
            x: [0, -15, 0],
            y: [0, 20, 0]
          }}
          transition={{ duration: 10, repeat: Infinity, ease: "easeInOut", delay: 1 }}
          className="absolute right-0 top-1/3 w-[400px] h-[350px] bg-nn-pink/25 blur-3xl"
          style={{ borderRadius: "40% 60% 70% 30% / 40% 50% 60% 50%" }}
        />
        
        {/* Orange organic accent */}
        <motion.div
          initial={{ scale: 0.7, opacity: 0 }}
          animate={{ 
            scale: [1, 1.2, 1],
            opacity: 1,
            rotate: [0, 10, 0]
          }}
          transition={{ duration: 7, repeat: Infinity, ease: "easeInOut", delay: 0.5 }}
          className="absolute left-1/3 bottom-20 w-[300px] h-[250px] bg-nn-orange/20 blur-3xl"
          style={{ borderRadius: "50% 50% 30% 70% / 50% 70% 30% 50%" }}
        />

        {/* Lime organic accent */}
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ 
            scale: [1, 1.1, 1],
            opacity: 1,
            y: [0, -30, 0]
          }}
          transition={{ duration: 9, repeat: Infinity, ease: "easeInOut", delay: 2 }}
          className="absolute right-1/4 bottom-1/4 w-[250px] h-[200px] bg-nn-lime/15 blur-3xl"
          style={{ borderRadius: "70% 30% 50% 50% / 30% 60% 40% 70%" }}
        />
      </div>

      {/* Floating Brand Images with warm glow */}
      <motion.img
        src="/lovable-uploads/NNRaio.png"
        alt=""
        className="absolute right-10 top-40 w-32 md:w-48 opacity-90 drop-shadow-[0_0_30px_hsl(330,100%,55%,0.6)] z-20"
        animate={{ y: [0, -20, 0], rotate: [-5, 5, -5] }}
        transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.img
        src="/lovable-uploads/MaoNN.png"
        alt=""
        className="absolute left-10 bottom-40 w-24 md:w-40 opacity-80 drop-shadow-[0_0_25px_hsl(270,100%,60%,0.6)] z-20"
        animate={{ y: [0, -15, 0], rotate: [5, -5, 5] }}
        transition={{ duration: 3.5, repeat: Infinity, ease: "easeInOut" }}
      />

      {/* Marquee Banner - with purple and pink */}
      <div className="absolute top-28 left-0 right-0 overflow-hidden bg-gradient-to-r from-nn-purple-neon via-nn-pink to-nn-orange border-y-2 border-nn-black py-3 z-30">
        <div className="animate-marquee flex whitespace-nowrap">
          {[...Array(10)].map((_, i) => (
            <span key={i} className="font-display text-lg mx-8 flex items-center gap-4 text-nn-black">
              <Flame className="fill-nn-black" size={20} />
              ONDE A SUA LOUCURA FAZ SENTIDO
              <Star className="fill-nn-black" size={20} />
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
          {/* Logo replacing H1 - with animation */}
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="relative inline-block mt-8 md:mt-4"
          >
            <motion.img
              src="/lovable-uploads/954aa667-c5fd-44ca-b757-b6ae62dbdb1e.png"
              alt="Nada Normal"
              className="w-[280px] sm:w-[400px] md:w-[500px] lg:w-[600px] mx-auto"
              animate={{ 
                scale: [1, 1.03, 1],
                rotate: [-1, 1, -1],
                filter: [
                  "drop-shadow(0 0 30px hsl(270,100%,60%,0.5))",
                  "drop-shadow(0 0 50px hsl(330,100%,55%,0.6))",
                  "drop-shadow(0 0 30px hsl(270,100%,60%,0.5))"
                ]
              }}
              transition={{ 
                duration: 4, 
                repeat: Infinity, 
                ease: "easeInOut" 
              }}
            />
            {/* Glow effect behind logo */}
            <motion.div 
              className="absolute inset-0 -z-10 blur-3xl opacity-40"
              animate={{
                background: [
                  "linear-gradient(135deg, hsl(270,100%,60%), hsl(330,100%,55%))",
                  "linear-gradient(135deg, hsl(330,100%,55%), hsl(25,100%,55%))",
                  "linear-gradient(135deg, hsl(270,100%,60%), hsl(330,100%,55%))"
                ]
              }}
              transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
            />
          </motion.div>

          {/* Manifesto */}
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6 }}
            className="text-base sm:text-lg md:text-xl text-foreground/90 max-w-3xl mx-auto mb-8 md:mb-12 leading-relaxed px-2 mt-8"
          >
            Não corremos para caber em planilhas. Corremos porque o silêncio do asfalto 
            é o único lugar que entende nossa loucura.{" "}
            <span className="text-nn-pink font-semibold glow-text">
              Ser comum é uma escolha. Nós escolhemos o oposto.
            </span>
          </motion.p>

          {/* CTAs with mixed variants */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.9 }}
            className="flex flex-col sm:flex-row items-center justify-center gap-4"
          >
            <Button variant="hero" size="xl">
              Entrar no Movimento
            </Button>
            <Button variant="chaosV2" size="xl">
              Ver Coleção
            </Button>
          </motion.div>
        </motion.div>
      </div>

      {/* Decorative organic floating shapes */}
      <motion.div
        animate={{ 
          rotate: [0, 360],
          scale: [1, 1.1, 1]
        }}
        transition={{ duration: 25, repeat: Infinity, ease: "linear" }}
        className="absolute left-1/4 bottom-20 w-20 h-16 border-2 border-nn-pink/40 opacity-60"
        style={{ borderRadius: "60% 40% 30% 70% / 60% 30% 70% 40%" }}
      />
      <motion.div
        animate={{ 
          rotate: [-360, 0],
          y: [0, -20, 0]
        }}
        transition={{ duration: 20, repeat: Infinity, ease: "easeInOut" }}
        className="absolute right-1/3 top-1/3 w-14 h-14 bg-nn-purple-neon/20"
        style={{ borderRadius: "40% 60% 70% 30% / 40% 50% 60% 50%" }}
      />
      <motion.div
        animate={{ 
          scale: [1, 1.2, 1],
          rotate: [0, 15, 0]
        }}
        transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
        className="absolute left-20 top-1/2 w-10 h-12 border-2 border-nn-orange/30"
        style={{ borderRadius: "50% 50% 30% 70% / 50% 70% 30% 50%" }}
      />
    </section>
  );
};

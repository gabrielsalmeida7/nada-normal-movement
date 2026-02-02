import { motion } from "framer-motion";
import { Zap, Flame, Star } from "lucide-react";
import { Button } from "@/components/ui/button";

export const HeroSection = () => {
  return (
    <section
      id="home"
      className="relative min-h-screen flex items-center justify-center overflow-hidden pt-28"
    >
      {/* Background with high contrast geometric blocks */}
      <div className="absolute inset-0 bg-nn-black" />
      
      {/* Diagonal color blocks */}
      <div className="absolute inset-0 overflow-hidden">
        {/* Orange diagonal block */}
        <motion.div
          initial={{ x: -100, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ duration: 0.8 }}
          className="absolute -left-20 top-0 w-1/2 h-full bg-nn-orange transform -skew-x-12 origin-top-left"
          style={{ clipPath: "polygon(0 0, 70% 0, 40% 100%, 0 100%)" }}
        />
        
        {/* Yellow accent strip */}
        <motion.div
          initial={{ y: -100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="absolute left-1/4 top-0 w-16 h-full bg-nn-yellow transform skew-x-12"
        />
        
        {/* Lime green block bottom right */}
        <motion.div
          initial={{ x: 100, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ duration: 0.8, delay: 0.3 }}
          className="absolute -right-20 bottom-0 w-1/3 h-2/3 bg-nn-lime transform skew-x-6 origin-bottom-right"
          style={{ clipPath: "polygon(30% 0, 100% 0, 100% 100%, 0 100%)" }}
        />
        
        {/* Red accent triangle */}
        <motion.div
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.5 }}
          className="absolute right-10 top-40 w-32 h-32 bg-nn-red"
          style={{ clipPath: "polygon(50% 0%, 100% 100%, 0% 100%)" }}
        />
      </div>

      {/* Floating Brand Images with warm glow */}
      <motion.img
        src="/lovable-uploads/NNRaio.png"
        alt=""
        className="absolute right-10 top-40 w-32 md:w-48 opacity-90 drop-shadow-[0_0_30px_hsl(25,100%,55%,0.6)] z-20"
        animate={{ y: [0, -20, 0], rotate: [-5, 5, -5] }}
        transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.img
        src="/lovable-uploads/MaoNN.png"
        alt=""
        className="absolute left-10 bottom-40 w-24 md:w-40 opacity-80 drop-shadow-[0_0_25px_hsl(80,100%,50%,0.6)] z-20"
        animate={{ y: [0, -15, 0], rotate: [5, -5, 5] }}
        transition={{ duration: 3.5, repeat: Infinity, ease: "easeInOut" }}
      />

      {/* Marquee Banner - inverted colors */}
      <div className="absolute top-28 left-0 right-0 overflow-hidden bg-nn-black border-y-4 border-nn-yellow py-3 z-30">
        <div className="animate-marquee flex whitespace-nowrap">
          {[...Array(10)].map((_, i) => (
            <span key={i} className="font-display text-lg mx-8 flex items-center gap-4">
              <Flame className="text-nn-orange fill-nn-orange" size={20} />
              <span className="text-nn-orange">ONDE A SUA LOUCURA FAZ SENTIDO</span>
              <Star className="text-nn-yellow fill-nn-yellow" size={20} />
              <span className="text-nn-lime">DOIDOS PELO QUE FAZEM</span>
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
          {/* Logo replacing H1 */}
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="relative inline-block mt-8 md:mt-4"
          >
            <img
              src="/lovable-uploads/954aa667-c5fd-44ca-b757-b6ae62dbdb1e.png"
              alt="Nada Normal"
              className="w-[280px] sm:w-[400px] md:w-[500px] lg:w-[600px] mx-auto drop-shadow-[0_0_50px_hsl(25,100%,55%,0.7)]"
            />
            {/* Glow effect behind logo */}
            <div className="absolute inset-0 -z-10 blur-3xl opacity-50 bg-gradient-to-r from-nn-orange via-nn-yellow to-nn-lime" />
          </motion.div>

          {/* Manifesto */}
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6 }}
            className="text-base sm:text-lg md:text-xl text-nn-white max-w-3xl mx-auto mb-8 md:mb-12 leading-relaxed px-2 mt-8"
          >
            Não corremos para caber em planilhas. Corremos porque o silêncio do asfalto 
            é o único lugar que entende nossa loucura.{" "}
            <span className="text-nn-orange font-semibold glow-text-orange">
              Ser comum é uma escolha. Nós escolhemos o oposto.
            </span>
          </motion.p>

          {/* CTAs with V2 variants */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.9 }}
            className="flex flex-col sm:flex-row items-center justify-center gap-4"
          >
            <Button variant="heroV2" size="xl">
              Entrar no Movimento
            </Button>
            <Button variant="chaosV2" size="xl">
              Ver Coleção
            </Button>
          </motion.div>
        </motion.div>
      </div>

      {/* Decorative floating shapes */}
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
        className="absolute left-1/4 bottom-20 w-16 h-16 border-4 border-nn-yellow opacity-60"
      />
      <motion.div
        animate={{ rotate: -360 }}
        transition={{ duration: 15, repeat: Infinity, ease: "linear" }}
        className="absolute right-1/3 top-1/3 w-12 h-12 bg-nn-red/30 rotate-45"
      />
    </section>
  );
};

import { motion } from "framer-motion";
import { Flame, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import heroLogo from "@/assets/nn-logo-hero.png";
import splash1 from "@/assets/splash1.svg";
import splash2 from "@/assets/splash2.svg";

export const HeroSection = () => {
  return (
    <section
      id="home"
      className="relative min-h-screen flex items-center justify-center overflow-hidden pt-28"
    >
      {/* Background with deep purple-blue */}
      <div className="absolute inset-0 bg-[hsl(250,40%,8%)]" />
      
      {/* Organic flowing shapes - more intense */}
      <div className="absolute inset-0 overflow-hidden">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: [1, 1.1, 1], opacity: 1, x: [0, 20, 0], y: [0, -10, 0] }}
          transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
          className="absolute -left-20 top-1/4 w-[500px] h-[400px] bg-nn-purple-neon/50 blur-3xl"
          style={{ borderRadius: "60% 40% 30% 70% / 60% 30% 70% 40%" }}
        />
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: [1, 1.15, 1], opacity: 1, x: [0, -15, 0], y: [0, 20, 0] }}
          transition={{ duration: 10, repeat: Infinity, ease: "easeInOut", delay: 1 }}
          className="absolute right-0 top-1/3 w-[400px] h-[350px] bg-nn-pink/40 blur-3xl"
          style={{ borderRadius: "40% 60% 70% 30% / 40% 50% 60% 50%" }}
        />
        <motion.div
          initial={{ scale: 0.7, opacity: 0 }}
          animate={{ scale: [1, 1.2, 1], opacity: 1, rotate: [0, 10, 0] }}
          transition={{ duration: 7, repeat: Infinity, ease: "easeInOut", delay: 0.5 }}
          className="absolute left-1/3 bottom-20 w-[300px] h-[250px] bg-nn-green-neon/30 blur-3xl"
          style={{ borderRadius: "50% 50% 30% 70% / 50% 70% 30% 50%" }}
        />
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: [1, 1.1, 1], opacity: 1, y: [0, -30, 0] }}
          transition={{ duration: 9, repeat: Infinity, ease: "easeInOut", delay: 2 }}
          className="absolute right-1/4 bottom-1/4 w-[250px] h-[200px] bg-nn-lime/20 blur-3xl"
          style={{ borderRadius: "70% 30% 50% 50% / 30% 60% 40% 70%" }}
        />
      </div>

      {/* Floating Brand Images */}
      <motion.img
        src="/lovable-uploads/NNRaio.png"
        alt=""
        className="absolute right-10 top-40 w-32 md:w-48 opacity-90 drop-shadow-[0_0_30px_hsl(330,100%,60%,0.6)] z-20"
        animate={{ y: [0, -20, 0], rotate: [-5, 5, -5] }}
        transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.img
        src="/lovable-uploads/MaoNN.png"
        alt=""
        className="absolute left-10 bottom-40 w-24 md:w-40 opacity-80 drop-shadow-[0_0_25px_hsl(270,100%,65%,0.6)] z-20"
        animate={{ y: [0, -15, 0], rotate: [5, -5, 5] }}
        transition={{ duration: 3.5, repeat: Infinity, ease: "easeInOut" }}
      />

      {/* Marquee Banner */}
      <div className="absolute top-28 left-0 right-0 overflow-hidden bg-gradient-to-r from-nn-purple-neon via-nn-pink to-nn-green-neon border-y-2 border-nn-black py-3 z-30" style={{ transform: "rotate(-2deg)", transformOrigin: "center center", marginLeft: "-2%", marginRight: "-2%", width: "104%" }}>
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
          {/* Logo with dynamic animation */}
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="relative inline-block mt-8 md:mt-4"
          >
            <motion.img
              src={heroLogo}
              alt="Nada Normal"
              className="w-[280px] sm:w-[400px] md:w-[500px] lg:w-[600px] mx-auto"
              animate={{ 
                scale: [1, 1.08, 1],
                rotate: [-3, 3, -3],
                y: [0, -15, 0],
                filter: [
                  "drop-shadow(0 0 40px hsl(270,100%,65%,0.7))",
                  "drop-shadow(0 0 60px hsl(330,100%,60%,0.8))",
                  "drop-shadow(0 0 40px hsl(140,100%,55%,0.7))"
                ]
              }}
              transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
            />
            {/* Glow effect behind logo */}
            <motion.div 
              className="absolute inset-0 -z-10 blur-3xl opacity-40"
              animate={{
                background: [
                  "linear-gradient(135deg, hsl(270,100%,65%), hsl(330,100%,60%))",
                  "linear-gradient(135deg, hsl(330,100%,60%), hsl(140,100%,55%))",
                  "linear-gradient(135deg, hsl(270,100%,65%), hsl(330,100%,60%))"
                ]
              }}
              transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
            />

            {/* Static splashes */}
            <img
              src={splash1}
              alt=""
              className="absolute -top-10 -left-16 w-28 sm:w-36 md:w-44 pointer-events-none"
              style={{ filter: "drop-shadow(0 0 30px hsl(270,100%,65%,0.6))" }}
            />
            <img
              src={splash2}
              alt=""
              className="absolute -bottom-8 -right-14 w-28 sm:w-36 md:w-44 pointer-events-none"
              style={{ filter: "drop-shadow(0 0 30px hsl(330,100%,60%,0.6))" }}
            />
            <img
              src={splash1}
              alt=""
              className="absolute -top-6 -right-12 w-20 sm:w-28 md:w-32 pointer-events-none rotate-90"
              style={{ filter: "drop-shadow(0 0 25px hsl(140,100%,55%,0.6))" }}
            />
            <img
              src={splash2}
              alt=""
              className="absolute -bottom-6 -left-10 w-20 sm:w-28 md:w-32 pointer-events-none -rotate-45"
              style={{ filter: "drop-shadow(0 0 25px hsl(140,100%,55%,0.6))" }}
            />
          </motion.div>

          {/* Highlighted phrase */}
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6 }}
            className="text-xl sm:text-2xl md:text-3xl font-display text-nn-pink max-w-3xl mx-auto mb-8 md:mb-12 leading-relaxed px-2 mt-8 glow-text tracking-wide"
          >
            "Nada aqui foi criado pra pessoas normais — e isso é exatamente o ponto."
          </motion.p>

          {/* CTAs */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.9 }}
            className="flex flex-col sm:flex-row items-center justify-center gap-4"
          >
            <motion.div
              style={{ rotate: -2, background: "hsl(30, 100%, 50%)" }}
              whileHover={{ rotate: 2, scale: 1.05 }}
              transition={{ type: "spring", stiffness: 300, damping: 15 }}
              className="px-14 py-6 text-xl border-none rounded-[8px] shadow-brutal cursor-pointer font-display font-bold uppercase tracking-wider text-nn-black"
            >
              Entrar no Movimento
            </motion.div>
            <motion.div
              style={{ rotate: 2, background: "hsl(330, 100%, 50%)", color: "black" }}
              whileHover={{ rotate: -2, scale: 1.05 }}
              transition={{ type: "spring", stiffness: 300, damping: 15 }}
              className="px-14 py-6 text-xl border-none rounded-[8px] shadow-brutal cursor-pointer font-display font-bold uppercase tracking-wider text-nn-black"
            >
              Ver Coleção
            </motion.div>
          </motion.div>
        </motion.div>
      </div>

      {/* Decorative organic floating shapes */}
      <motion.div
        animate={{ rotate: [0, 360], scale: [1, 1.1, 1] }}
        transition={{ duration: 25, repeat: Infinity, ease: "linear" }}
        className="absolute left-1/4 bottom-20 w-20 h-16 border-2 border-nn-pink/40 opacity-60"
        style={{ borderRadius: "60% 40% 30% 70% / 60% 30% 70% 40%" }}
      />
      <motion.div
        animate={{ rotate: [-360, 0], y: [0, -20, 0] }}
        transition={{ duration: 20, repeat: Infinity, ease: "easeInOut" }}
        className="absolute right-1/3 top-1/3 w-14 h-14 bg-nn-purple-neon/20"
        style={{ borderRadius: "40% 60% 70% 30% / 40% 50% 60% 50%" }}
      />
      <motion.div
        animate={{ scale: [1, 1.2, 1], rotate: [0, 15, 0] }}
        transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
        className="absolute left-20 top-1/2 w-10 h-12 border-2 border-nn-green-neon/30"
        style={{ borderRadius: "50% 50% 30% 70% / 50% 70% 30% 50%" }}
      />
    </section>
  );
};

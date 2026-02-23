import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Zap } from "lucide-react";
import nnLogoBadge from "@/assets/nn-logo-badge.png";
import mascotImage from "@/assets/mascot-running.png";

const LAUNCH_DATE = new Date("2026-03-30T00:00:00");

const useCountdown = () => {
  const [timeLeft, setTimeLeft] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });

  useEffect(() => {
    const tick = () => {
      const diff = LAUNCH_DATE.getTime() - Date.now();
      if (diff > 0) {
        setTimeLeft({
          days: Math.floor(diff / 86400000),
          hours: Math.floor(diff / 3600000 % 24),
          minutes: Math.floor(diff / 60000 % 60),
          seconds: Math.floor(diff / 1000 % 60)
        });
      }
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  return timeLeft;
};

const ComingSoon = () => {
  const [videoReady, setVideoReady] = useState(false);
  const timeLeft = useCountdown();
  const pad = (n: number) => String(n).padStart(2, "0");

  return (
    <div className="relative w-full min-h-[100dvh] overflow-hidden bg-background">
      {/* Background Video */}
      <video
        className="absolute inset-0 w-full h-full object-cover"
        src="/videos/NN6.mp4"
        autoPlay
        loop
        muted
        playsInline
        preload="auto"
        onCanPlay={() => setVideoReady(true)}
      />

      {/* Loading overlay - desktop only */}
      <AnimatePresence>
        {!videoReady && (
          <motion.div
            className="absolute inset-0 z-20 flex items-center justify-center bg-background"
            initial={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5 }}
          >
            <motion.img
              src={nnLogoBadge}
              alt="Carregando..."
              className="w-24 h-24 md:w-32 md:h-32 drop-shadow-lg"
              animate={{ rotate: 360 }}
              transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* ===== MOBILE LAYOUT ===== */}
      <div className="relative z-10 flex flex-col items-center min-h-[100dvh] px-6 pt-6 pb-0 md:hidden">
        {/* Logo top-right */}
        <div className="w-full flex justify-end mb-4">
          <motion.img
            src={nnLogoBadge}
            alt="Nada Normal"
            className="w-16 h-16 drop-shadow-lg"
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1, rotate: 360 }}
            transition={{
              opacity: { duration: 0.6 },
              scale: { duration: 0.6 },
              rotate: { duration: 8, repeat: Infinity, ease: "linear" },
            }}
          />
        </div>

        {/* Title */}
        <motion.h1
          className="font-bowlby text-5xl tracking-wider text-gradient-chaos drop-shadow-lg text-center"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
        >
          Em Breve...
        </motion.h1>

        {/* Subtitle */}
        <motion.p
          className="mt-4 font-display font-bold text-lg text-foreground"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3, duration: 0.6 }}
        >
          Não é pra todo mundo.
        </motion.p>

        {/* Secondary text */}
        <motion.p
          className="mt-2 text-sm text-foreground/70 max-w-[260px] leading-relaxed"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5, duration: 0.6 }}
        >
          Se você precisa de aprovação, pode sair agora.
        </motion.p>

        {/* CTA Button */}
        <motion.a
          href="https://chat.whatsapp.com/HEO5g8sZe95GOys709ucpg"
          target="_blank"
          rel="noopener noreferrer"
          className="mt-6 flex items-center gap-2 px-6 py-3 rounded-full font-display font-bold text-base text-foreground shadow-lg"
          style={{ background: "linear-gradient(135deg, #fe1089, #ff3cac)" }}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7, duration: 0.5 }}
          whileTap={{ scale: 0.95 }}
        >
          <Zap size={18} fill="currentColor" />
          Quero acesso antecipado
        </motion.a>

        {/* Countdown label */}
        <motion.span
          className="mt-6 text-xs tracking-widest text-foreground/60 font-display uppercase"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.9, duration: 0.5 }}
        >
          Lançamento em:
        </motion.span>

        {/* Countdown box */}
        <motion.div
          className="mt-2 border border-foreground/30 rounded-lg px-5 py-2"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1, duration: 0.5 }}
        >
          <span className="font-bowlby text-2xl tracking-widest text-foreground">
            {pad(timeLeft.days)} : {pad(timeLeft.hours)} : {pad(timeLeft.minutes)} : {pad(timeLeft.seconds)}
          </span>
        </motion.div>

        {/* Spacer to push mascot/effects to bottom */}
        <div className="flex-1" />

        {/* Mascot + effects container */}
        <div className="relative w-full mt-4">
          {/* Mascot */}
          <motion.img
            src={mascotImage}
            alt="Mascote Nada Normal"
            className="relative z-10 ml-auto mr-4 w-32 h-auto drop-shadow-[0_0_15px_hsl(270,100%,60%,0.5)]"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1.2, duration: 0.6 }}
          />
          {/* Stairs effect */}
          <div className="coming-soon-stairs w-full h-16 -mt-4 relative z-0" />
          {/* Fire effect */}
          <div className="coming-soon-fire w-full h-12" />
        </div>
      </div>

      {/* ===== DESKTOP LAYOUT (unchanged) ===== */}
      <div className="absolute inset-0 pointer-events-none z-10 hidden md:flex flex-col justify-between p-6 md:p-12">
        {/* Top - Title & Manifesto */}
        <div className="flex flex-col gap-4">
          <div className="flex justify-between items-start">
            <motion.h1
              className="font-bowlby text-5xl md:text-8xl lg:text-9xl tracking-wider text-gradient-chaos drop-shadow-lg"
              initial={{ opacity: 0, y: -30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
            >
              Em Breve...
            </motion.h1>
            <motion.img
              src={nnLogoBadge}
              alt="Nada Normal"
              className="w-20 h-20 md:w-28 md:h-28 drop-shadow-lg"
              initial={{ opacity: 0, scale: 0.5 }}
              animate={{ opacity: 1, scale: 1, rotate: 360 }}
              transition={{
                opacity: { delay: 0.3, duration: 0.6 },
                scale: { delay: 0.3, duration: 0.6 },
                rotate: { duration: 8, repeat: Infinity, ease: "linear" },
              }}
            />
          </div>

          <motion.p
            className="mt-4 max-w-md md:max-w-lg text-sm md:text-base lg:text-lg text-foreground/85 leading-relaxed font-display font-semibold"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.5, duration: 0.7 }}
          >
            O normal aqui não entra, nada nesse lugar foi criado para pessoas normais e esse é exatamente o ponto.
          </motion.p>
        </div>

        {/* Bottom row */}
        <div className="flex justify-end items-end">
          <motion.div
            className="pointer-events-auto flex flex-col items-center gap-1"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1, duration: 0.6 }}
          >
            <span className="font-display text-xs md:text-sm tracking-widest drop-shadow-lg" style={{ color: '#fe1089' }}>
              NÃO APERTE AQUI ⚠️
            </span>
            <a href="https://chat.whatsapp.com/HEO5g8sZe95GOys709ucpg" target="_blank" rel="noopener noreferrer" className="text-nn-black border-4 border-nn-black font-display px-4 py-2 md:px-8 md:py-3 shadow-brutal cursor-pointer hover:translate-x-1 hover:translate-y-1 hover:shadow-none transition-all duration-200 rounded-[10px_30px_10px_30px] block" style={{ backgroundColor: '#fe1089' }}>
              <span className="text-lg md:text-2xl tracking-wider">
                {pad(timeLeft.days)}:{pad(timeLeft.hours)}:{pad(timeLeft.minutes)}:{pad(timeLeft.seconds)}
              </span>
            </a>
          </motion.div>
        </div>
      </div>
    </div>
  );
};

export default ComingSoon;

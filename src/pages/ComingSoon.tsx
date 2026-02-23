import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import nnLogoBadge from "@/assets/nn-logo-badge.png";

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
    <div className="relative w-full min-h-[100dvh] overflow-hidden bg-background" style={{ paddingTop: 'env(safe-area-inset-top)', paddingBottom: 'env(safe-area-inset-bottom)', paddingLeft: 'env(safe-area-inset-left)', paddingRight: 'env(safe-area-inset-right)' }}>
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

      {/* Loading overlay */}
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

      {/* Overlay content - centered column layout */}
      <div className="relative z-10 flex flex-col items-center justify-center min-h-[100dvh] px-6 py-8 md:px-12 md:py-12 text-center">
        {/* Logo top-right */}
        <motion.img
          src={nnLogoBadge}
          alt="Nada Normal"
          className="absolute top-4 right-4 w-16 h-16 md:w-24 md:h-24 drop-shadow-lg"
          style={{ top: 'max(1rem, env(safe-area-inset-top))' }}
          initial={{ opacity: 0, scale: 0.5 }}
          animate={{ opacity: 1, scale: 1, rotate: 360 }}
          transition={{
            opacity: { delay: 0.3, duration: 0.6 },
            scale: { delay: 0.3, duration: 0.6 },
            rotate: { duration: 8, repeat: Infinity, ease: "linear" },
          }}
        />

        {/* Title */}
        <motion.h1
          className="font-bowlby text-[clamp(2.5rem,12vw,9rem)] leading-none tracking-wider text-gradient-chaos drop-shadow-lg"
          initial={{ opacity: 0, y: -30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
        >
          Em Breve...
        </motion.h1>

        {/* Manifesto */}
        <motion.p
          className="mt-4 max-w-xs md:max-w-lg text-sm md:text-base lg:text-lg text-foreground/85 leading-relaxed font-display font-semibold"
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.5, duration: 0.7 }}
        >
          O normal aqui não entra, nada nesse lugar foi criado para pessoas normais e esse é exatamente o ponto.
        </motion.p>

        {/* Countdown button */}
        <motion.div
          className="mt-8 pointer-events-auto flex flex-col items-center gap-1"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1, duration: 0.6 }}
        >
          <span className="font-display text-xs md:text-sm tracking-widest drop-shadow-lg" style={{ color: '#fe1089' }}>
            NÃO APERTE AQUI ⚠️
          </span>
          <a href="https://instagram.com/nadanormalclub" target="_blank" rel="noopener noreferrer" className="text-nn-black border-4 border-nn-black font-display px-4 py-2 md:px-8 md:py-3 shadow-brutal cursor-pointer hover:translate-x-1 hover:translate-y-1 hover:shadow-none transition-all duration-200 rounded-[10px_30px_10px_30px] block" style={{ backgroundColor: '#fe1089' }}>
            <span className="text-lg md:text-2xl tracking-wider">
              {pad(timeLeft.days)}:{pad(timeLeft.hours)}:{pad(timeLeft.minutes)}:{pad(timeLeft.seconds)}
            </span>
          </a>
        </motion.div>
      </div>
    </div>);

};

export default ComingSoon;
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import nnLogoBadge from "@/assets/nn-logo-badge.png";
import mascotRunning from "@/assets/mascot-running.png";

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
    <div
      className="relative w-full overflow-hidden bg-background"
      style={{ minHeight: "100dvh" }}
    >
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

      {/* Logo top-right */}
      <motion.img
        src={nnLogoBadge}
        alt="Nada Normal"
        className="absolute top-4 right-4 md:top-8 md:right-8 w-16 h-16 md:w-24 md:h-24 drop-shadow-lg z-10"
        style={{ paddingTop: "env(safe-area-inset-top, 0px)" }}
        initial={{ opacity: 0, scale: 0.5 }}
        animate={{ opacity: 1, scale: 1, rotate: 360 }}
        transition={{
          opacity: { delay: 0.3, duration: 0.6 },
          scale: { delay: 0.3, duration: 0.6 },
          rotate: { duration: 8, repeat: Infinity, ease: "linear" },
        }}
      />

      {/* Centered content column */}
      <div
        className="relative z-10 flex flex-col items-center justify-center text-center px-6 md:px-12"
        style={{
          minHeight: "100dvh",
          paddingTop: "env(safe-area-inset-top, 0px)",
          paddingBottom: "env(safe-area-inset-bottom, 0px)",
        }}
      >
        {/* Title */}
        <motion.h1
          className="font-bowlby text-5xl md:text-7xl lg:text-9xl tracking-wider text-gradient-chaos drop-shadow-lg"
          initial={{ opacity: 0, y: -30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
        >
          Em Breve...
        </motion.h1>

        {/* Subtitle */}
        <motion.p
          className="mt-3 md:mt-5 text-lg md:text-2xl lg:text-3xl font-display font-black text-foreground tracking-wide"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.6 }}
        >
          Não é pra todo mundo.
        </motion.p>

        {/* Manifesto */}
        <motion.p
          className="mt-3 md:mt-4 max-w-xs md:max-w-md text-xs md:text-sm lg:text-base text-foreground/75 leading-relaxed font-display"
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.5, duration: 0.7 }}
        >
          O normal aqui não entra, nada nesse lugar foi criado para pessoas normais e esse é exatamente o ponto.
        </motion.p>

        {/* CTA Button + Countdown */}
        <motion.div
          className="mt-8 md:mt-10 flex flex-col items-center gap-2"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8, duration: 0.6 }}
        >
          <span
            className="font-display text-xs md:text-sm tracking-widest drop-shadow-lg font-bold"
            style={{ color: "#fe1089" }}
          >
            NÃO APERTE AQUI ⚠️
          </span>
          <a
            href="https://instagram.com/nadanormalclub"
            target="_blank"
            rel="noopener noreferrer"
            className="text-nn-black border-4 border-nn-black font-display px-6 py-3 md:px-10 md:py-4 shadow-brutal cursor-pointer hover:translate-x-1 hover:translate-y-1 hover:shadow-none transition-all duration-200 rounded-[10px_30px_10px_30px] block"
            style={{ backgroundColor: "#fe1089" }}
          >
            <span className="text-lg md:text-2xl tracking-wider font-bold">
              {pad(timeLeft.days)}:{pad(timeLeft.hours)}:{pad(timeLeft.minutes)}:{pad(timeLeft.seconds)}
            </span>
          </a>
          <span className="font-display text-[10px] md:text-xs text-foreground/50 tracking-widest mt-1">
            LANÇAMENTO EM
          </span>
        </motion.div>

        {/* Mascot */}
        <motion.img
          src={mascotRunning}
          alt="Mascote Nada Normal"
          className="mt-8 md:mt-12 w-20 h-auto md:w-28 lg:w-32 drop-shadow-lg"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.1, duration: 0.6 }}
        />
      </div>
    </div>
  );
};

export default ComingSoon;

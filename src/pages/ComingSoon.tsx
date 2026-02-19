import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Instagram, Mail } from "lucide-react";

const Hourglass = () => {
  const [flip, setFlip] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => {
      setFlip((f) => !f);
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  return (
    <motion.div
      animate={{ rotate: flip ? 180 : 0 }}
      transition={{ duration: 0.8, ease: "easeInOut" }}
      className="w-16 h-16 md:w-20 md:h-20"
    >
      <svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
        <defs>
          <linearGradient id="hg-grad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="hsl(270, 100%, 65%)" />
            <stop offset="100%" stopColor="hsl(210, 100%, 55%)" />
          </linearGradient>
        </defs>
        {/* Top and bottom caps */}
        <rect x="12" y="4" width="40" height="4" rx="2" fill="url(#hg-grad)" />
        <rect x="12" y="56" width="40" height="4" rx="2" fill="url(#hg-grad)" />
        {/* Glass outline */}
        <path
          d="M16 8 L16 24 L32 36 L48 24 L48 8"
          stroke="url(#hg-grad)" strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round"
        />
        <path
          d="M16 56 L16 40 L32 28 L48 40 L48 56"
          stroke="url(#hg-grad)" strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round"
        />
        {/* Sand top - draining */}
        <motion.path
          d="M20 10 L20 20 L32 30 L44 20 L44 10 Z"
          fill="url(#hg-grad)"
          initial={{ opacity: 0.9 }}
          animate={{ opacity: [0.9, 0.2] }}
          transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
        />
        {/* Sand bottom - filling */}
        <motion.path
          d="M20 54 L20 48 L32 40 L44 48 L44 54 Z"
          fill="url(#hg-grad)"
          initial={{ opacity: 0.2 }}
          animate={{ opacity: [0.2, 0.9] }}
          transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
        />
        {/* Falling stream */}
        <motion.line
          x1="32" y1="30" x2="32" y2="40"
          stroke="url(#hg-grad)" strokeWidth="2"
          initial={{ opacity: 0.8 }}
          animate={{ opacity: [0.8, 0.3, 0.8] }}
          transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
        />
      </svg>
    </motion.div>
  );
};

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
  const timeLeft = useCountdown();
  const pad = (n: number) => String(n).padStart(2, "0");

  return (
    <div className="relative w-full h-screen overflow-hidden bg-background">
      {/* Background Video */}
      <video
        className="absolute inset-0 w-full h-full object-cover"
        src="/videos/NN6.mp4"
        autoPlay
        loop
        muted
        playsInline
        preload="auto"
      />

      {/* Overlay content */}
      <div className="absolute inset-0 pointer-events-none z-10 flex flex-col justify-between p-6 md:p-12">
        {/* Top - Title & Manifesto */}
        <div className="flex flex-col gap-4 md:gap-6">
          <div className="flex justify-between items-start">
            <motion.h1
              className="font-display text-5xl md:text-8xl lg:text-9xl tracking-wider text-gradient-chaos drop-shadow-lg"
              initial={{ opacity: 0, y: -30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
            >
              Nada Normal
            </motion.h1>
            <motion.div
              initial={{ opacity: 0, scale: 0.5 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.3, duration: 0.6 }}
            >
              <Hourglass />
            </motion.div>
          </div>

          <motion.p
            className="max-w-md md:max-w-lg text-sm md:text-base lg:text-lg text-foreground/85 leading-relaxed font-display"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.5, duration: 0.7 }}
          >
            Ser normal nunca mudou nada. Aqui, o conforto acaba. A aprovação não importa. E o automático não entra. Nada aqui foi criado pra pessoas normais — e isso é exatamente o ponto.{" "}
            <span className="font-display text-gradient-chaos text-base md:text-lg lg:text-xl">Nada Normal</span>, em breve.
          </motion.p>
        </div>

        {/* Bottom row */}
        <div className="flex justify-end items-end">
          {/* Countdown button - bottom right */}
          <motion.div
            className="pointer-events-auto flex flex-col items-center gap-1"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1, duration: 0.6 }}
          >
            <span className="font-display text-xs md:text-sm text-nn-yellow tracking-widest drop-shadow-lg">
              NÃO APERTE AQUI ⚠️
            </span>
            <div className="bg-nn-yellow text-nn-black border-4 border-nn-black font-display px-4 py-2 md:px-8 md:py-3 shadow-brutal cursor-pointer hover:translate-x-1 hover:translate-y-1 hover:shadow-none transition-all duration-200 rounded-[10px_30px_10px_30px]">
              <span className="text-lg md:text-2xl tracking-wider">
                {pad(timeLeft.days)}:{pad(timeLeft.hours)}:{pad(timeLeft.minutes)}:{pad(timeLeft.seconds)}
              </span>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Social links overlay - bottom left */}
      <div className="absolute bottom-4 left-4 md:bottom-8 md:left-8 z-10 flex gap-3">
        <a
          href="https://instagram.com/nadanormal"
          target="_blank"
          rel="noopener noreferrer"
          className="w-10 h-10 bg-card/80 backdrop-blur border-2 border-nn-purple-neon flex items-center justify-center hover:bg-nn-purple-neon hover:text-background transition-all duration-300 shadow-neon-purple">

          <Instagram className="w-5 h-5" />
        </a>
        <a
          href="https://tiktok.com/@nadanormal"
          target="_blank"
          rel="noopener noreferrer"
          className="w-10 h-10 bg-card/80 backdrop-blur border-2 border-nn-blue-neon flex items-center justify-center hover:bg-nn-blue-neon hover:text-background transition-all duration-300 shadow-neon-blue">

          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
            <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z" />
          </svg>
        </a>
        <a
          href="mailto:contato@nadanormal.com"
          className="w-10 h-10 bg-card/80 backdrop-blur border-2 border-nn-green-neon flex items-center justify-center hover:bg-nn-green-neon hover:text-background transition-all duration-300 shadow-neon-green">

          <Mail className="w-5 h-5" />
        </a>
      </div>
    </div>);

};

export default ComingSoon;
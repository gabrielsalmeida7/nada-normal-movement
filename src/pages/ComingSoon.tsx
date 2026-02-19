import { useState, useEffect } from "react";
import { motion } from "framer-motion";
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
        <div className="flex flex-col gap-4 md:gap-4">
          <div className="flex justify-between items-start">
            <motion.h1
              className="font-display text-5xl md:text-8xl lg:text-9xl tracking-wider text-gradient-chaos drop-shadow-lg"
              initial={{ opacity: 0, y: -30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
            >
              Nada Normal
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
            className="mt-4 max-w-md md:max-w-lg text-sm md:text-base lg:text-lg text-foreground/85 leading-relaxed font-display"
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
            <a href="https://instagram.com/nadanormalclub" target="_blank" rel="noopener noreferrer" className="bg-nn-yellow text-nn-black border-4 border-nn-black font-display px-4 py-2 md:px-8 md:py-3 shadow-brutal cursor-pointer hover:translate-x-1 hover:translate-y-1 hover:shadow-none transition-all duration-200 rounded-[10px_30px_10px_30px] block">
              <span className="text-lg md:text-2xl tracking-wider">
                {pad(timeLeft.days)}:{pad(timeLeft.hours)}:{pad(timeLeft.minutes)}:{pad(timeLeft.seconds)}
              </span>
            </a>
          </motion.div>
        </div>
      </div>

    </div>);

};

export default ComingSoon;
import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Instagram, Mail } from "lucide-react";

import mascotImage from "/lovable-uploads/Vector.png";
import nnLogo from "@/assets/nn-logo.svg";
import splash1 from "@/assets/splash1.svg";
import splash2 from "@/assets/splash2.svg";

const LAUNCH_DATE = new Date("2026-03-30T00:00:00");
const START_DATE = new Date("2026-01-29T00:00:00");
const TOTAL_STEPS = 8;

const useCountdown = () => {
  const [timeLeft, setTimeLeft] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const tick = () => {
      const now = new Date();
      const diff = LAUNCH_DATE.getTime() - now.getTime();
      if (diff > 0) {
        setTimeLeft({
          days: Math.floor(diff / 86400000),
          hours: Math.floor((diff / 3600000) % 24),
          minutes: Math.floor((diff / 60000) % 60),
          seconds: Math.floor((diff / 1000) % 60),
        });
        const total = LAUNCH_DATE.getTime() - START_DATE.getTime();
        const elapsed = now.getTime() - START_DATE.getTime();
        setProgress(Math.min(Math.max((elapsed / total) * 100, 0), 100));
      } else {
        setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0 });
        setProgress(100);
      }
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  return { timeLeft, progress };
};

const Staircase = ({ progress }: { progress: number }) => {
  const stepIndex = Math.min(Math.floor((progress / 100) * TOTAL_STEPS), TOTAL_STEPS - 1);

  return (
    <div className="relative w-full h-full">
      {/* Steps */}
      {Array.from({ length: TOTAL_STEPS }).map((_, i) => {
        const x = (i / TOTAL_STEPS) * 100;
        const y = 100 - ((i + 1) / TOTAL_STEPS) * 100;
        return (
          <div
            key={i}
            className="absolute"
            style={{
              left: `${x}%`,
              bottom: `${100 - y - (100 / TOTAL_STEPS)}%`,
              width: `${100 / TOTAL_STEPS}%`,
              height: `${100 / TOTAL_STEPS}%`,
            }}
          >
            {/* Vertical riser */}
            <div
              className="absolute right-0 w-1 bg-gradient-to-b from-nn-purple-neon to-nn-blue-neon opacity-60"
              style={{ bottom: 0, height: "100%" }}
            />
            {/* Horizontal tread */}
            <div
              className="absolute bottom-0 left-0 h-1 bg-gradient-to-r from-nn-purple-neon to-nn-blue-neon opacity-60"
              style={{ width: "100%" }}
            />
            {/* Step surface glow */}
            <div
              className={`absolute bottom-0 left-0 w-full h-full transition-opacity duration-500 ${
                i <= stepIndex ? "opacity-20" : "opacity-5"
              }`}
              style={{
                background: i <= stepIndex
                  ? "linear-gradient(135deg, hsl(270 100% 65% / 0.3), hsl(210 100% 55% / 0.1))"
                  : "linear-gradient(135deg, hsl(260 15% 18% / 0.5), transparent)",
              }}
            />
          </div>
        );
      })}

      {/* Mascot */}
      <motion.div
        className="absolute z-10"
        style={{
          left: `${(stepIndex / TOTAL_STEPS) * 100 + (100 / TOTAL_STEPS) / 2 - 8}%`,
          bottom: `${((stepIndex + 1) / TOTAL_STEPS) * 100}%`,
        }}
        animate={{ y: [0, -12, 0] }}
        transition={{ duration: 0.5, repeat: Infinity, ease: "easeInOut" }}
      >
        <div className="absolute inset-0 blur-xl bg-nn-green-neon opacity-40 rounded-full scale-150" />
        <img
          src={mascotImage}
          alt="Mascote Nada Normal"
          className="relative w-14 h-14 md:w-20 md:h-20 object-contain drop-shadow-[0_0_20px_hsl(140,100%,55%,0.7)]"
        />
      </motion.div>
    </div>
  );
};

const CountdownButton = ({ timeLeft }: { timeLeft: { days: number; hours: number; minutes: number; seconds: number } }) => {
  const pad = (n: number) => String(n).padStart(2, "0");
  return (
    <div className="flex flex-col items-center gap-1">
      <span className="font-display text-xs md:text-sm text-nn-yellow tracking-widest glow-text-yellow">
        NÃO APERTE AQUI ⚠️
      </span>
      <div className="bg-nn-yellow text-nn-black border-4 border-nn-black font-display px-4 py-2 md:px-8 md:py-3 shadow-brutal cursor-pointer hover:translate-x-1 hover:translate-y-1 hover:shadow-none transition-all duration-200 rounded-[10px_30px_10px_30px]">
        <span className="text-lg md:text-2xl tracking-wider">
          {pad(timeLeft.days)}:{pad(timeLeft.hours)}:{pad(timeLeft.minutes)}:{pad(timeLeft.seconds)}
        </span>
      </div>
    </div>
  );
};

const SocialLinks = () => (
  <div className="flex gap-3">
    <a
      href="https://instagram.com/nadanormal"
      target="_blank"
      rel="noopener noreferrer"
      className="w-10 h-10 bg-card border-2 border-nn-purple-neon flex items-center justify-center hover:bg-nn-purple-neon hover:text-background transition-all duration-300 shadow-neon-purple"
    >
      <Instagram className="w-5 h-5" />
    </a>
    <a
      href="https://tiktok.com/@nadanormal"
      target="_blank"
      rel="noopener noreferrer"
      className="w-10 h-10 bg-card border-2 border-nn-blue-neon flex items-center justify-center hover:bg-nn-blue-neon hover:text-background transition-all duration-300 shadow-neon-blue"
    >
      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
        <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z" />
      </svg>
    </a>
    <a
      href="mailto:contato@nadanormal.com"
      className="w-10 h-10 bg-card border-2 border-nn-green-neon flex items-center justify-center hover:bg-nn-green-neon hover:text-background transition-all duration-300 shadow-neon-green"
    >
      <Mail className="w-5 h-5" />
    </a>
  </div>
);

const ComingSoon = () => {
  const { timeLeft, progress } = useCountdown();

  return (
    <div className="h-screen bg-background overflow-hidden relative flex flex-col">
      {/* Splashes decorativos */}
      <img
        src={splash1}
        alt=""
        className="absolute bottom-0 left-0 w-48 md:w-72 lg:w-96 opacity-30 pointer-events-none"
        style={{ filter: "hue-rotate(90deg) saturate(2)" }}
      />
      <img
        src={splash2}
        alt=""
        className="absolute bottom-0 right-0 w-48 md:w-72 lg:w-96 opacity-30 pointer-events-none"
        style={{ filter: "hue-rotate(270deg) saturate(2)" }}
      />

      {/* Top bar */}
      <div className="relative z-10 flex items-center justify-between px-4 md:px-8 pt-4 md:pt-6">
        {/* "NADA NORMAL" invertido decorativo */}
        <span
          className="font-display text-sm md:text-lg text-muted-foreground tracking-[0.3em] opacity-40"
          style={{ transform: "rotate(180deg)" }}
        >
          NADA NORMAL
        </span>
        {/* Logo */}
        <motion.img
          src={nnLogo}
          alt="Nada Normal"
          className="w-16 md:w-24"
          initial={{ opacity: 0, y: -30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        />
      </div>

      {/* Main content */}
      <div className="relative z-10 flex-1 flex flex-col lg:flex-row items-start px-4 md:px-8 lg:px-16 gap-4 lg:gap-0">
        {/* Left: Title + Manifesto */}
        <div className="flex-1 flex flex-col justify-center pt-4 lg:pt-0">
          <motion.h1
            className="font-display text-5xl md:text-7xl lg:text-9xl text-foreground leading-[0.9] mb-4"
            initial={{ opacity: 0, x: -50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.7, delay: 0.2 }}
          >
            LANÇAMENTO
            <br />
            <span className="text-gradient-neon">EM BREVE</span>
          </motion.h1>

          <motion.p
            className="font-body text-sm md:text-base text-muted-foreground max-w-md leading-relaxed"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6 }}
          >
            Ser normal nunca mudou nada. Aqui, o conforto acaba. A aprovação não importa.
            E o automático não entra. Nada aqui foi criado pra pessoas normais, e isso é
            exatamente o ponto. <span className="text-nn-purple-neon font-semibold">Nada Normal</span>, em breve.
          </motion.p>
        </div>

        {/* Right: Staircase */}
        <motion.div
          className="flex-1 w-full h-48 md:h-64 lg:h-full relative"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8, delay: 0.4 }}
        >
          <Staircase progress={progress} />
        </motion.div>
      </div>

      {/* Bottom bar */}
      <div className="relative z-10 flex items-end justify-between px-4 md:px-8 pb-4 md:pb-6">
        {/* Decorative text */}
        <div className="flex flex-col gap-1">
          <span className="font-display text-xs md:text-sm text-nn-green-neon tracking-widest glow-text-green">
            /1 O BAGULHO
          </span>
          <span className="font-display text-xs md:text-sm text-nn-green-neon tracking-widest glow-text-green">
            AQUI É LOKO
          </span>
        </div>

        {/* Social links */}
        <div className="hidden md:flex">
          <SocialLinks />
        </div>

        {/* Countdown */}
        <CountdownButton timeLeft={timeLeft} />
      </div>

      {/* Mobile social links */}
      <div className="relative z-10 flex md:hidden justify-center pb-3">
        <SocialLinks />
      </div>
    </div>
  );
};

export default ComingSoon;

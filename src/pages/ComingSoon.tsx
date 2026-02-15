import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Instagram, Mail } from "lucide-react";

import nnLogo from "@/assets/nn-logo.svg";
import { FireEffect } from "@/components/coming-soon/FireEffect";
import { Staircase3D, TOTAL_STEPS } from "@/components/coming-soon/Staircase3D";

const LAUNCH_DATE = new Date("2026-03-30T00:00:00");
const START_DATE = new Date("2026-01-29T00:00:00");
const TOTAL_DAYS = Math.ceil((LAUNCH_DATE.getTime() - START_DATE.getTime()) / 86400000);

const useCountdown = () => {
  const [timeLeft, setTimeLeft] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });

  useEffect(() => {
    const tick = () => {
      const diff = LAUNCH_DATE.getTime() - Date.now();
      if (diff > 0) {
        setTimeLeft({
          days: Math.floor(diff / 86400000),
          hours: Math.floor((diff / 3600000) % 24),
          minutes: Math.floor((diff / 60000) % 60),
          seconds: Math.floor((diff / 1000) % 60),
        });
      } else {
        setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0 });
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

  const daysElapsed = TOTAL_DAYS - timeLeft.days;
  const climbedSteps = Math.min(Math.max(Math.ceil((daysElapsed / TOTAL_DAYS) * TOTAL_STEPS), 0), TOTAL_STEPS);

  return (
    <div className="h-screen bg-background overflow-hidden relative flex flex-col">
      {/* Fire effects */}
      <FireEffect side="left" />
      <FireEffect side="right" />

      {/* Top bar */}
      <div className="relative z-10 flex items-center justify-between px-4 md:px-8 pt-4 md:pt-6">
        <span
          className="font-display text-sm md:text-lg text-muted-foreground tracking-[0.3em] opacity-40"
          style={{ transform: "rotate(180deg)" }}
        >
          NADA NORMAL
        </span>
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
            className="text-5xl md:text-7xl lg:text-9xl leading-[0.9] mb-4 text-gradient-neon"
            style={{ fontFamily: "'Permanent Marker', cursive" }}
            initial={{ opacity: 0, x: -50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.7, delay: 0.2 }}
          >
            LANÇAMENTO
            <br />
            EM BREVE
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

        {/* Right: 3D Staircase */}
        <motion.div
          className="flex-1 w-full h-48 md:h-64 lg:h-full relative"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8, delay: 0.4 }}
        >
          <Staircase3D climbedSteps={climbedSteps} />
        </motion.div>
      </div>

      {/* Bottom bar */}
      <div className="relative z-10 flex items-end justify-between px-4 md:px-8 pb-4 md:pb-6">
        {/* Social links */}
        <div className="hidden md:flex gap-3">
          <a href="https://instagram.com/nadanormal" target="_blank" rel="noopener noreferrer"
            className="w-10 h-10 bg-card border-2 border-nn-purple-neon flex items-center justify-center hover:bg-nn-purple-neon hover:text-background transition-all duration-300 shadow-neon-purple">
            <Instagram className="w-5 h-5" />
          </a>
          <a href="https://tiktok.com/@nadanormal" target="_blank" rel="noopener noreferrer"
            className="w-10 h-10 bg-card border-2 border-nn-blue-neon flex items-center justify-center hover:bg-nn-blue-neon hover:text-background transition-all duration-300 shadow-neon-blue">
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z" />
            </svg>
          </a>
          <a href="mailto:contato@nadanormal.com"
            className="w-10 h-10 bg-card border-2 border-nn-green-neon flex items-center justify-center hover:bg-nn-green-neon hover:text-background transition-all duration-300 shadow-neon-green">
            <Mail className="w-5 h-5" />
          </a>
        </div>

        {/* Countdown button */}
        <div
          className="cursor-pointer hover:translate-x-1 hover:translate-y-1 hover:shadow-none transition-all duration-200"
          style={{
            background: "hsl(54 100% 55%)",
            border: "3px solid hsl(0 0% 5%)",
            borderRadius: "10px 30px 10px 30px",
            padding: "12px 24px",
            boxShadow: "4px 4px 0 hsl(0 0% 5%)",
          }}
        >
          <span className="font-display text-xs md:text-sm tracking-widest block" style={{ color: "hsl(0 0% 5%)" }}>
            NÃO APERTE AQUI
          </span>
          <span className="font-display text-lg md:text-2xl tracking-wider block" style={{ color: "hsl(0 0% 5%)" }}>
            {pad(timeLeft.days)}:{pad(timeLeft.hours)}:{pad(timeLeft.minutes)}:{pad(timeLeft.seconds)}
          </span>
        </div>
      </div>

      {/* Mobile social links */}
      <div className="relative z-10 flex md:hidden justify-center pb-3 gap-3">
        <a href="https://instagram.com/nadanormal" target="_blank" rel="noopener noreferrer"
          className="w-10 h-10 bg-card border-2 border-nn-purple-neon flex items-center justify-center hover:bg-nn-purple-neon hover:text-background transition-all duration-300 shadow-neon-purple">
          <Instagram className="w-5 h-5" />
        </a>
        <a href="https://tiktok.com/@nadanormal" target="_blank" rel="noopener noreferrer"
          className="w-10 h-10 bg-card border-2 border-nn-blue-neon flex items-center justify-center hover:bg-nn-blue-neon hover:text-background transition-all duration-300 shadow-neon-blue">
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
            <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z" />
          </svg>
        </a>
        <a href="mailto:contato@nadanormal.com"
          className="w-10 h-10 bg-card border-2 border-nn-green-neon flex items-center justify-center hover:bg-nn-green-neon hover:text-background transition-all duration-300 shadow-neon-green">
          <Mail className="w-5 h-5" />
        </a>
      </div>
    </div>
  );
};

export default ComingSoon;

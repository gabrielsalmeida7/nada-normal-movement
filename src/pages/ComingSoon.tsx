import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Instagram, Facebook, Twitter, Hourglass } from "lucide-react";

import mascotImage from "@/assets/mascot-nada-normal.png";
import fireOverlay from "@/assets/fire-overlay.png";

const LAUNCH_DATE = new Date("2026-03-30T00:00:00");
const START_DATE = new Date("2026-01-29T00:00:00");

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

/* 3D Staircase using SVG - wider solid steps like the Canva reference */
const Staircase = () => {
  const steps = 16;
  const w = 600;
  const h = 600;
  const stepW = w / steps;
  const stepH = h / steps;
  const treadH = stepH * 0.4;
  const riserH = stepH * 0.6;

  return (
    <div className="absolute z-10" style={{ bottom: "18%", left: "32%", width: "58%", height: "70%" }}>
      <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-full" preserveAspectRatio="xMidYMid meet">
        {Array.from({ length: steps }).map((_, i) => {
          const x = i * stepW;
          const topY = h - (i + 1) * stepH;

          return (
            <g key={i}>
              {/* Tread (top face - lighter) */}
              <rect x={x} y={topY} width={stepW + 0.5} height={treadH} fill="#b8b8b8" />
              <line x1={x} y1={topY} x2={x + stepW} y2={topY} stroke="#d0d0d0" strokeWidth={1} />
              {/* Riser (front face - darker) */}
              <rect x={x} y={topY + treadH} width={stepW + 0.5} height={riserH} fill="#757575" />
              <line x1={x} y1={topY + treadH} x2={x + stepW} y2={topY + treadH} stroke="#999" strokeWidth={0.5} />
            </g>
          );
        })}
      </svg>
    </div>
  );
};

const ComingSoon = () => {
  const { timeLeft } = useCountdown();
  const pad = (n: number) => String(n).padStart(2, "0");

  return (
    <div className="h-screen bg-[hsl(0,0%,2%)] overflow-hidden relative flex flex-col">
      {/* Top right - "NADA NORMAL" upside down + Hourglass */}
      <div className="absolute top-4 right-4 md:top-8 md:right-8 z-20 flex flex-col items-center gap-2">
        <span
          className="font-display text-xs md:text-sm text-foreground tracking-[0.3em] opacity-70"
          style={{ transform: "rotate(180deg)", textTransform: "uppercase" }}
        >
          NADA NORMAL
        </span>
        <Hourglass className="w-12 h-12 md:w-20 md:h-20 text-foreground" strokeWidth={1.5} />
      </div>

      {/* Title area */}
      <div className="relative z-10 flex-1 flex flex-col justify-center px-6 md:px-12 lg:px-16 pt-8">
        <motion.h1
          className="text-5xl md:text-7xl lg:text-[8rem] text-foreground leading-[0.95] font-bold mb-6"
          style={{ fontFamily: "'Bebas Neue', sans-serif", letterSpacing: "0.02em", textTransform: "none" }}
          initial={{ opacity: 0, x: -50 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.7, delay: 0.2 }}
        >
          Lançamento
          <br />
          em Breve
        </motion.h1>

        <motion.p
          className="text-sm md:text-base text-muted-foreground max-w-lg leading-relaxed"
          style={{ fontFamily: "var(--font-body)", textTransform: "none" }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
        >
          Ser normal nunca mudou nada. Aqui, o conforto acaba. A aprovação não importa. E o automático não
          entra. Nada aqui foi criado pra pessoas normais, e isso é exatamente o ponto. Nada Normal, em breve.
        </motion.p>
      </div>

      {/* 3D Staircase */}
      <Staircase />

      {/* Mascot at bottom of staircase - big and visible */}
      <motion.img
        src={mascotImage}
        alt="Mascote Nada Normal"
        className="absolute z-30 w-32 h-32 md:w-44 md:h-44 lg:w-56 lg:h-56 object-contain drop-shadow-[0_0_20px_rgba(0,0,0,0.8)]"
        style={{
          left: "42%",
          bottom: "14%",
          transform: "translateX(-50%)",
        }}
        animate={{ y: [0, -6, 0] }}
        transition={{ duration: 0.6, repeat: Infinity, ease: "easeInOut" }}
      />

      {/* Fire overlay with fade mask at top */}
      <div 
        className="absolute bottom-0 left-0 w-full z-20 pointer-events-none" 
        style={{ 
          height: "45%",
          WebkitMaskImage: "linear-gradient(to top, black 50%, transparent 100%)",
          maskImage: "linear-gradient(to top, black 50%, transparent 100%)",
        }}
      >
        <motion.img
          src={fireOverlay}
          alt=""
          className="w-full h-full object-cover object-bottom"
          style={{ mixBlendMode: "screen" }}
          animate={{ 
            scale: [1, 1.02, 1],
            opacity: [0.85, 1, 0.85],
          }}
          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
        />
      </div>

      {/* Bottom bar */}
      <div className="absolute bottom-4 md:bottom-6 left-0 right-0 z-40 flex items-end justify-between px-6 md:px-12">
        {/* Left: "O BAGUI AQUI É LOKO" + social */}
        <div className="flex flex-col gap-1">
          <span className="font-display text-xs md:text-sm text-nn-yellow tracking-widest" style={{ textTransform: "uppercase" }}>
            O BAGUI
          </span>
          <span className="font-display text-xs md:text-sm text-nn-yellow tracking-widest" style={{ textTransform: "uppercase" }}>
            AQUI É LOKO
          </span>
          <div className="flex items-center gap-3 mt-2">
            <div className="h-[1px] w-12 md:w-20 bg-muted-foreground" />
            <div className="flex gap-3">
              <a href="https://facebook.com/nadanormal" target="_blank" rel="noopener noreferrer"
                className="text-nn-yellow hover:text-foreground transition-colors">
                <Facebook className="w-5 h-5" />
              </a>
              <a href="https://twitter.com/nadanormal" target="_blank" rel="noopener noreferrer"
                className="text-nn-yellow hover:text-foreground transition-colors">
                <Twitter className="w-5 h-5" />
              </a>
              <a href="https://instagram.com/nadanormal" target="_blank" rel="noopener noreferrer"
                className="text-nn-yellow hover:text-foreground transition-colors">
                <Instagram className="w-5 h-5" />
              </a>
            </div>
          </div>
        </div>

        {/* Right: CTA Button with countdown */}
        <div className="flex flex-col items-center gap-1">
          <button className="bg-nn-yellow text-nn-black border-2 border-nn-black font-display px-6 py-3 md:px-10 md:py-4 cursor-pointer hover:translate-x-1 hover:translate-y-1 hover:shadow-none transition-all duration-200 text-base md:text-xl tracking-wider shadow-brutal"
            style={{ textTransform: "uppercase" }}>
            NÃO APERTE AQUI
          </button>
          <span className="font-display text-xs md:text-sm text-muted-foreground tracking-widest mt-1"
            style={{ textTransform: "none" }}>
            {pad(timeLeft.days)}:{pad(timeLeft.hours)}:{pad(timeLeft.minutes)}:{pad(timeLeft.seconds)}
          </span>
        </div>
      </div>
    </div>
  );
};

export default ComingSoon;

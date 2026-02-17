import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Instagram, Mail, Hourglass, Facebook, Twitter } from "lucide-react";
import mascotImage from "/lovable-uploads/Vector.png";
import nnLogo from "@/assets/nn-logo.svg";

const LAUNCH_DATE = new Date("2026-03-30T00:00:00");
const START_DATE = new Date("2026-01-29T00:00:00");
const TOTAL_DAYS = Math.ceil((LAUNCH_DATE.getTime() - START_DATE.getTime()) / 86400000);

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

/* ── Fire Effect ── */
const FireEffect = ({ side }: { side: "left" | "right" }) => {
  const flames = [
    { w: 80, h: 120, delay: 0, dur: 0.4, br: "60% 40% 30% 70% / 60% 30% 70% 40%", x: 10 },
    { w: 60, h: 150, delay: 0.15, dur: 0.5, br: "40% 60% 60% 40% / 70% 30% 70% 30%", x: 30 },
    { w: 90, h: 100, delay: 0.3, dur: 0.35, br: "30% 70% 70% 30% / 30% 60% 40% 70%", x: -5 },
    { w: 50, h: 130, delay: 0.1, dur: 0.45, br: "70% 30% 50% 50% / 30% 60% 40% 70%", x: 50 },
    { w: 70, h: 90, delay: 0.25, dur: 0.55, br: "50% 50% 40% 60% / 40% 60% 40% 60%", x: 20 },
  ];

  return (
    <div
      className="absolute bottom-0 w-40 h-56 md:w-56 md:h-72 lg:w-72 lg:h-96 pointer-events-none"
      style={{ [side]: 0, zIndex: 5 }}
    >
      {flames.map((f, i) => (
        <div
          key={i}
          className="absolute bottom-0"
          style={{
            left: `${f.x}%`,
            width: f.w,
            height: f.h,
            borderRadius: f.br,
            background: `linear-gradient(0deg, hsl(25 100% 55% / 0.9), hsl(45 100% 55% / 0.7), hsl(54 100% 60% / 0.3))`,
            filter: "blur(10px)",
            mixBlendMode: "screen",
            animation: `fireFlicker ${f.dur}s ${f.delay}s ease-in-out infinite alternate, fireSway ${1 + f.delay}s ${f.delay}s ease-in-out infinite alternate`,
          }}
        />
      ))}
      {/* Core bright flame */}
      <div
        className="absolute bottom-0 left-1/4"
        style={{
          width: 50,
          height: 100,
          borderRadius: "50% 50% 30% 70% / 60% 40% 60% 40%",
          background: "linear-gradient(0deg, hsl(25 100% 55%), hsl(45 100% 65%), hsl(54 100% 80% / 0.8))",
          filter: "blur(6px)",
          mixBlendMode: "screen",
          animation: "fireFlicker 0.3s ease-in-out infinite alternate",
        }}
      />
    </div>
  );
};

/* ── 3D Staircase ── */
const Staircase3D = ({ progress }: { progress: number }) => {
  const totalSteps = 18;
  const climbedSteps = Math.floor((progress / 100) * totalSteps);

  return (
    <div className="absolute inset-0 overflow-hidden">
      {Array.from({ length: totalSteps }).map((_, i) => {
        const stepW = 55;
        const stepH = 18;
        // Diagonal from bottom-center to top-right
        const xStart = 25;
        const yStart = 5;
        const xStep = (75 - xStart) / totalSteps;
        const yStep = (95 - yStart) / totalSteps;
        const x = xStart + i * xStep;
        const y = yStart + i * yStep;
        const isClimbed = i < climbedSteps;

        return (
          <div key={i} className="absolute" style={{ left: `${x}%`, bottom: `${y}%` }}>
            {/* Tread (horizontal face) */}
            <div
              style={{
                width: stepW,
                height: stepH,
                background: isClimbed
                  ? "linear-gradient(135deg, hsl(0 0% 75%), hsl(0 0% 60%))"
                  : "linear-gradient(135deg, hsl(0 0% 50%), hsl(0 0% 38%))",
                borderRadius: "2px",
                boxShadow: isClimbed
                  ? "0 2px 8px hsl(270 100% 65% / 0.3)"
                  : "0 1px 3px hsl(0 0% 0% / 0.3)",
              }}
            />
            {/* Riser (vertical face) */}
            <div
              style={{
                width: stepW,
                height: 12,
                marginTop: -1,
                background: isClimbed
                  ? "linear-gradient(180deg, hsl(0 0% 55%), hsl(0 0% 40%))"
                  : "linear-gradient(180deg, hsl(0 0% 35%), hsl(0 0% 22%))",
                borderRadius: "0 0 2px 2px",
              }}
            />
          </div>
        );
      })}

      {/* Mascot on the staircase */}
      <MascotOnStairs climbedSteps={climbedSteps} totalSteps={totalSteps} progress={progress} />
    </div>
  );
};

/* ── Mascot ── */
const MascotOnStairs = ({
  climbedSteps,
  totalSteps,
  progress,
}: {
  climbedSteps: number;
  totalSteps: number;
  progress: number;
}) => {
  const xStart = 25;
  const yStart = 5;
  const xStep = (75 - xStart) / totalSteps;
  const yStep = (95 - yStart) / totalSteps;

  const step = Math.min(climbedSteps, totalSteps - 1);
  const mascotX = xStart + step * xStep;
  const mascotY = yStart + step * yStep + 4;

  const isAtTop = progress >= 100;

  return (
    <motion.div
      className="absolute z-10"
      style={{
        left: `${mascotX}%`,
        bottom: `${mascotY}%`,
        transform: "translateX(-50%)",
      }}
      animate={
        isAtTop
          ? { x: [0, 100, 200], y: [0, -80, 50], rotate: [0, -20, 15], scale: [1, 1.2, 0.8] }
          : { y: [0, -8, 0] }
      }
      transition={
        isAtTop
          ? { duration: 1.2, ease: "easeInOut", repeat: Infinity, repeatDelay: 2 }
          : { duration: 0.6, repeat: Infinity, ease: "easeInOut" }
      }
    >
      <div className="absolute inset-0 blur-xl rounded-full scale-[2]" style={{ background: "hsl(140 100% 55% / 0.5)" }} />
      <img
        src={mascotImage}
        alt="Mascote subindo a escada"
        className="relative w-10 h-10 md:w-14 md:h-14 object-contain"
        style={{ filter: "drop-shadow(0 0 20px hsl(140 100% 55% / 0.8))" }}
      />
    </motion.div>
  );
};

/* ── Countdown Button ── */
const CountdownButton = ({ timeLeft }: { timeLeft: { days: number; hours: number; minutes: number; seconds: number } }) => {
  const pad = (n: number) => String(n).padStart(2, "0");
  return (
    <div
      className="font-display px-6 py-3 md:px-10 md:py-4 cursor-pointer hover:translate-x-1 hover:translate-y-1 hover:shadow-none transition-all duration-200"
      style={{
        background: "hsl(54 100% 55%)",
        color: "hsl(0 0% 5%)",
        border: "4px solid hsl(0 0% 5%)",
        borderRadius: "10px 30px 10px 30px",
        boxShadow: "4px 4px 0 hsl(0 0% 5%)",
      }}
    >
      <div className="text-sm md:text-base font-bold tracking-wider mb-1">NÃO APERTE AQUI ⚠️</div>
      <div className="text-xl md:text-3xl tracking-widest">
        {pad(timeLeft.days)}:{pad(timeLeft.hours)}:{pad(timeLeft.minutes)}:{pad(timeLeft.seconds)}
      </div>
    </div>
  );
};

/* ── Social Links ── */
const SocialLinks = () => (
  <div className="flex gap-3">
    <a href="https://facebook.com/nadanormal" target="_blank" rel="noopener noreferrer"
      className="w-9 h-9 border-2 flex items-center justify-center transition-all duration-300 hover:scale-110"
      style={{ borderColor: "hsl(270 100% 65%)", color: "hsl(0 0% 98%)" }}
    >
      <Facebook className="w-4 h-4" />
    </a>
    <a href="https://twitter.com/nadanormal" target="_blank" rel="noopener noreferrer"
      className="w-9 h-9 border-2 flex items-center justify-center transition-all duration-300 hover:scale-110"
      style={{ borderColor: "hsl(210 100% 55%)", color: "hsl(0 0% 98%)" }}
    >
      <Twitter className="w-4 h-4" />
    </a>
    <a href="https://instagram.com/nadanormal" target="_blank" rel="noopener noreferrer"
      className="w-9 h-9 border-2 flex items-center justify-center transition-all duration-300 hover:scale-110"
      style={{ borderColor: "hsl(330 100% 60%)", color: "hsl(0 0% 98%)" }}
    >
      <Instagram className="w-4 h-4" />
    </a>
    <a href="mailto:contato@nadanormal.com"
      className="w-9 h-9 border-2 flex items-center justify-center transition-all duration-300 hover:scale-110"
      style={{ borderColor: "hsl(140 100% 55%)", color: "hsl(0 0% 98%)" }}
    >
      <Mail className="w-4 h-4" />
    </a>
  </div>
);

/* ── Main Page ── */
const ComingSoon = () => {
  const { timeLeft, progress } = useCountdown();

  return (
    <div className="h-screen bg-background overflow-hidden relative flex flex-col">
      {/* Fire CSS keyframes */}
      <style>{`
        @keyframes fireFlicker {
          0% { opacity: 0.6; transform: scaleY(1); }
          50% { opacity: 1; transform: scaleY(1.15); }
          100% { opacity: 0.7; transform: scaleY(0.95); }
        }
        @keyframes fireSway {
          0% { transform: translateX(-3px) rotate(-2deg); }
          100% { transform: translateX(3px) rotate(2deg); }
        }
      `}</style>

      {/* Fire effects */}
      <FireEffect side="left" />
      <FireEffect side="right" />

      {/* Top bar */}
      <div className="relative z-10 flex items-start justify-between px-4 md:px-8 pt-4 md:pt-6">
        {/* Logo */}
        <motion.img
          src={nnLogo}
          alt="Nada Normal"
          className="w-14 md:w-20"
          initial={{ opacity: 0, y: -30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        />

        {/* Right side: inverted text + hourglass */}
        <div className="flex flex-col items-end gap-2">
          <span
            className="font-display text-xs md:text-sm text-muted-foreground tracking-[0.3em] opacity-40"
            style={{ transform: "rotate(180deg)" }}
          >
            NADA NORMAL
          </span>
          <Hourglass className="w-10 h-10 md:w-16 md:h-16 text-muted-foreground opacity-30" />
        </div>
      </div>

      {/* Main content */}
      <div className="relative z-10 flex-1 flex flex-col lg:flex-row items-start px-4 md:px-8 lg:px-16 gap-4">
        {/* Left: Title + Manifesto */}
        <div className="flex-1 flex flex-col justify-center pt-2 lg:pt-0">
          <motion.h1
            className="text-4xl md:text-6xl lg:text-8xl leading-[0.9] mb-4 text-gradient-neon"
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
            className="font-body text-xs md:text-sm text-muted-foreground max-w-md leading-relaxed"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6 }}
          >
            Ser normal nunca mudou nada. Aqui, o conforto acaba. A aprovação não importa.
            E o automático não entra. Nada aqui foi criado pra pessoas normais, e isso é
            exatamente o ponto. <span className="text-primary font-semibold">Nada Normal</span>, em breve.
          </motion.p>
        </div>

        {/* Right: 3D Staircase */}
        <motion.div
          className="flex-1 w-full h-48 md:h-64 lg:h-full relative"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8, delay: 0.4 }}
        >
          <Staircase3D progress={progress} />
        </motion.div>
      </div>

      {/* Bottom bar */}
      <div className="relative z-10 flex items-end justify-between px-4 md:px-8 pb-4 md:pb-6">
        {/* Vertical text decoration */}
        <div className="hidden lg:flex flex-col gap-1">
          <span className="font-display text-xs text-muted-foreground tracking-[0.5em] opacity-20 [writing-mode:vertical-lr]">
            NADA NORMAL
          </span>
        </div>

        {/* Social links centered */}
        <div className="flex-1 flex justify-center">
          <SocialLinks />
        </div>

        {/* Countdown button */}
        <CountdownButton timeLeft={timeLeft} />
      </div>
    </div>
  );
};

export default ComingSoon;

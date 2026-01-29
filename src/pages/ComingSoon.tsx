import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Instagram, Mail } from "lucide-react";

// Images
import mascotImage from "/lovable-uploads/Vector.png";

const ComingSoon = () => {
  // Launch date: March 30, 2026
  const launchDate = new Date("2026-03-30T00:00:00");
  // Start date: January 29, 2026 (today as reference)
  const startDate = new Date("2026-01-29T00:00:00");

  const [timeLeft, setTimeLeft] = useState({
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0,
  });
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const calculateTime = () => {
      const now = new Date();
      const difference = launchDate.getTime() - now.getTime();

      if (difference > 0) {
        setTimeLeft({
          days: Math.floor(difference / (1000 * 60 * 60 * 24)),
          hours: Math.floor((difference / (1000 * 60 * 60)) % 24),
          minutes: Math.floor((difference / 1000 / 60) % 60),
          seconds: Math.floor((difference / 1000) % 60),
        });

        // Calculate progress
        const totalDuration = launchDate.getTime() - startDate.getTime();
        const elapsed = now.getTime() - startDate.getTime();
        const currentProgress = Math.min(
          Math.max((elapsed / totalDuration) * 100, 0),
          100
        );
        setProgress(currentProgress);
      } else {
        setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0 });
        setProgress(100);
      }
    };

    calculateTime();
    const timer = setInterval(calculateTime, 1000);

    return () => clearInterval(timer);
  }, []);

  return (
    <div className="min-h-screen bg-background overflow-hidden relative">
      {/* Floating particles background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {[...Array(30)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute w-1 h-1 rounded-full"
            style={{
              background: `hsl(var(--nn-${
                ["purple-neon", "blue-neon", "green-neon"][i % 3]
              }))`,
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
            }}
            animate={{
              y: [0, -30, 0],
              opacity: [0.3, 1, 0.3],
              scale: [1, 1.5, 1],
            }}
            transition={{
              duration: 3 + Math.random() * 2,
              repeat: Infinity,
              delay: Math.random() * 2,
            }}
          />
        ))}
      </div>

      {/* Decorative brand images */}
      <motion.img
        src="/lovable-uploads/MaoNN.png"
        alt=""
        className="absolute top-20 left-4 w-16 md:w-24 opacity-20"
        animate={{ rotate: [0, 10, 0], y: [0, -10, 0] }}
        transition={{ duration: 4, repeat: Infinity }}
      />
      <motion.img
        src="/lovable-uploads/NNRaio.png"
        alt=""
        className="absolute bottom-20 right-4 w-16 md:w-24 opacity-20"
        animate={{ rotate: [0, -10, 0], scale: [1, 1.1, 1] }}
        transition={{ duration: 3, repeat: Infinity }}
      />

      {/* Main content */}
      <div className="relative z-10 min-h-screen flex flex-col items-center justify-center px-4 py-8">
        {/* Logo */}
        <motion.img
          src="/lovable-uploads/ce6d23c5-e49a-4363-9799-40abb2b86648.png"
          alt="Nada Normal"
          className="w-32 md:w-48 mb-6"
          initial={{ opacity: 0, y: -50 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
        />

        {/* Title */}
        <motion.h1
          className="font-display text-4xl md:text-6xl lg:text-8xl text-center mb-2 glitch glow-text"
          data-text="EM BREVE"
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6, delay: 0.3 }}
        >
          <span className="text-gradient-neon">EM BREVE</span>
        </motion.h1>

        <motion.p
          className="font-display text-xl md:text-2xl text-nn-blue-neon mb-8"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
        >
          30/03/2026
        </motion.p>

        {/* Race Track */}
        <motion.div
          className="w-full max-w-4xl mx-auto mb-8 px-4"
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.6 }}
        >
          {/* Track container */}
          <div className="relative h-24 md:h-32">
            {/* Track background */}
            <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-12 md:h-16 bg-muted border-2 border-nn-purple-neon rounded-lg shadow-neon-purple overflow-hidden">
              {/* Track lines */}
              <div className="absolute inset-0 flex items-center">
                <div className="w-full h-1 bg-gradient-to-r from-nn-purple-neon via-nn-blue-neon to-nn-green-neon opacity-30" />
              </div>

              {/* Kilometer markers */}
              {[25, 50, 75].map((marker) => (
                <div
                  key={marker}
                  className="absolute top-0 bottom-0 w-0.5 bg-nn-blue-neon opacity-40"
                  style={{ left: `${marker}%` }}
                />
              ))}

              {/* Progress fill */}
              <motion.div
                className="absolute inset-y-0 left-0 bg-gradient-to-r from-nn-purple-neon/30 to-nn-blue-neon/30"
                initial={{ width: 0 }}
                animate={{ width: `${progress}%` }}
                transition={{ duration: 1 }}
              />
            </div>

            {/* Start marker */}
            <div className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-2">
              <div className="w-4 h-16 md:h-20 bg-nn-green-neon rounded shadow-neon-green" />
              <span className="absolute -bottom-6 left-1/2 -translate-x-1/2 text-xs font-display text-nn-green-neon whitespace-nowrap">
                HOJE
              </span>
            </div>

            {/* Finish line */}
            <div className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-2">
              <div className="w-4 h-16 md:h-20 bg-gradient-to-b from-foreground via-background to-foreground bg-[length:100%_8px] rounded animate-pulse-glow" />
              <span className="absolute -bottom-6 left-1/2 -translate-x-1/2 text-xs font-display text-nn-purple-neon whitespace-nowrap">
                30/03
              </span>
            </div>

            {/* Mascot */}
            <motion.div
              className="absolute top-1/2 -translate-y-[60%] z-10"
              style={{ left: `calc(${progress}% - 32px)` }}
              animate={{
                y: [-2, -8, -2],
              }}
              transition={{
                duration: 0.4,
                repeat: Infinity,
                ease: "easeInOut",
              }}
            >
              {/* Glow effect */}
              <div className="absolute inset-0 blur-xl bg-nn-green-neon opacity-50 rounded-full scale-150" />

              {/* Trail effect */}
              <motion.div
                className="absolute -left-8 top-1/2 -translate-y-1/2 w-16 h-2 bg-gradient-to-l from-nn-green-neon to-transparent opacity-60"
                animate={{ scaleX: [0.5, 1, 0.5], opacity: [0.3, 0.6, 0.3] }}
                transition={{ duration: 0.3, repeat: Infinity }}
              />

              {/* Mascot image */}
              <img
                src={mascotImage}
                alt="Nada Normal Mascot"
                className="relative w-16 h-16 md:w-20 md:h-20 object-contain drop-shadow-[0_0_15px_hsl(var(--nn-green-neon))]"
              />
            </motion.div>
          </div>
        </motion.div>

        {/* Countdown */}
        <motion.div
          className="grid grid-cols-4 gap-2 md:gap-4 mb-8"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.8 }}
        >
          {[
            { label: "DIAS", value: timeLeft.days },
            { label: "HORAS", value: timeLeft.hours },
            { label: "MIN", value: timeLeft.minutes },
            { label: "SEG", value: timeLeft.seconds },
          ].map((item, index) => (
            <motion.div
              key={item.label}
              className="flex flex-col items-center"
              animate={
                item.label === "SEG" ? { scale: [1, 1.02, 1] } : undefined
              }
              transition={
                item.label === "SEG"
                  ? { duration: 1, repeat: Infinity }
                  : undefined
              }
            >
              <div className="w-16 h-16 md:w-24 md:h-24 bg-card border-2 border-nn-purple-neon flex items-center justify-center shadow-neon-purple">
                <span className="font-display text-2xl md:text-4xl text-gradient-neon">
                  {String(item.value).padStart(2, "0")}
                </span>
              </div>
              <span className="font-display text-xs md:text-sm text-muted-foreground mt-2">
                {item.label}
              </span>
            </motion.div>
          ))}
        </motion.div>

        {/* Manifesto */}
        <motion.p
          className="font-display text-lg md:text-2xl text-center text-nn-blue-neon mb-8 glow-text-blue"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1 }}
        >
          "ONDE A SUA LOUCURA FAZ SENTIDO"
        </motion.p>

        {/* Social Links */}
        <motion.div
          className="flex gap-4"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.2 }}
        >
          <a
            href="https://instagram.com/nadanormal"
            target="_blank"
            rel="noopener noreferrer"
            className="w-12 h-12 bg-card border-2 border-nn-purple-neon flex items-center justify-center hover:bg-nn-purple-neon hover:text-background transition-all duration-300 shadow-neon-purple"
          >
            <Instagram className="w-5 h-5" />
          </a>
          <a
            href="https://tiktok.com/@nadanormal"
            target="_blank"
            rel="noopener noreferrer"
            className="w-12 h-12 bg-card border-2 border-nn-blue-neon flex items-center justify-center hover:bg-nn-blue-neon hover:text-background transition-all duration-300 shadow-neon-blue"
          >
            <svg
              className="w-5 h-5"
              fill="currentColor"
              viewBox="0 0 24 24"
            >
              <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z" />
            </svg>
          </a>
          <a
            href="mailto:contato@nadanormal.com"
            className="w-12 h-12 bg-card border-2 border-nn-green-neon flex items-center justify-center hover:bg-nn-green-neon hover:text-background transition-all duration-300 shadow-neon-green"
          >
            <Mail className="w-5 h-5" />
          </a>
        </motion.div>
      </div>
    </div>
  );
};

export default ComingSoon;

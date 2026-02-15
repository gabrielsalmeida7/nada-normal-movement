import { motion } from "framer-motion";
import mascotImage from "/lovable-uploads/Vector.png";

const TOTAL_STEPS = 18;

interface Staircase3DProps {
  climbedSteps: number;
}

export const Staircase3D = ({ climbedSteps }: Staircase3DProps) => {
  const stepW = 38; // px width per step
  const stepH = 22; // px height per step

  return (
    <div className="relative w-full h-full">
      {Array.from({ length: TOTAL_STEPS }).map((_, i) => {
        const isClimbed = i < climbedSteps;
        return (
          <div
            key={i}
            className="absolute"
            style={{
              left: `${i * stepW}px`,
              bottom: `${i * stepH}px`,
            }}
          >
            {/* Tread (horizontal face) */}
            <div
              className="absolute bottom-0 left-0"
              style={{
                width: `${stepW + 2}px`,
                height: `${stepH}px`,
                background: isClimbed
                  ? "linear-gradient(180deg, hsl(0 0% 65%), hsl(0 0% 45%))"
                  : "linear-gradient(180deg, hsl(0 0% 40%), hsl(0 0% 25%))",
                borderTop: "1px solid hsl(0 0% 70%)",
                borderLeft: "1px solid hsl(0 0% 55%)",
              }}
            />
            {/* Riser (vertical face) */}
            <div
              className="absolute left-0"
              style={{
                width: `${stepW + 2}px`,
                height: `${stepH}px`,
                bottom: `-${stepH}px`,
                background: isClimbed
                  ? "linear-gradient(180deg, hsl(0 0% 50%), hsl(0 0% 30%))"
                  : "linear-gradient(180deg, hsl(0 0% 30%), hsl(0 0% 18%))",
                borderBottom: "1px solid hsl(0 0% 15%)",
              }}
            />
          </div>
        );
      })}

      {/* Mascot */}
      <motion.div
        className="absolute z-10"
        style={{
          left: `${(Math.max(climbedSteps, 1) - 0.5) * stepW}px`,
          bottom: `${Math.max(climbedSteps, 1) * stepH + 4}px`,
        }}
        animate={{ y: [0, -12, 0] }}
        transition={{ duration: 0.6, repeat: Infinity, ease: "easeInOut" }}
      >
        <div className="absolute inset-0 blur-xl rounded-full scale-[2]" style={{ background: "hsl(140 100% 55% / 0.5)" }} />
        <img
          src={mascotImage}
          alt="Mascote Nada Normal"
          className="relative w-10 h-10 md:w-14 md:h-14 object-contain"
          style={{ filter: "drop-shadow(0 0 20px hsl(140 100% 55% / 0.8))" }}
        />
      </motion.div>
    </div>
  );
};

export { TOTAL_STEPS };

import { useState, useEffect, useRef } from "react";
import { motion, useSpring } from "framer-motion";
import mascotImage from "@/assets/mascot-running.png";

export const RunningMascot = () => {
  const [isFlipped, setIsFlipped] = useState(false);
  const [isMoving, setIsMoving] = useState(false);
  const lastMouseX = useRef(0);
  const moveTimeout = useRef<NodeJS.Timeout>();
  
  // Springs para movimento suave com efeito de "perseguição"
  const springConfig = { damping: 25, stiffness: 120 };
  const x = useSpring(typeof window !== 'undefined' ? window.innerWidth / 2 - 48 : 0, springConfig);
  const y = useSpring(typeof window !== 'undefined' ? window.innerHeight / 2 - 48 : 0, springConfig);
  
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      // Determina direção do flip baseado na diferença de posição
      const currentX = x.get();
      if (e.clientX > currentX + 30) {
        setIsFlipped(false);
      } else if (e.clientX < currentX - 30) {
        setIsFlipped(true);
      }
      
      // Atualiza posição alvo com offset para ficar atrás do cursor
      x.set(e.clientX - 48);
      y.set(e.clientY - 48);
      
      // Detecta movimento
      if (Math.abs(e.clientX - lastMouseX.current) > 5) {
        setIsMoving(true);
        lastMouseX.current = e.clientX;
        
        // Reset do timeout de movimento
        if (moveTimeout.current) {
          clearTimeout(moveTimeout.current);
        }
        moveTimeout.current = setTimeout(() => {
          setIsMoving(false);
        }, 150);
      }
    };
    
    window.addEventListener("mousemove", handleMouseMove);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      if (moveTimeout.current) {
        clearTimeout(moveTimeout.current);
      }
    };
  }, [x, y]);
  
  return (
    <motion.div
      className="fixed pointer-events-none z-50"
      style={{ x, y }}
    >
      <motion.img
        src={mascotImage}
        alt="Mascote Nada Normal"
        className="w-24 h-auto drop-shadow-[0_0_15px_hsl(270,100%,60%,0.5)]"
        style={{ 
          scaleX: isFlipped ? -1 : 1,
        }}
        animate={{
          y: isMoving ? [0, -10, 0] : 0,
          rotate: isMoving 
            ? (isFlipped ? [-5, 5, -5] : [5, -5, 5])
            : 0,
        }}
        transition={{
          y: { 
            duration: 0.25, 
            repeat: isMoving ? Infinity : 0,
            ease: "easeInOut"
          },
          rotate: { 
            duration: 0.25, 
            repeat: isMoving ? Infinity : 0,
            ease: "easeInOut"
          },
        }}
      />
    </motion.div>
  );
};

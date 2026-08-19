interface ComingSoonStampProps {
  /** sm para cards de produto, lg para cards de categoria */
  size?: "sm" | "lg";
  className?: string;
}

/**
 * Carimbo diagonal "EM BREVE!" usado enquanto a loja não está ativa.
 * Feito 100% em CSS com os tokens da marca.
 */
export const ComingSoonStamp = ({ size = "sm", className = "" }: ComingSoonStampProps) => {
  const sizeClasses =
    size === "lg"
      ? "text-3xl md:text-5xl py-3 md:py-4 tracking-[0.08em]"
      : "text-lg md:text-2xl py-2 tracking-[0.06em]";

  return (
    <div
      className={`pointer-events-none absolute inset-0 z-20 flex items-center justify-center overflow-hidden ${className}`}
      aria-hidden="true"
    >
      <div
        className={`w-[160%] -rotate-[20deg] bg-nn-pink text-center font-display uppercase text-nn-white border-y-4 border-nn-black shadow-[0_8px_24px_hsl(330_100%_60%_/_0.45)] ${sizeClasses}`}
      >
        Em Breve!
      </div>
    </div>
  );
};

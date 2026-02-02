import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap text-sm font-bold uppercase tracking-wider ring-offset-background transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 font-display",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:scale-105 hover:shadow-neon-purple rounded-[20px_5px_20px_5px]",
        destructive: "bg-destructive text-destructive-foreground hover:bg-destructive/90 rounded-[15px_5px_15px_5px]",
        outline: "border-2 border-primary bg-transparent text-primary hover:bg-primary hover:text-primary-foreground rounded-[10px_25px_10px_25px]",
        secondary: "bg-secondary text-secondary-foreground hover:scale-105 hover:shadow-neon-blue rounded-[25px_8px_25px_8px]",
        ghost: "hover:bg-muted hover:text-foreground rounded-[15px_5px_15px_5px]",
        link: "text-primary underline-offset-4 hover:underline",
        // Nada Normal variants - NEON with organic shapes
        hero: "bg-gradient-to-r from-nn-purple-neon to-nn-blue-neon text-nn-black shadow-brutal hover:translate-x-1 hover:translate-y-1 hover:shadow-none border-4 border-nn-black hover:shadow-neon-purple rounded-[10px_30px_10px_30px]",
        chaos: "bg-nn-blue-neon text-nn-black shadow-brutal hover:translate-x-1 hover:translate-y-1 hover:shadow-none border-4 border-nn-black hover:shadow-neon-blue rounded-[30px_8px_30px_8px]",
        fire: "bg-nn-green-neon text-nn-black shadow-brutal hover:translate-x-1 hover:translate-y-1 hover:shadow-none border-4 border-nn-black hover:shadow-neon-green rounded-[8px_25px_35px_10px]",
        neon: "bg-transparent border-2 border-nn-purple-neon text-nn-purple-neon hover:bg-nn-purple-neon hover:text-nn-black animate-pulse-glow rounded-[25px_5px_25px_5px]",
        // V2 High Contrast variants with organic shapes
        heroV2: "bg-gradient-to-r from-nn-orange to-nn-yellow text-nn-black shadow-brutal hover:translate-x-1 hover:translate-y-1 hover:shadow-none border-4 border-nn-black hover:shadow-neon-orange rounded-[15px_40px_15px_40px]",
        chaosV2: "bg-nn-lime text-nn-black shadow-brutal hover:translate-x-1 hover:translate-y-1 hover:shadow-none border-4 border-nn-black hover:shadow-neon-lime rounded-[40px_10px_40px_10px]",
        fireV2: "bg-nn-red text-nn-white shadow-brutal hover:translate-x-1 hover:translate-y-1 hover:shadow-none border-4 border-nn-black hover:shadow-neon-red rounded-[5px_30px_50px_15px]",
        neonV2: "bg-transparent border-2 border-nn-orange text-nn-orange hover:bg-nn-orange hover:text-nn-black animate-pulse-glow rounded-[30px_8px_30px_8px]",
      },
      size: {
        default: "h-12 px-6 py-3",
        sm: "h-10 px-4 py-2",
        lg: "h-14 px-8 py-4 text-lg",
        xl: "h-16 px-10 py-5 text-xl",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />;
  },
);
Button.displayName = "Button";

export { Button, buttonVariants };

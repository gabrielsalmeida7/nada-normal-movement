import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap text-sm font-bold uppercase tracking-wider ring-offset-background transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 font-display",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:scale-105 hover:shadow-neon-pink",
        destructive: "bg-destructive text-destructive-foreground hover:bg-destructive/90",
        outline: "border-2 border-primary bg-transparent text-primary hover:bg-primary hover:text-primary-foreground",
        secondary: "bg-secondary text-secondary-foreground hover:scale-105 hover:shadow-neon-cyan",
        ghost: "hover:bg-muted hover:text-foreground",
        link: "text-primary underline-offset-4 hover:underline",
        // Nada Normal variants
        hero: "bg-gradient-chaos text-primary-foreground shadow-brutal hover:translate-x-1 hover:translate-y-1 hover:shadow-none border-4 border-nn-black",
        chaos: "bg-nn-cyan text-nn-black shadow-brutal hover:translate-x-1 hover:translate-y-1 hover:shadow-none border-4 border-nn-black",
        fire: "bg-nn-yellow text-nn-black shadow-brutal hover:translate-x-1 hover:translate-y-1 hover:shadow-none border-4 border-nn-black",
        neon: "bg-transparent border-2 border-nn-pink text-nn-pink hover:bg-nn-pink hover:text-nn-black animate-pulse-glow",
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

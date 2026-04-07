import type { ReactNode } from "react";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface CardProps {
  children: ReactNode;
  className?: string;
  variant?: "default" | "accent" | "surface";
}

export function Card({ children, className, variant = "default" }: CardProps) {
  const baseClasses = "rounded-geometric-lg border-4 border-text-primary p-6 md:p-8 shadow-solid relative overflow-hidden transition-transform duration-200 hover:-translate-y-1 hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]";

  const variants = {
    default: "bg-white",
    accent: "bg-brand-accent",
    surface: "bg-surface"
  };

  return (
    <div className={cn(baseClasses, variants[variant], className)}>
      {children}
    </div>
  );
}

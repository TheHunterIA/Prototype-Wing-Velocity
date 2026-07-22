import React, { ButtonHTMLAttributes } from "react";

interface SciFiButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "orange" | "danger" | "ghost" | "cyan";
  className?: string;
}

export function SciFiButton({ 
  children, 
  variant = "primary", 
  className = "", 
  ...props 
}: SciFiButtonProps) {
  const baseClasses = "relative overflow-hidden font-medium transition-all duration-500 active:scale-95 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100 flex items-center justify-center gap-2";
  
  const variants = {
    primary: "bg-white text-black hover:bg-zinc-200 shadow-[0_0_15px_rgba(255,255,255,0.3)] hover:shadow-[0_0_25px_rgba(255,255,255,0.5)]",
    orange: "bg-gradient-to-br from-cyan-500 to-teal-500 text-black hover:from-cyan-400 hover:to-teal-400 shadow-[0_0_15px_rgba(34,211,238,0.4)] hover:shadow-[0_0_25px_rgba(34,211,238,0.6)]",
    cyan: "bg-cyan-500 text-black hover:bg-cyan-400 shadow-[0_0_15px_rgba(6,182,212,0.4)] hover:shadow-[0_0_25px_rgba(6,182,212,0.6)]",
    danger: "bg-red-500/10 text-red-500 border border-red-500/50 hover:bg-red-500/20 shadow-[0_0_15px_rgba(239,68,68,0.2)] hover:shadow-[0_0_25px_rgba(239,68,68,0.4)]",
    ghost: "bg-white/5 text-white border border-white/10 hover:bg-white/10 hover:border-white/20"
  };

  return (
    <button 
      className={`${baseClasses} ${variants[variant]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}

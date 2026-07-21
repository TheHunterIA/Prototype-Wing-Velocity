import React, { PropsWithChildren } from "react";
import { motion, HTMLMotionProps } from "motion/react";

interface ModalCardProps extends HTMLMotionProps<"div"> {
  className?: string;
}

export function ModalCard({ children, className = "", ...props }: PropsWithChildren<ModalCardProps>) {
  return (
    <motion.div
      {...props}
      className={`bg-zinc-950/95 border border-white/10 rounded-2xl backdrop-blur-xl shadow-2xl ${className}`}
    >
      {children}
    </motion.div>
  );
}

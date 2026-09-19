"use client";

import { motion, useReducedMotion } from "framer-motion";
import { cn } from "@/lib/utils";

export function PulseDot({ className }: { className?: string }) {
  const prefersReducedMotion = useReducedMotion();

  return (
    <span className="relative flex h-1.5 w-1.5 items-center justify-center">
      {!prefersReducedMotion && (
        <motion.span
          className={cn("absolute inline-flex h-full w-full rounded-full", className)}
          animate={{ scale: [1, 2.4, 1], opacity: [0.6, 0, 0.6] }}
          transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
        />
      )}
      <span className={cn("relative h-1.5 w-1.5 rounded-full", className)} />
    </span>
  );
}

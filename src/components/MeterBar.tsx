"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

export function MeterBar({
  ratio,
  tone = "flame",
  className,
}: {
  /** 0 - 1+ fraction of the limit consumed */
  ratio: number;
  tone?: "flame" | "approve" | "warn" | "block";
  className?: string;
}) {
  const clamped = Math.min(1, Math.max(0, ratio));
  const effectiveTone = ratio >= 1 ? "block" : ratio >= 0.8 ? "warn" : tone;

  const colors: Record<string, string> = {
    flame: "bg-flame",
    approve: "bg-approve",
    warn: "bg-warn",
    block: "bg-block",
  };

  return (
    <div
      className={cn("h-1.5 w-full overflow-hidden rounded-full bg-cream-deep", className)}
      role="progressbar"
      aria-valuenow={Math.round(clamped * 100)}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <motion.div
        className={cn("h-full rounded-full", colors[effectiveTone])}
        initial={{ width: 0 }}
        animate={{ width: `${clamped * 100}%` }}
        transition={{ duration: 0.7, ease: "easeOut" }}
      />
    </div>
  );
}

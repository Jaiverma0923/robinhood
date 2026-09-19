"use client";

import { motion, useReducedMotion } from "framer-motion";

// Slightly different loop timing per card so the three don't drift in sync —
// each one is visibly floating at its own speed.
const FLOAT_CONFIG = [
  { distance: 7, rotate: 0.8, duration: 4.5 },
  { distance: 9, rotate: -1, duration: 5.5 },
  { distance: 6, rotate: 0.9, duration: 6.5 },
];

export function HeroMiniStat({
  label,
  value,
  index = 0,
}: {
  label: string;
  value: string;
  index?: number;
}) {
  const prefersReducedMotion = useReducedMotion();
  const { distance, rotate, duration } = FLOAT_CONFIG[index % FLOAT_CONFIG.length];

  return (
    <motion.div
      className="p-6 text-center sm:text-left"
      animate={
        prefersReducedMotion
          ? undefined
          : { y: [0, -distance, 0], rotate: [0, rotate, 0] }
      }
      transition={{
        duration,
        repeat: Infinity,
        ease: "easeInOut",
        delay: index * 0.4,
      }}
      whileHover={{ y: -8, transition: { duration: 0.25, ease: [0.22, 1, 0.36, 1] } }}
    >
      <p className="text-xs text-ink-faint">{label}</p>
      <motion.p
        className="mt-1.5 font-data text-2xl font-medium text-ink"
        initial={{ opacity: 0, y: 14 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-40px" }}
        transition={{
          duration: 0.5,
          delay: prefersReducedMotion ? 0 : 1.1 + index * 0.12,
          ease: [0.22, 1, 0.36, 1],
        }}
      >
        {value}
      </motion.p>
    </motion.div>
  );
}

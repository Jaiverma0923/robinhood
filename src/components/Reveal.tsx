"use client";

import { motion, useReducedMotion } from "framer-motion";

export function Reveal({
  children,
  delay = 0,
  className,
  y = 18,
  blur = false,
  duration,
  scale,
}: {
  children: React.ReactNode;
  delay?: number;
  className?: string;
  y?: number;
  /** Adds a blur→clear resolve to the entrance, on top of opacity + translateY. */
  blur?: boolean;
  duration?: number;
  /** Optional starting scale (e.g. 0.92) that resolves to 1 as the element enters. */
  scale?: number;
}) {
  const prefersReducedMotion = useReducedMotion();
  const offset = prefersReducedMotion ? 0 : y;
  const startScale = prefersReducedMotion ? 1 : scale ?? 1;

  return (
    <motion.div
      initial={{
        opacity: 0,
        y: offset,
        scale: startScale,
        filter: blur && !prefersReducedMotion ? "blur(8px)" : "blur(0px)",
      }}
      whileInView={{ opacity: 1, y: 0, scale: 1, filter: "blur(0px)" }}
      viewport={{ once: true, margin: "-80px" }}
      transition={{
        duration: prefersReducedMotion ? 0.25 : duration ?? (blur ? 0.85 : 0.6),
        delay: prefersReducedMotion ? 0 : delay,
        ease: [0.22, 1, 0.36, 1],
      }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

export function RevealGroup({
  children,
  className,
  stagger = 0.08,
}: {
  children: React.ReactNode;
  className?: string;
  stagger?: number;
}) {
  return (
    <motion.div
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, margin: "-60px" }}
      variants={{
        hidden: {},
        show: { transition: { staggerChildren: stagger } },
      }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

export const revealItem = {
  hidden: { opacity: 0, y: 18 },
  show: { opacity: 1, y: 0, transition: { duration: 0.55, ease: [0.22, 1, 0.36, 1] as const } },
};

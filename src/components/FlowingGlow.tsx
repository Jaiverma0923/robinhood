"use client";

import { useEffect, useRef, useState } from "react";
import {
  motion,
  useMotionValue,
  useReducedMotion,
  useScroll,
  useSpring,
  useTransform,
} from "framer-motion";

export function FlowingGlow({ className }: { className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const prefersReducedMotion = useReducedMotion();
  const [isCoarsePointer, setIsCoarsePointer] = useState(
    () => typeof window !== "undefined" && window.matchMedia("(pointer: coarse)").matches
  );

  // Background depth layer: the most distant, so it moves the least for the
  // same cursor travel (~5px) — paired with HeroVisual's ~10px middle layer
  // and HeroVisualLayer's ~15px foreground layer.
  const rawX = useMotionValue(0);
  const rawY = useMotionValue(0);
  const springX = useSpring(rawX, { stiffness: 60, damping: 16, mass: 0.7 });
  const springY = useSpring(rawY, { stiffness: 60, damping: 16, mass: 0.7 });
  const BACKGROUND_STRENGTH = 5;
  const parallaxX = useTransform(springX, (v) => v * BACKGROUND_STRENGTH);
  const parallaxY = useTransform(springY, (v) => v * BACKGROUND_STRENGTH);

  useEffect(() => {
    const mq = window.matchMedia("(pointer: coarse)");
    const handler = (e: MediaQueryListEvent) => setIsCoarsePointer(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  useEffect(() => {
    if (prefersReducedMotion || isCoarsePointer) return;

    function handlePointerMove(event: PointerEvent) {
      const el = ref.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const relX = (event.clientX - (rect.left + rect.width / 2)) / (rect.width / 2);
      const relY = (event.clientY - (rect.top + rect.height / 2)) / (rect.height / 2);
      const clamp = (v: number) => Math.max(-1, Math.min(1, v));
      rawX.set(clamp(relX));
      rawY.set(clamp(relY));
    }

    window.addEventListener("pointermove", handlePointerMove);
    return () => window.removeEventListener("pointermove", handlePointerMove);
  }, [rawX, rawY, prefersReducedMotion, isCoarsePointer]);

  // Background moves slower than the page as you scroll — the depth partner
  // to HeroVisual's faster foreground scroll-lift.
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end start"] });
  const scrollDrift = useTransform(scrollYProgress, [0, 1], [0, 18]);
  const combinedY = useTransform(
    [parallaxY, scrollDrift],
    ([p, s]) => (p as number) + (s as number)
  );

  return (
    <motion.div
      ref={ref}
      className={className}
      style={prefersReducedMotion ? undefined : { x: parallaxX, y: combinedY }}
      aria-hidden
    >
      <svg viewBox="0 0 800 800" className="h-full w-full" style={{ filter: "blur(0.5px)" }}>
        <defs>
          <radialGradient id="glow-a" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#ea5a1b" stopOpacity="0.55" />
            <stop offset="100%" stopColor="#ea5a1b" stopOpacity="0" />
          </radialGradient>
          <radialGradient id="glow-b" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#f3b45a" stopOpacity="0.5" />
            <stop offset="100%" stopColor="#f3b45a" stopOpacity="0" />
          </radialGradient>
          <radialGradient id="glow-c" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#fff6e6" stopOpacity="0.9" />
            <stop offset="100%" stopColor="#fff6e6" stopOpacity="0" />
          </radialGradient>
          <filter id="soft-blur" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="55" />
          </filter>
        </defs>

        <g filter="url(#soft-blur)">
          <motion.circle
            cx="420"
            cy="300"
            r="230"
            fill="url(#glow-a)"
            animate={
              prefersReducedMotion
                ? undefined
                : {
                    cx: [280, 560, 300, 280],
                    cy: [260, 340, 420, 260],
                    opacity: [0.7, 1, 0.55, 0.7],
                  }
            }
            transition={{ duration: 13, repeat: Infinity, ease: "easeInOut" }}
          />
          <motion.circle
            cx="300"
            cy="460"
            r="190"
            fill="url(#glow-b)"
            animate={
              prefersReducedMotion
                ? undefined
                : {
                    cx: [220, 420, 260, 220],
                    cy: [430, 380, 540, 430],
                    opacity: [0.65, 1, 0.6, 0.65],
                  }
            }
            transition={{ duration: 15, repeat: Infinity, ease: "easeInOut" }}
          />
          <motion.circle
            cx="520"
            cy="500"
            r="150"
            fill="url(#glow-c)"
            animate={
              prefersReducedMotion
                ? undefined
                : {
                    cx: [460, 620, 470, 460],
                    cy: [520, 400, 580, 520],
                    opacity: [0.55, 0.95, 0.5, 0.55],
                  }
            }
            transition={{ duration: 11, repeat: Infinity, ease: "easeInOut" }}
          />
        </g>

        {/* a bright highlight that sweeps left → center → right → center,
            like light travelling slowly across the hero */}
        <motion.rect
          x="-260"
          y="0"
          width="320"
          height="800"
          fill="url(#glow-c)"
          opacity="0.4"
          animate={prefersReducedMotion ? undefined : { x: [-260, 260, 740, 260, -260] }}
          transition={{ duration: 14, repeat: Infinity, ease: "easeInOut" }}
        />

        {/* thin concentric arcs for a subtle "boundary" motif */}
        <g stroke="#c9490f" fill="none" strokeWidth="1">
          <motion.circle
            cx="420"
            cy="380"
            r="180"
            animate={prefersReducedMotion ? undefined : { strokeOpacity: [0.12, 0.28, 0.12] }}
            transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
          />
          <motion.circle
            cx="420"
            cy="380"
            r="240"
            animate={prefersReducedMotion ? undefined : { strokeOpacity: [0.18, 0.08, 0.18] }}
            transition={{ duration: 10, repeat: Infinity, ease: "easeInOut", delay: 0.6 }}
          />
          <motion.circle
            cx="420"
            cy="380"
            r="300"
            animate={prefersReducedMotion ? undefined : { strokeOpacity: [0.1, 0.22, 0.1] }}
            transition={{ duration: 12, repeat: Infinity, ease: "easeInOut", delay: 1.2 }}
          />
        </g>
      </svg>
    </motion.div>
  );
}

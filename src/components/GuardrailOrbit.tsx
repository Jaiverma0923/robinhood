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

/**
 * An original abstract hero visual for the guardrail concept:
 *
 *   converging signal lines  →  pulsing decision core  →  rotating
 *   boundary rings (guardrail)  →  a fixed execution gate
 *
 * Every ring/layer rotates or drifts at its own independent speed and
 * direction so the motion reads as organic rather than a single spinning
 * object. The whole thing tilts and drifts toward the cursor (max ~18px)
 * and responds subtly to scroll. Purely decorative: pointer-events-none,
 * sits behind the hero copy, and reduces to a static pose under
 * prefers-reduced-motion.
 */
export function GuardrailOrbit({
  className,
  style,
}: {
  className?: string;
  style?: React.CSSProperties;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const prefersReducedMotion = useReducedMotion();
  const [isCoarsePointer, setIsCoarsePointer] = useState(
    () => typeof window !== "undefined" && window.matchMedia("(pointer: coarse)").matches
  );

  // Normalized -1..1 cursor position relative to this element.
  const rawX = useMotionValue(0);
  const rawY = useMotionValue(0);
  const springX = useSpring(rawX, { stiffness: 55, damping: 14, mass: 0.9 });
  const springY = useSpring(rawY, { stiffness: 55, damping: 14, mass: 0.9 });

  const DRIFT = 18; // px — whole-object drift toward the cursor
  const driftX = useTransform(springX, (v) => v * DRIFT);
  const driftY = useTransform(springY, (v) => v * DRIFT);
  // A slight lean toward the cursor, like the object is physically tilting.
  const tilt = useTransform(springX, (v) => v * 3.5);

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

  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end start"] });
  const scrollY = useTransform(scrollYProgress, [0, 1], [0, 60]);
  const scrollScale = useTransform(scrollYProgress, [0, 1], [1, 1.08]);
  const scrollRotate = useTransform(scrollYProgress, [0, 1], [0, 10]);

  const composedY = useTransform([driftY, scrollY], ([d, s]) => (d as number) + (s as number));

  const animatable = !prefersReducedMotion;
  const CX = 220;
  const CY = 220;

  return (
    <motion.div
      ref={ref}
      className={className}
      aria-hidden
      style={{
        ...style,
        x: prefersReducedMotion ? undefined : driftX,
        y: prefersReducedMotion ? undefined : composedY,
        rotate: prefersReducedMotion ? undefined : tilt,
        scale: prefersReducedMotion ? undefined : scrollScale,
      }}
    >
      <motion.svg
        viewBox="0 0 440 440"
        className="h-full w-full"
        style={{ rotate: prefersReducedMotion ? undefined : scrollRotate }}
      >
        <defs>
          <radialGradient id="orbit-core" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#ffdcb0" />
            <stop offset="45%" stopColor="#ea5a1b" />
            <stop offset="100%" stopColor="#c9490f" stopOpacity="0" />
          </radialGradient>
          <radialGradient id="orbit-halo" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#ea5a1b" stopOpacity="0.22" />
            <stop offset="100%" stopColor="#ea5a1b" stopOpacity="0" />
          </radialGradient>
          <filter id="orbit-blur" x="-60%" y="-60%" width="220%" height="220%">
            <feGaussianBlur stdDeviation="14" />
          </filter>
        </defs>

        {/* ambient halo behind everything — gentle breathing, no hard edge */}
        <motion.circle
          cx={CX}
          cy={CY}
          r={175}
          fill="url(#orbit-halo)"
          filter="url(#orbit-blur)"
          animate={animatable ? { opacity: [0.7, 1, 0.7], scale: [1, 1.05, 1] } : undefined}
          transition={{ duration: 9, repeat: Infinity, ease: "easeInOut" }}
          style={{ transformOrigin: `${CX}px ${CY}px` }}
        />

        {/* converging signal lines — AI decisions flowing toward the core */}
        <g stroke="#c9490f" strokeWidth="1.25" fill="none" opacity="0.4">
          {[
            "M 60 130 C 120 150, 150 170, 196 205",
            "M 380 120 C 320 145, 285 168, 244 204",
            "M 70 330 C 125 300, 160 270, 198 233",
          ].map((d, i) => (
            <motion.path
              key={d}
              d={d}
              strokeDasharray="6 10"
              animate={animatable ? { strokeDashoffset: [0, -64] } : undefined}
              transition={{ duration: 3.4 + i * 0.6, repeat: Infinity, ease: "linear" }}
            />
          ))}
        </g>

        {/* outer boundary ring — the guardrail perimeter: slow rotation + a
            gentle "breathing" scale, as if actively enforcing the limit */}
        <motion.g
          style={{ transformOrigin: `${CX}px ${CY}px` }}
          animate={animatable ? { rotate: 360, scale: [1, 1.02, 1] } : undefined}
          transition={{
            rotate: { duration: 80, repeat: Infinity, ease: "linear" },
            scale: { duration: 8, repeat: Infinity, ease: "easeInOut" },
          }}
        >
          <circle
            cx={CX}
            cy={CY}
            r={172}
            stroke="#18140e"
            strokeOpacity="0.14"
            strokeWidth="1.5"
            strokeDasharray="1.5 13"
            strokeLinecap="round"
            fill="none"
          />
        </motion.g>

        {/* a bright arc travelling around the boundary — a slow "scan" of the perimeter */}
        <motion.g
          style={{ transformOrigin: `${CX}px ${CY}px` }}
          animate={animatable ? { rotate: [0, 360] } : undefined}
          transition={{ duration: 22, repeat: Infinity, ease: "linear" }}
        >
          <circle
            cx={CX}
            cy={CY}
            r={172}
            stroke="#ea5a1b"
            strokeOpacity="0.55"
            strokeWidth="2"
            strokeDasharray="60 984"
            strokeLinecap="round"
            fill="none"
          />
        </motion.g>

        {/* middle ring — independent rotation, opposite direction, with a
            gauge-like set of tick marks */}
        <motion.g
          style={{ transformOrigin: `${CX}px ${CY}px` }}
          animate={animatable ? { rotate: -360 } : undefined}
          transition={{ duration: 50, repeat: Infinity, ease: "linear" }}
        >
          {Array.from({ length: 16 }).map((_, i) => {
            const angle = (i / 16) * 360;
            const long = i % 4 === 0;
            return (
              <line
                key={i}
                x1={CX}
                y1={CY - 132}
                x2={CX}
                y2={CY - (long ? 122 : 127)}
                stroke={long ? "#c9490f" : "#b3ab98"}
                strokeOpacity={long ? 0.55 : 0.35}
                strokeWidth={long ? 2 : 1}
                strokeLinecap="round"
                transform={`rotate(${angle} ${CX} ${CY})`}
              />
            );
          })}
        </motion.g>

        {/* orbiting signal nodes — each its own speed and direction */}
        {[
          { r: 132, size: 5, duration: 16, dir: 1, offset: 20 },
          { r: 132, size: 4, duration: 24, dir: -1, offset: 160 },
          { r: 132, size: 3.5, duration: 30, dir: 1, offset: 260 },
        ].map((node, i) => (
          <motion.g
            key={i}
            style={{ transformOrigin: `${CX}px ${CY}px` }}
            initial={{ rotate: node.offset }}
            animate={
              animatable
                ? { rotate: node.offset + node.dir * 360 }
                : undefined
            }
            transition={{ duration: node.duration, repeat: Infinity, ease: "linear" }}
          >
            <motion.circle
              cx={CX}
              cy={CY - node.r}
              r={node.size}
              fill="#ea5a1b"
              animate={animatable ? { opacity: [0.5, 1, 0.5] } : undefined}
              transition={{ duration: 3, repeat: Infinity, ease: "easeInOut", delay: i * 0.4 }}
            />
          </motion.g>
        ))}

        {/* decision core — pulsing, slightly morphing */}
        <motion.circle
          cx={CX}
          cy={CY}
          r={30}
          fill="url(#orbit-core)"
          animate={
            animatable
              ? { scale: [1, 1.12, 0.97, 1], opacity: [0.85, 1, 0.9, 0.85] }
              : undefined
          }
          transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
          style={{ transformOrigin: `${CX}px ${CY}px` }}
        />
        <circle cx={CX} cy={CY} r={44} stroke="#ea5a1b" strokeOpacity="0.3" strokeWidth="1" fill="none" />

        {/* execution gate — fixed, does not rotate with the rings: the
            approved point of exit through the boundary */}
        <g transform={`translate(${CX} ${CY + 172})`}>
          <motion.circle
            r={5}
            fill="#ea5a1b"
            animate={animatable ? { scale: [1, 1.5, 1], opacity: [0.8, 1, 0.8] } : undefined}
            transition={{ duration: 2.6, repeat: Infinity, ease: "easeInOut" }}
          />
          <circle r={11} stroke="#ea5a1b" strokeOpacity="0.4" strokeWidth="1" fill="none" />
        </g>
      </motion.svg>
    </motion.div>
  );
}

"use client";

import { useEffect, useRef, useState } from "react";
import {
  animate,
  motion,
  useMotionValue,
  useReducedMotion,
  useScroll,
  useSpring,
  useTransform,
} from "framer-motion";

/**
 * The large, screen-wide "risk engine" visual that lives behind the hero
 * copy. Abstractly represents AI TRADE → RISK EVALUATION → GUARDRAIL →
 * EXECUTION through three depth layers built from a single SVG:
 *
 *   BACK    — the guardrail boundary itself: nested orbit rings + a
 *             breathing core, largest and slowest.
 *   MIDDLE  — converging signal paths + orbiting nodes at several radii
 *             and speeds/directions.
 *   FRONT   — small orange "trade signals" that travel across the full
 *             width, pass through the core (briefly lighting it up), and
 *             some that turn back rather than continuing through.
 *
 * The whole cluster also drifts slowly through a handful of positions
 * across the hero (right → center-right → left → back) on a long,
 * unevenly-timed loop, independent of the per-layer cursor parallax and
 * scroll response — so depth, drift, and pointer reaction all compose
 * without fighting each other. A soft two-sided opacity mask keeps it out
 * of the way of the centered headline column. Desktop/tablet only — see
 * <GuardrailOrbit> for the compact phone fallback. Fully inert (single
 * static pose) under prefers-reduced-motion.
 */
export function HeroRiskField({ className }: { className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const prefersReducedMotion = useReducedMotion();
  const [isCoarsePointer, setIsCoarsePointer] = useState(
    () => typeof window !== "undefined" && window.matchMedia("(pointer: coarse)").matches
  );

  useEffect(() => {
    const mq = window.matchMedia("(pointer: coarse)");
    const handler = (e: MediaQueryListEvent) => setIsCoarsePointer(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  // --- cursor parallax (shared raw position, scaled per layer below) -----
  const rawX = useMotionValue(0);
  const rawY = useMotionValue(0);
  const springX = useSpring(rawX, { stiffness: 45, damping: 15, mass: 1 });
  const springY = useSpring(rawY, { stiffness: 45, damping: 15, mass: 1 });

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

  const backMouseX = useTransform(springX, (v) => v * 7);
  const backMouseY = useTransform(springY, (v) => v * 7);
  const midMouseX = useTransform(springX, (v) => v * 13);
  const midMouseY = useTransform(springY, (v) => v * 13);
  const foreMouseX = useTransform(springX, (v) => v * 19);
  const foreMouseY = useTransform(springY, (v) => v * 19);
  const coreTilt = useTransform(springX, (v) => v * 3);

  // --- scroll parallax -----------------------------------------------------
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end start"] });
  const scrollBackY = useTransform(scrollYProgress, [0, 1], [0, 26]);
  const scrollMidY = useTransform(scrollYProgress, [0, 1], [0, 50]);
  const scrollForeY = useTransform(scrollYProgress, [0, 1], [0, 70]);
  const scrollRotate = useTransform(scrollYProgress, [0, 1], [0, 6]);

  // --- slow whole-cluster "phase" drift -------------------------------------
  // RIGHT → CENTER-RIGHT → (subtly behind the copy) → LEFT → back toward
  // RIGHT. Curved/uneven timing via mismatched keyframe `times` so it never
  // reads as a mechanical slide. Layers get different multipliers of the
  // same drift for an extra sense of depth as it travels.
  const phaseX = useMotionValue(0);
  const phaseY = useMotionValue(0);

  useEffect(() => {
    if (prefersReducedMotion) return;
    const cx = animate(phaseX, [0, -70, -190, -300, -140, 40, 0], {
      duration: 52,
      repeat: Infinity,
      ease: "easeInOut",
      times: [0, 0.16, 0.4, 0.58, 0.76, 0.9, 1],
    });
    const cy = animate(phaseY, [0, -10, 6, -14, 8, -4, 0], {
      duration: 52,
      repeat: Infinity,
      ease: "easeInOut",
      times: [0, 0.16, 0.4, 0.58, 0.76, 0.9, 1],
    });
    return () => {
      cx.stop();
      cy.stop();
    };
  }, [phaseX, phaseY, prefersReducedMotion]);

  const backPhaseX = useTransform(phaseX, (v) => v * 0.55);
  const midPhaseX = useTransform(phaseX, (v) => v * 1);
  const forePhaseX = useTransform(phaseX, (v) => v * 1.5);

  const backX = useTransform([backMouseX, backPhaseX], ([m, p]) => (m as number) + (p as number));
  const backY = useTransform(
    [backMouseY, scrollBackY, phaseY],
    ([m, s, p]) => (m as number) + (s as number) + (p as number) * 0.5
  );
  const midX = useTransform([midMouseX, midPhaseX], ([m, p]) => (m as number) + (p as number));
  const midY = useTransform(
    [midMouseY, scrollMidY, phaseY],
    ([m, s, p]) => (m as number) + (s as number) + (p as number) * 0.8
  );
  const foreX = useTransform([foreMouseX, forePhaseX], ([m, p]) => (m as number) + (p as number));
  const foreY = useTransform(
    [foreMouseY, scrollForeY, phaseY],
    ([m, s, p]) => (m as number) + (s as number) + (p as number)
  );

  const animatable = !prefersReducedMotion;

  // Cluster sits right-of-center in a wide viewBox — large enough that its
  // outer ring bleeds slightly past the right edge — then phase drift
  // carries it left, so it visits the center and left of the hero over the
  // cycle.
  const CX = 1260;
  const CY = 400;

  return (
    <div
      ref={ref}
      className={className}
      aria-hidden
      style={{
        maskImage:
          "linear-gradient(to right, black 0%, black 24%, rgba(0,0,0,0.45) 40%, rgba(0,0,0,0.45) 58%, black 76%, black 100%)",
        WebkitMaskImage:
          "linear-gradient(to right, black 0%, black 24%, rgba(0,0,0,0.45) 40%, rgba(0,0,0,0.45) 58%, black 76%, black 100%)",
      }}
    >
      <motion.div
        className="h-full w-full"
        initial={{ opacity: 0, scale: 0.94 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.7, ease: "easeOut" }}
      >
        <motion.svg
          viewBox="0 0 1600 900"
          className="h-full w-full"
          style={{ rotate: prefersReducedMotion ? undefined : scrollRotate }}
        >
          <defs>
            <radialGradient id="rf-core" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#ffdcb0" />
              <stop offset="45%" stopColor="#ea5a1b" />
              <stop offset="100%" stopColor="#c9490f" stopOpacity="0" />
            </radialGradient>
            <radialGradient id="rf-halo" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#ea5a1b" stopOpacity="0.2" />
              <stop offset="100%" stopColor="#ea5a1b" stopOpacity="0" />
            </radialGradient>
            <filter id="rf-blur" x="-60%" y="-60%" width="220%" height="220%">
              <feGaussianBlur stdDeviation="18" />
            </filter>
            {/* controlled premium glow (not a neon blur) — a soft blurred
                copy of the shape sitting behind the crisp original */}
            <filter id="rf-glow" x="-120%" y="-120%" width="340%" height="340%">
              <feGaussianBlur in="SourceGraphic" stdDeviation="7" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
            <filter id="rf-glow-soft" x="-120%" y="-120%" width="340%" height="340%">
              <feGaussianBlur in="SourceGraphic" stdDeviation="4" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {/* ---------------------------------------------------------------
              BACK LAYER — boundary rings + breathing core. Largest,
              slowest, least cursor movement. This is the "guardrail" the
              rest of the system is protecting.
          --------------------------------------------------------------- */}
          <motion.g
            style={{ x: prefersReducedMotion ? undefined : backX, y: prefersReducedMotion ? undefined : backY }}
          >
            <motion.circle
              cx={CX}
              cy={CY}
              r={300}
              fill="url(#rf-halo)"
              filter="url(#rf-blur)"
              initial={{ opacity: 0 }}
              animate={animatable ? { opacity: [0.45, 0.65, 0.45], scale: [1, 1.04, 1] } : { opacity: 0.55 }}
              transition={{
                opacity: { duration: 10, repeat: Infinity, ease: "easeInOut", delay: 0.1 },
                scale: { duration: 10, repeat: Infinity, ease: "easeInOut" },
              }}
              style={{ transformOrigin: `${CX}px ${CY}px` }}
            />

            {/* outermost boundary — slow clockwise rotation. Clearly-visible
                secondary structure, not just background texture. */}
            <motion.g
              style={{ transformOrigin: `${CX}px ${CY}px` }}
              initial={{ opacity: 0, rotate: 0 }}
              animate={animatable ? { opacity: 1, rotate: 360 } : { opacity: 1 }}
              transition={{
                opacity: { duration: 0.6, delay: 0.15 },
                rotate: { duration: 100, repeat: Infinity, ease: "linear" },
              }}
            >
              <circle
                cx={CX}
                cy={CY}
                r={330}
                stroke="#18140e"
                strokeOpacity="0.3"
                strokeWidth="1.75"
                strokeDasharray="1.5 15"
                strokeLinecap="round"
                fill="none"
              />
            </motion.g>

            {/* bright arc scanning the outer perimeter */}
            <motion.g
              style={{ transformOrigin: `${CX}px ${CY}px` }}
              animate={animatable ? { rotate: 360 } : undefined}
              transition={{ duration: 26, repeat: Infinity, ease: "linear" }}
            >
              <circle
                cx={CX}
                cy={CY}
                r={330}
                stroke="#ea5a1b"
                strokeOpacity="0.8"
                strokeWidth="3"
                strokeDasharray="90 1988"
                strokeLinecap="round"
                fill="none"
                filter="url(#rf-glow-soft)"
              />
            </motion.g>

            {/* second ring — independent counter-rotation + gentle breathing */}
            <motion.g
              style={{ transformOrigin: `${CX}px ${CY}px` }}
              initial={{ opacity: 0, rotate: 0 }}
              animate={animatable ? { opacity: 1, rotate: -360, scale: [1, 1.02, 1] } : { opacity: 1 }}
              transition={{
                opacity: { duration: 0.6, delay: 0.3 },
                rotate: { duration: 64, repeat: Infinity, ease: "linear" },
                scale: { duration: 7, repeat: Infinity, ease: "easeInOut" },
              }}
            >
              <circle
                cx={CX}
                cy={CY}
                r={218}
                stroke="#c9490f"
                strokeOpacity="0.42"
                strokeWidth="2"
                strokeDasharray="2.5 13"
                fill="none"
              />
            </motion.g>

            {/* guardrail core — breathing, tilts subtly toward the cursor.
                Strongest element in the composition. */}
            <motion.g
              style={{
                transformOrigin: `${CX}px ${CY}px`,
                rotate: prefersReducedMotion ? undefined : coreTilt,
              }}
              initial={{ opacity: 0, scale: 0.7 }}
              animate={animatable ? { opacity: 1, scale: 1 } : { opacity: 1, scale: 1 }}
              transition={{ duration: 0.5, delay: 0.45, ease: "easeOut" }}
            >
              <motion.circle
                cx={CX}
                cy={CY}
                r={54}
                fill="url(#rf-core)"
                filter="url(#rf-glow)"
                animate={
                  animatable
                    ? { scale: [1, 1.1, 0.97, 1], opacity: [0.95, 1, 0.97, 0.95] }
                    : undefined
                }
                transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
                style={{ transformOrigin: `${CX}px ${CY}px` }}
              />
              <circle cx={CX} cy={CY} r={22} fill="#fff3e2" opacity="0.9" />
              <circle cx={CX} cy={CY} r={76} stroke="#ea5a1b" strokeOpacity="0.5" strokeWidth="1.5" fill="none" />
              {/* periodic highlight ring — reads as the core "evaluating" an
                  incoming signal, timed loosely with the foreground signals */}
              <motion.circle
                cx={CX}
                cy={CY}
                r={54}
                stroke="#ea5a1b"
                strokeWidth="2"
                fill="none"
                initial={{ opacity: 0, scale: 1 }}
                animate={animatable ? { opacity: [0, 0.75, 0], scale: [1, 1.7, 2.2] } : undefined}
                transition={{ duration: 3, repeat: Infinity, ease: "easeOut", repeatDelay: 2.4 }}
                style={{ transformOrigin: `${CX}px ${CY}px` }}
              />
            </motion.g>
          </motion.g>

          {/* ---------------------------------------------------------------
              MIDDLE LAYER — converging paths + orbiting nodes at several
              radii/speeds/directions.
          --------------------------------------------------------------- */}
          <motion.g
            style={{ x: prefersReducedMotion ? undefined : midX, y: prefersReducedMotion ? undefined : midY }}
          >
            <motion.g
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.6, delay: 0.4 }}
            >
              <g stroke="#c9490f" strokeWidth="2" fill="none" opacity="0.6">
                {[
                  `M ${CX - 520} ${CY - 100} C ${CX - 330} ${CY - 45}, ${CX - 180} ${CY + 12}, ${CX - 56} ${CY - 8}`,
                  `M ${CX - 480} ${CY + 190} C ${CX - 300} ${CY + 120}, ${CX - 160} ${CY + 46}, ${CX - 52} ${CY + 16}`,
                  `M ${CX + 250} ${CY - 240} C ${CX + 140} ${CY - 140}, ${CX + 82} ${CY - 68}, ${CX + 44} ${CY - 12}`,
                ].map((d, i) => (
                  <motion.path
                    key={d}
                    d={d}
                    strokeDasharray="7 10"
                    animate={animatable ? { strokeDashoffset: [0, -68] } : undefined}
                    transition={{ duration: 3.6 + i * 0.7, repeat: Infinity, ease: "linear" }}
                  />
                ))}
              </g>

              {/* gauge-style tick ring around the mid radius */}
              <motion.g
                style={{ transformOrigin: `${CX}px ${CY}px` }}
                animate={animatable ? { rotate: -360 } : undefined}
                transition={{ duration: 46, repeat: Infinity, ease: "linear" }}
              >
                {Array.from({ length: 20 }).map((_, i) => {
                  const angle = (i / 20) * 360;
                  const long = i % 5 === 0;
                  return (
                    <line
                      key={i}
                      x1={CX}
                      y1={CY - 158}
                      x2={CX}
                      y2={CY - (long ? 142 : 151)}
                      stroke={long ? "#c9490f" : "#8f8672"}
                      strokeOpacity={long ? 0.75 : 0.5}
                      strokeWidth={long ? 2.5 : 1.5}
                      strokeLinecap="round"
                      transform={`rotate(${angle} ${CX} ${CY})`}
                    />
                  );
                })}
              </motion.g>

              {/* orbiting nodes — independent speed + direction each,
                  clearly-visible with a soft glow so they read at a glance */}
              {[
                { r: 176, size: 7, duration: 18, dir: 1, offset: 10 },
                { r: 176, size: 5.5, duration: 27, dir: -1, offset: 130 },
                { r: 176, size: 5, duration: 33, dir: 1, offset: 240 },
                { r: 246, size: 6, duration: 40, dir: -1, offset: 60 },
                { r: 246, size: 4.5, duration: 48, dir: 1, offset: 300 },
              ].map((node, i) => (
                <motion.g
                  key={i}
                  style={{ transformOrigin: `${CX}px ${CY}px` }}
                  initial={{ rotate: node.offset }}
                  animate={animatable ? { rotate: node.offset + node.dir * 360 } : undefined}
                  transition={{ duration: node.duration, repeat: Infinity, ease: "linear" }}
                >
                  <motion.circle
                    cx={CX}
                    cy={CY - node.r}
                    r={node.size}
                    fill="#ea5a1b"
                    filter="url(#rf-glow-soft)"
                    animate={animatable ? { opacity: [0.65, 1, 0.65] } : undefined}
                    transition={{ duration: 3, repeat: Infinity, ease: "easeInOut", delay: i * 0.35 }}
                  />
                </motion.g>
              ))}
            </motion.g>
          </motion.g>

          {/* ---------------------------------------------------------------
              FOREGROUND LAYER — small trade signals that travel across the
              full hero, some passing through the core, one turning back
              rather than continuing (blocked/redirected at the guardrail).
              Strongest cursor movement; fastest to respond to scroll.
          --------------------------------------------------------------- */}
          <motion.g
            style={{ x: prefersReducedMotion ? undefined : foreX, y: prefersReducedMotion ? undefined : foreY }}
          >
            <motion.g
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.6, delay: 0.55 }}
            >
              {/* signal 1 — travels from the far right edge, through the
                  core, and off toward the left, i.e. "approved" */}
              <motion.circle
                r={7}
                fill="#ea5a1b"
                filter="url(#rf-glow)"
                initial={{ opacity: 0 }}
                animate={
                  animatable
                    ? {
                        cx: [1580, 1340, CX + 30, CX - 260, -40],
                        cy: [CY - 260, CY - 120, CY - 4, CY + 40, CY + 30],
                        opacity: [0, 1, 1, 1, 0],
                        scale: [0.7, 1, 1.35, 1, 0.7],
                      }
                    : undefined
                }
                transition={{ duration: 13, repeat: Infinity, ease: "easeInOut", times: [0, 0.32, 0.5, 0.72, 1] }}
              />

              {/* signal 2 — a second, offset approved signal for continuous
                  activity rather than one lonely dot */}
              <motion.circle
                r={5.5}
                fill="#f3b45a"
                filter="url(#rf-glow-soft)"
                initial={{ opacity: 0 }}
                animate={
                  animatable
                    ? {
                        cx: [1500, 1260, CX + 10, CX - 320, -80],
                        cy: [CY + 220, CY + 100, CY + 6, CY - 30, CY - 60],
                        opacity: [0, 1, 1, 1, 0],
                        scale: [0.6, 1, 1.2, 1, 0.6],
                      }
                    : undefined
                }
                transition={{
                  duration: 16,
                  repeat: Infinity,
                  ease: "easeInOut",
                  delay: 4,
                  times: [0, 0.3, 0.52, 0.76, 1],
                }}
              />

              {/* signal 3 — reaches the guardrail, then turns back rather
                  than passing through: "stopped" at the boundary */}
              <motion.circle
                r={6}
                fill="#ea5a1b"
                filter="url(#rf-glow-soft)"
                initial={{ opacity: 0 }}
                animate={
                  animatable
                    ? {
                        cx: [CX - 400, CX - 150, CX - 60, CX - 150, CX - 400],
                        cy: [CY - 40, CY - 10, CY, CY + 20, CY + 60],
                        opacity: [0, 1, 1, 1, 0],
                        scale: [0.6, 1, 1.15, 1, 0.6],
                      }
                    : undefined
                }
                transition={{
                  duration: 9,
                  repeat: Infinity,
                  ease: "easeInOut",
                  delay: 1.6,
                  times: [0, 0.35, 0.5, 0.68, 1],
                }}
              />

              {/* fixed, non-orbiting "execution gate" the approved path
                  exits through */}
              <g transform={`translate(${CX - 300} ${CY + 50})`}>
                <motion.circle
                  r={5.5}
                  fill="#ea5a1b"
                  filter="url(#rf-glow-soft)"
                  animate={animatable ? { scale: [1, 1.5, 1], opacity: [0.8, 1, 0.8] } : undefined}
                  transition={{ duration: 2.8, repeat: Infinity, ease: "easeInOut" }}
                />
                <circle r={13} stroke="#ea5a1b" strokeOpacity="0.55" strokeWidth="1.5" fill="none" />
              </g>
            </motion.g>
          </motion.g>
        </motion.svg>
      </motion.div>
    </div>
  );
}

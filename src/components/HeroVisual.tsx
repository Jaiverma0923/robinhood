"use client";

import { createContext, useContext, useEffect, useMemo, useRef, useState } from "react";
import {
  animate,
  motion,
  MotionValue,
  useMotionValue,
  useReducedMotion,
  useScroll,
  useSpring,
  useTransform,
} from "framer-motion";

type LayerContextValue = {
  x: MotionValue<number>;
  y: MotionValue<number>;
};

const LayerContext = createContext<LayerContextValue | null>(null);

/**
 * Wraps the hero illustration/panel with several layered, premium touches:
 *  - a clearly visible mouse-parallax drift toward the cursor (desktop) — this
 *    is the "middle" depth layer; use <HeroVisualLayer> inside for a
 *    foreground layer that moves further for the same cursor movement.
 *  - a gentle continuous auto-float loop on touch devices (no mouse)
 *  - a slow ambient float + a couple of degrees of rotation, so the panel
 *    never feels perfectly static, at a visibly different speed than its
 *    inner cards
 *  - a depth-creating parallax lift/fade as the user scrolls past the hero
 * All of it is fully disabled under prefers-reduced-motion, leaving only the
 * one-time entrance animation already provided by <Reveal>.
 */
export function HeroVisual({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const prefersReducedMotion = useReducedMotion();
  const [isCoarsePointer, setIsCoarsePointer] = useState(
    () => typeof window !== "undefined" && window.matchMedia("(pointer: coarse)").matches
  );

  // Normalized (-1..1) cursor position relative to this element — shared with
  // child layers via context so each depth can apply its own multiplier.
  const normX = useMotionValue(0);
  const normY = useMotionValue(0);
  const springNormX = useSpring(normX, { stiffness: 70, damping: 15, mass: 0.6 });
  const springNormY = useSpring(normY, { stiffness: 70, damping: 15, mass: 0.6 });

  // This container is the "middle" layer: ~10px of travel.
  const MIDDLE_STRENGTH = 10;
  const middleX = useTransform(springNormX, (v) => v * MIDDLE_STRENGTH);
  const middleY = useTransform(springNormY, (v) => v * MIDDLE_STRENGTH);

  const ambientY = useMotionValue(0);
  const ambientRotate = useMotionValue(0);

  useEffect(() => {
    const mq = window.matchMedia("(pointer: coarse)");
    const handler = (e: MediaQueryListEvent) => setIsCoarsePointer(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  useEffect(() => {
    if (prefersReducedMotion) return;

    if (isCoarsePointer) {
      // No mouse available — replace parallax with a gentle automatic float
      // that stands in for both the mouse-parallax and ambient float.
      const controlsY = animate(ambientY, [0, -14, 0, 9, 0], {
        duration: 8,
        repeat: Infinity,
        ease: "easeInOut",
      });
      const controlsR = animate(ambientRotate, [0, 1.6, 0, -1.6, 0], {
        duration: 8,
        repeat: Infinity,
        ease: "easeInOut",
      });
      return () => {
        controlsY.stop();
        controlsR.stop();
      };
    }

    // Clearly visible floating: ~12px vertical drift + ~1.5deg rotation.
    const controlsY = animate(ambientY, [0, -12, 0], {
      duration: 5,
      repeat: Infinity,
      ease: "easeInOut",
    });
    const controlsR = animate(ambientRotate, [-1.4, 1.4, -1.4], {
      duration: 6,
      repeat: Infinity,
      ease: "easeInOut",
    });

    function handlePointerMove(event: PointerEvent) {
      const el = ref.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const relX = (event.clientX - (rect.left + rect.width / 2)) / (rect.width / 2);
      const relY = (event.clientY - (rect.top + rect.height / 2)) / (rect.height / 2);
      const clamp = (v: number) => Math.max(-1, Math.min(1, v));
      normX.set(clamp(relX));
      normY.set(clamp(relY));
    }

    window.addEventListener("pointermove", handlePointerMove);
    return () => {
      controlsY.stop();
      controlsR.stop();
      window.removeEventListener("pointermove", handlePointerMove);
    };
  }, [normX, normY, ambientY, ambientRotate, prefersReducedMotion, isCoarsePointer]);

  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start start", "end start"],
  });

  // Foreground-ish: the visual itself moves a bit faster than the page as
  // you scroll past it, while the background glow (see FlowingGlow) moves
  // slower, creating depth.
  const scrollLift = useTransform(scrollYProgress, [0, 1], [0, 46]);
  const scrollOpacity = useTransform(scrollYProgress, [0, 0.85], [1, 0.78]);

  // middleX/Y stay at 0 on coarse-pointer devices (no pointermove events are
  // ever registered there), so this composition works for both cases:
  // desktop gets mouse-parallax + ambient float + scroll, touch gets just
  // the automatic float + scroll.
  const finalY = useTransform(
    [middleY, ambientY, scrollLift],
    ([mouse, ambient, scroll]) => (mouse as number) + (ambient as number) + (scroll as number)
  );

  const layerContextValue = useMemo<LayerContextValue>(
    () => ({ x: springNormX, y: springNormY }),
    [springNormX, springNormY]
  );

  if (prefersReducedMotion) {
    return (
      <div ref={ref} className={className}>
        {children}
      </div>
    );
  }

  return (
    <motion.div
      ref={ref}
      className={className}
      style={{
        x: middleX,
        y: finalY,
        rotate: ambientRotate,
        opacity: scrollOpacity,
      }}
    >
      <LayerContext.Provider value={layerContextValue}>{children}</LayerContext.Provider>
    </motion.div>
  );
}

/**
 * A foreground element inside <HeroVisual> that reacts more strongly to the
 * same cursor position than the container itself — e.g. strength={1.5} on a
 * 10px middle layer gives ~15px of travel, per the intended depth stack.
 */
export function HeroVisualLayer({
  children,
  className,
  strength = 1.5,
}: {
  children: React.ReactNode;
  className?: string;
  strength?: number;
}) {
  const ctx = useContext(LayerContext);
  const zero = useMotionValue(0);
  const baseX = ctx?.x ?? zero;
  const baseY = ctx?.y ?? zero;
  const x = useTransform(baseX, (v) => v * 10 * strength);
  const y = useTransform(baseY, (v) => v * 10 * strength);

  return (
    <motion.div className={className} style={{ x, y }}>
      {children}
    </motion.div>
  );
}

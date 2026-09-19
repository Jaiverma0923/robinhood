"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";

const BUTTON_TRANSITION = { duration: 0.28, ease: [0.22, 1, 0.36, 1] as const };
const TAP_TRANSITION = { duration: 0.12, ease: [0.22, 1, 0.36, 1] as const };

export function HeroCtaButtons() {
  return (
    <div className="mt-9 flex flex-wrap items-center justify-center gap-3">
      <motion.div
        whileHover={{ scale: 1.04, boxShadow: "0 18px 38px -12px rgba(234,90,27,0.5)" }}
        whileTap={{ scale: 0.97, transition: TAP_TRANSITION }}
        transition={BUTTON_TRANSITION}
        style={{ borderRadius: 9999 }}
      >
        <Link
          href="/dashboard"
          className="group flex items-center gap-2 rounded-full bg-ink px-6 py-3 text-sm font-medium text-cream transition-colors duration-300 hover:bg-flame"
        >
          Open dashboard
          <span className="inline-flex transition-transform duration-300 ease-out group-hover:translate-x-2">
            <ArrowRight size={15} />
          </span>
        </Link>
      </motion.div>

      <motion.div
        whileHover={{ y: -4, boxShadow: "0 14px 28px -14px rgba(24,20,14,0.3)" }}
        whileTap={{ y: -1, scale: 0.98, transition: TAP_TRANSITION }}
        transition={BUTTON_TRANSITION}
        style={{ borderRadius: 9999 }}
      >
        <a
          href="#how-it-works"
          className="block rounded-full border border-line-strong px-6 py-3 text-sm font-medium text-ink-soft transition-colors duration-300 hover:border-ink hover:text-ink"
        >
          See how it works
        </a>
      </motion.div>
    </div>
  );
}

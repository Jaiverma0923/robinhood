"use client";

import { motion } from "framer-motion";
import { Wallet, Layers, TrendingDown, ScrollText } from "lucide-react";
import { RevealGroup, revealItem } from "@/components/Reveal";

const VALUE_CARDS = [
  {
    icon: Wallet,
    title: "Spend caps",
    body: "Hard limits on how much an agent can spend.",
    metric: "$5,000 / day",
    ratio: 0.68,
  },
  {
    icon: Layers,
    title: "Position limits",
    body: "Prevent autonomous agents from over-concentrating capital.",
    metric: "$2,000 max",
    ratio: 0.62,
  },
  {
    icon: TrendingDown,
    title: "Loss limits",
    body: "Stop trading when predefined loss thresholds are reached.",
    metric: "$250 circuit breaker",
    ratio: 0.34,
  },
  {
    icon: ScrollText,
    title: "Audit trail",
    body: "Every request, decision, and rejection is recorded.",
    metric: "100% logged",
    ratio: 1,
  },
];

export function ValueCards() {
  return (
    <RevealGroup className="mt-14 grid grid-cols-1 gap-5 md:grid-cols-2">
      {VALUE_CARDS.map((c) => (
        <motion.div
          key={c.title}
          variants={revealItem}
          className="group relative flex min-h-[280px] flex-col justify-between overflow-hidden rounded-[28px] border border-line bg-paper p-8 transition-shadow hover:shadow-[0_24px_60px_-24px_rgba(24,20,14,0.16)]"
        >
          <div className="flex items-start justify-between">
            <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-flame/10 text-flame-deep">
              <c.icon size={19} />
            </span>
            <span className="font-data text-xs text-ink-faint">{c.metric}</span>
          </div>

          <div>
            <h3 className="text-2xl font-medium tracking-tight text-ink">{c.title}</h3>
            <p className="mt-2 max-w-xs text-sm leading-relaxed text-ink-muted">{c.body}</p>
          </div>

          <div className="mt-6 h-1.5 w-full overflow-hidden rounded-full bg-cream-deep">
            <div
              className="h-full rounded-full bg-flame transition-all duration-700 ease-out group-hover:opacity-80"
              style={{ width: `${c.ratio * 100}%` }}
            />
          </div>

          <div
            className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-flame/[0.06] blur-2xl transition-transform duration-500 group-hover:scale-125"
            aria-hidden
          />
        </motion.div>
      ))}
    </RevealGroup>
  );
}

"use client";

import { motion } from "framer-motion";
import { Bot, ShieldHalf, Landmark } from "lucide-react";
import { cn } from "@/lib/utils";

export type FlowStatus = "idle" | "evaluating" | "approved" | "blocked";

export function GateFlow({ status }: { status: FlowStatus }) {
  const dotColor =
    status === "approved" ? "var(--approve)" : status === "blocked" ? "var(--block)" : "var(--flame)";

  return (
    <div className="relative flex items-center justify-between gap-2 py-4">
      <Node icon={<Bot size={16} />} label="AI agent" />

      <Track>
        {status !== "idle" && (
          <motion.span
            key={status + "-1"}
            className="absolute top-1/2 h-2 w-2 -translate-y-1/2 rounded-full"
            style={{ background: dotColor, boxShadow: `0 0 10px ${dotColor}` }}
            initial={{ left: "0%", opacity: 0 }}
            animate={{ left: "100%", opacity: [0, 1, 1, 0] }}
            transition={{ duration: 0.9, ease: "easeInOut" }}
          />
        )}
      </Track>

      <Node
        icon={<ShieldHalf size={16} />}
        label="Guardrail"
        active={status === "evaluating"}
        tone={status === "approved" ? "approve" : status === "blocked" ? "block" : "flame"}
      />

      <Track>
        {status === "approved" && (
          <motion.span
            key="dot-2"
            className="absolute top-1/2 h-2 w-2 -translate-y-1/2 rounded-full"
            style={{ background: dotColor, boxShadow: `0 0 10px ${dotColor}` }}
            initial={{ left: "0%", opacity: 0 }}
            animate={{ left: "100%", opacity: [0, 1, 1, 0] }}
            transition={{ duration: 0.7, delay: 0.85, ease: "easeInOut" }}
          />
        )}
      </Track>

      <Node
        icon={<Landmark size={16} />}
        label="Execution"
        muted={status !== "approved"}
        tone={status === "approved" ? "approve" : "neutral"}
      />
    </div>
  );
}

function Track({ children }: { children: React.ReactNode }) {
  return <div className="relative h-px flex-1 bg-line-strong">{children}</div>;
}

function Node({
  icon,
  label,
  active,
  muted,
  tone = "neutral",
}: {
  icon: React.ReactNode;
  label: string;
  active?: boolean;
  muted?: boolean;
  tone?: "approve" | "block" | "flame" | "neutral";
}) {
  const toneClasses: Record<string, string> = {
    approve: "border-approve/30 text-approve bg-approve/10",
    block: "border-block/30 text-block bg-block/10",
    flame: "border-flame/30 text-flame-deep bg-flame/10",
    neutral: "border-line-strong text-ink-muted bg-cream",
  };

  return (
    <div className="flex shrink-0 flex-col items-center gap-1.5">
      <div
        className={cn(
          "flex h-10 w-10 items-center justify-center rounded-full border transition-all",
          toneClasses[tone],
          active && "animate-pulse",
          muted && "opacity-50"
        )}
      >
        {icon}
      </div>
      <span className={cn("text-[11px]", muted ? "text-ink-faint" : "text-ink-muted")}>{label}</span>
    </div>
  );
}

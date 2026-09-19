"use client";

import { motion } from "framer-motion";
import { Check, X } from "lucide-react";
import { cn } from "@/lib/utils";
import type { CheckDetail } from "@/lib/types";

export function CheckList({ checks }: { checks: CheckDetail[] }) {
  return (
    <ul className="flex flex-col gap-2">
      {checks.map((check, i) => (
        <motion.li
          key={check.key}
          initial={{ opacity: 0, x: -8 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: i * 0.08, duration: 0.3, ease: "easeOut" }}
          className={cn(
            "flex items-start gap-3 rounded-2xl border px-4 py-3",
            check.passed ? "border-line bg-paper" : "border-block/25 bg-block/[0.05]"
          )}
        >
          <span
            className={cn(
              "mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full",
              check.passed ? "bg-approve/12 text-approve" : "bg-block/12 text-block"
            )}
          >
            {check.passed ? <Check size={12} strokeWidth={3} /> : <X size={12} strokeWidth={3} />}
          </span>
          <div className="min-w-0">
            <p className="text-sm font-medium text-ink">{check.label}</p>
            <p className="mt-0.5 text-[13px] leading-relaxed text-ink-muted">{check.detail}</p>
          </div>
        </motion.li>
      ))}
    </ul>
  );
}

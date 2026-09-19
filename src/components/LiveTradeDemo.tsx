"use client";

import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowRight, ShieldCheck, ShieldAlert } from "lucide-react";
import Link from "next/link";
import { GateFlow, type FlowStatus } from "@/components/GateFlow";
import { CheckList } from "@/components/CheckList";
import { evaluateTrade, money } from "@/lib/guardrail";
import { DEFAULT_POLICY, DEFAULT_PORTFOLIO } from "@/lib/defaults";
import type { Side } from "@/lib/types";

const SCENARIOS: { key: string; label: string; symbol: string; side: Side; quantity: number; estimatedPrice: number }[] = [
  { key: "dangerous", label: "Dangerous request", symbol: "NVDA", side: "BUY", quantity: 20, estimatedPrice: 180 },
  { key: "safe", label: "Safe request", symbol: "AAPL", side: "BUY", quantity: 2, estimatedPrice: 180 },
];

/**
 * A static preview of the guardrail, evaluated once against the same pure
 * `evaluateTrade` function the live app uses (with the demo's default
 * policy/portfolio), so the result shown is real, not scripted copy — it
 * just doesn't hit the network or the live, editable policy the way the
 * simulator does. The actual interactive, end-to-end demo (including the
 * platform-fee + testnet wallet flow) lives on the simulator page.
 */
export function LiveTradeDemo() {
  const [activeKey, setActiveKey] = useState<string>(SCENARIOS[1].key);

  const active = SCENARIOS.find((s) => s.key === activeKey)!;
  const result = useMemo(
    () =>
      evaluateTrade(
        {
          symbol: active.symbol,
          side: active.side,
          quantity: active.quantity,
          estimatedPrice: active.estimatedPrice,
        },
        {
          portfolio: DEFAULT_PORTFOLIO,
          dailySpendSoFar: 0,
          policy: DEFAULT_POLICY,
        }
      ),
    [active]
  );

  const status: FlowStatus = result.approved ? "approved" : "blocked";
  const tradeValue = active.quantity * active.estimatedPrice;

  return (
    <div className="soft-shadow-lg rounded-[32px] border border-line bg-paper p-6 sm:p-8">
      <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-ink-faint">Preview</p>
          <h3 className="mt-1.5 text-xl font-medium text-ink">See the guardrail in action</h3>
          <p className="mt-1.5 max-w-sm text-sm text-ink-muted">
            A quick look at how two example requests play out against the default risk policy.
            Try it for real — with your own numbers, live checks, and a testnet platform fee — in
            the simulator.
          </p>
        </div>
        <div className="flex shrink-0 flex-col gap-2 sm:items-end">
          {SCENARIOS.map((s) => (
            <button
              key={s.key}
              onClick={() => setActiveKey(s.key)}
              className={`flex w-full items-center justify-center gap-2 rounded-full border px-5 py-2.5 text-sm font-medium transition-colors sm:w-auto ${
                activeKey === s.key
                  ? "border-ink bg-ink text-cream"
                  : "border-line-strong text-ink hover:border-ink"
              }`}
            >
              {s.label} ({s.side} {s.quantity} {s.symbol})
            </button>
          ))}
        </div>
      </div>

      <div className="mt-8 rounded-2xl border border-line bg-cream/60 p-5">
        <GateFlow status={status} />
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={activeKey}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
          className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2"
        >
          <div className="rounded-2xl border border-line bg-paper p-4">
            <p className="text-xs font-medium text-ink-faint">Agent request</p>
            <p className="mt-2 font-data text-sm text-ink">
              {active.side} {active.quantity} {active.symbol}
            </p>
            <p className="mt-1 text-xs text-ink-muted">
              {active.quantity} × {money(active.estimatedPrice)}/share
            </p>
            <p className="mt-3 font-data text-2xl font-medium text-ink">{money(tradeValue)}</p>
          </div>

          <div
            className={`rounded-2xl border p-4 ${
              result.approved ? "border-approve/25 bg-approve/[0.06]" : "border-block/25 bg-block/[0.06]"
            }`}
          >
            <div className="flex items-center gap-2">
              {result.approved ? (
                <ShieldCheck size={16} className="text-approve" />
              ) : (
                <ShieldAlert size={16} className="text-block" />
              )}
              <p className={`text-sm font-medium ${result.approved ? "text-approve" : "text-block"}`}>
                {result.approved ? "Approved" : "Blocked"}
              </p>
            </div>
            <p className="mt-1.5 text-xs leading-relaxed text-ink-muted">{result.reason}</p>
          </div>
        </motion.div>
      </AnimatePresence>

      <div className="mt-4">
        <CheckList checks={result.checkDetails} />
      </div>

      <Link
        href="/simulator"
        className="mt-6 inline-flex items-center gap-1.5 text-sm font-medium text-flame-deep transition-colors hover:text-flame"
      >
        Open the live simulator <ArrowRight size={15} />
      </Link>
    </div>
  );
}

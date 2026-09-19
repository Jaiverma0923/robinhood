"use client";

import { motion } from "framer-motion";
import {
  Loader2,
  ShieldAlert,
  ShieldCheck,
  Wallet,
  XCircle,
  AlertTriangle,
  CheckCircle2,
  ExternalLink,
} from "lucide-react";
import type { TxPhase } from "@/lib/types";

interface Props {
  phase: TxPhase;
  reason?: string | null;
  txHash?: string | null;
  explorerUrl?: string | null;
  orderId?: string | null;
}

const TONE: Record<TxPhase, "neutral" | "flame" | "approve" | "block"> = {
  idle: "neutral",
  evaluating: "flame",
  blocked: "block",
  guardrail_blocked: "block",
  approved: "approve",
  awaiting_wallet: "flame",
  checking_balance: "flame",
  insufficient_balance: "block",
  submitted: "flame",
  confirmed: "approve",
  rejected_by_user: "block",
  transaction_failed: "block",
};

const TONE_CLASSES: Record<string, string> = {
  neutral: "border-line bg-cream/60 text-ink-muted",
  flame: "border-flame/25 bg-flame/[0.06] text-flame-deep",
  approve: "border-approve/25 bg-approve/[0.06] text-approve",
  block: "border-block/25 bg-block/[0.06] text-block",
};

function Icon({ phase }: { phase: TxPhase }) {
  const size = 18;
  switch (phase) {
    case "evaluating":
    case "awaiting_wallet":
    case "checking_balance":
    case "submitted":
      return <Loader2 size={size} className="animate-spin" />;
    case "approved":
      return <ShieldCheck size={size} />;
    case "confirmed":
      return <CheckCircle2 size={size} />;
    case "blocked":
    case "guardrail_blocked":
      return <ShieldAlert size={size} />;
    case "insufficient_balance":
      return <AlertTriangle size={size} />;
    case "rejected_by_user":
    case "transaction_failed":
      return <XCircle size={size} />;
    default:
      return <Wallet size={size} />;
  }
}

const LABELS: Record<TxPhase, string> = {
  idle: "Idle",
  evaluating: "Running guardrail checks…",
  blocked: "Blocked by guardrail",
  guardrail_blocked: "Blocked by guardrail",
  approved: "Approved — ready to collect the platform fee",
  awaiting_wallet: "Awaiting wallet confirmation…",
  checking_balance: "Checking testnet fee-token balance…",
  insufficient_balance: "Insufficient testnet fee-token balance",
  submitted: "Fee transaction submitted — waiting for confirmation…",
  confirmed: "Trade executed",
  rejected_by_user: "Rejected in wallet",
  transaction_failed: "Transaction failed",
};

export function TxPhaseStatus({ phase, reason, txHash, explorerUrl, orderId }: Props) {
  if (phase === "idle") return null;
  const tone = TONE[phase];

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      className={`flex items-start gap-3 rounded-2xl border p-4 ${TONE_CLASSES[tone]}`}
    >
      <span className="mt-0.5 shrink-0">
        <Icon phase={phase} />
      </span>
      <div className="min-w-0">
        <p className="text-sm font-medium">{LABELS[phase]}</p>
        {reason && <p className="mt-1 text-[13px] leading-relaxed opacity-90">{reason}</p>}
        {orderId && (
          <p className="mt-1.5 font-data text-xs opacity-80">Order {orderId}</p>
        )}
        {txHash && (
          <p className="mt-1 font-data text-xs opacity-80">
            Fee tx {txHash.slice(0, 10)}…{txHash.slice(-6)}
            {explorerUrl && (
              <a
                href={explorerUrl}
                target="_blank"
                rel="noreferrer"
                className="ml-1.5 inline-flex items-center gap-0.5 underline underline-offset-2"
              >
                View <ExternalLink size={10} />
              </a>
            )}
          </p>
        )}
      </div>
    </motion.div>
  );
}

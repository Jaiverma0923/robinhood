import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { evaluateTrade } from "@/lib/guardrail";
import { mockExecute } from "@/lib/execution";
import {
  getDailySpend,
  getPolicy,
  getPortfolio,
  recordPendingTrade,
  recordTrade,
} from "@/lib/store";
import type { ActivityEntry } from "@/lib/types";

const tradeSchema = z.object({
  symbol: z
    .string()
    .trim()
    .min(1, "Symbol is required")
    .max(6, "Symbol looks too long")
    .transform((s) => s.toUpperCase()),
  side: z.enum(["BUY", "SELL"]),
  quantity: z.coerce.number().positive("Quantity must be greater than zero"),
  estimatedPrice: z.coerce
    .number()
    .positive("Estimated price must be greater than zero"),
  agent: z.string().trim().min(1).max(64).optional(),
  // When true, an APPROVED request is recorded as pending and NOT executed
  // yet — used by the simulator's platform-fee flow, which must collect the
  // fee before the trade is considered executed. Existing callers (an AI
  // trading agent hitting this endpoint directly) omit this and keep the
  // original immediate-execution behavior.
  deferExecution: z.boolean().optional(),
});

/**
 * This is the guardrail proxy. An AI trading agent calls this endpoint
 * instead of talking to the execution layer directly. Every request is
 * evaluated against the current risk policy before anything is forwarded
 * for execution — the agent has no path that bypasses this check.
 */
export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { error: "Request body must be valid JSON." },
      { status: 400 }
    );
  }

  const parsed = tradeSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid trade request." },
      { status: 400 }
    );
  }

  const request = parsed.data;
  const policy = getPolicy();
  const portfolio = getPortfolio();
  const dailySpendSoFar = getDailySpend();

  const result = evaluateTrade(request, {
    portfolio,
    dailySpendSoFar,
    policy,
  });

  const deferExecution = result.approved && request.deferExecution === true;

  const execution = result.approved && !deferExecution
    ? mockExecute()
    : { status: "not_attempted" as const, orderId: null };

  const entry: ActivityEntry = {
    id: `trd-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    timestamp: new Date().toISOString(),
    symbol: request.symbol,
    side: request.side,
    quantity: request.quantity,
    estimatedPrice: request.estimatedPrice,
    tradeValue: result.tradeValue,
    decision: result.approved ? "APPROVED" : "BLOCKED",
    reason: result.reason ?? "",
    failedCheck: result.failedCheck,
    checkDetails: result.checkDetails,
    execution,
    agent: request.agent ?? "trade-simulator",
  };

  if (deferExecution) {
    recordPendingTrade(entry);
  } else {
    recordTrade(entry, { applyEffects: true });
  }

  return NextResponse.json({
    approved: result.approved,
    reason: result.reason,
    failedCheck: result.failedCheck,
    checks: result.checks,
    checkDetails: result.checkDetails,
    tradeValue: result.tradeValue,
    execution,
    pending: deferExecution,
    activityId: entry.id,
  });
}

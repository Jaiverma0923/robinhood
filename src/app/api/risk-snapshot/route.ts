import { NextResponse } from "next/server";
import { portfolioValue } from "@/lib/guardrail";
import {
  getActivity,
  getDailySpend,
  getPolicy,
  getPortfolio,
} from "@/lib/store";
import type { RiskSnapshot } from "@/lib/types";

export async function GET() {
  const policy = getPolicy();
  const portfolio = getPortfolio();
  const activity = getActivity();
  const totalValue = portfolioValue(portfolio);

  const largest = portfolio.holdings.reduce<{ symbol: string; value: number } | null>(
    (max, h) => (!max || h.value > max.value ? { symbol: h.symbol, value: h.value } : max),
    null
  );

  const snapshot: RiskSnapshot = {
    dailySpend: getDailySpend(),
    dailySpendCap: policy.dailySpendCap,
    dailyLoss: Math.max(0, -portfolio.dailyPnl),
    dailyLossLimit: policy.dailyLossLimit,
    largestPosition: largest,
    maxPositionValue: policy.maxPositionValue,
    concentration: largest && totalValue > 0 ? largest.value / totalValue : 0,
    maxConcentration: policy.maxConcentration,
    approvedCount: activity.filter((a) => a.decision === "APPROVED").length,
    blockedCount: activity.filter((a) => a.decision === "BLOCKED").length,
    portfolioValue: totalValue,
  };

  return NextResponse.json(snapshot);
}

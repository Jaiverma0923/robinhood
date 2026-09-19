import { describe, expect, it } from "vitest";
import { evaluateTrade } from "../guardrail";
import type { Portfolio, RiskPolicy } from "../types";

const policy: RiskPolicy = {
  dailySpendCap: 5000,
  maxSingleTrade: 500,
  maxPositionValue: 2000,
  maxConcentration: 0.25,
  dailyLossLimit: 250,
};

const basePortfolio: Portfolio = {
  cash: 4100,
  holdings: [
    { symbol: "AAPL", value: 1250 },
    { symbol: "NVDA", value: 850 },
    { symbol: "MSFT", value: 600 },
    { symbol: "TSLA", value: 400 },
  ],
  dailyPnl: -50,
};

function ctx(overrides: Partial<{ portfolio: Portfolio; dailySpendSoFar: number; policy: RiskPolicy }> = {}) {
  return {
    portfolio: basePortfolio,
    dailySpendSoFar: 0,
    policy,
    ...overrides,
  };
}

describe("evaluateTrade", () => {
  it("1. approves a trade below every limit", () => {
    const result = evaluateTrade(
      { symbol: "AAPL", side: "BUY", quantity: 2, estimatedPrice: 180 },
      ctx()
    );
    expect(result.approved).toBe(true);
    expect(result.failedCheck).toBeNull();
    expect(Object.values(result.checks).every(Boolean)).toBe(true);
  });

  it("2. blocks a trade above the single-trade limit", () => {
    const result = evaluateTrade(
      { symbol: "NVDA", side: "BUY", quantity: 20, estimatedPrice: 180 },
      ctx()
    );
    expect(result.approved).toBe(false);
    expect(result.failedCheck).toBe("singleTrade");
    expect(result.tradeValue).toBe(3600);
  });

  it("3. blocks a trade that would exceed the daily spend cap", () => {
    const result = evaluateTrade(
      { symbol: "AAPL", side: "BUY", quantity: 1, estimatedPrice: 400 },
      ctx({ dailySpendSoFar: 4700 })
    );
    expect(result.approved).toBe(false);
    expect(result.failedCheck).toBe("dailySpend");
  });

  it("4. blocks a trade that would exceed the position limit", () => {
    // AAPL already at $1,250; a $450 buy would bring it to $1,700 (fine),
    // but the max single trade limit is $500 — use MSFT with more room
    // and a policy tuned so position, not trade size, is the binding
    // constraint.
    const loosePolicy: RiskPolicy = { ...policy, maxSingleTrade: 5000, dailySpendCap: 5000 };
    const result = evaluateTrade(
      { symbol: "MSFT", side: "BUY", quantity: 4, estimatedPrice: 420 }, // $1,680, position -> $2,280
      ctx({ policy: loosePolicy })
    );
    expect(result.approved).toBe(false);
    expect(result.failedCheck).toBe("positionLimit");
  });

  it("5. blocks a trade that would exceed portfolio concentration", () => {
    const loosePolicy: RiskPolicy = {
      ...policy,
      maxSingleTrade: 5000,
      dailySpendCap: 5000,
      maxPositionValue: 100000,
      maxConcentration: 0.2,
    };
    // Portfolio total = 4100 + 1250 + 850 + 600 + 400 = 7200
    // A $2,000 AAPL buy -> position 3250 / 7200 = 45% > 20%
    const result = evaluateTrade(
      { symbol: "AAPL", side: "BUY", quantity: 10, estimatedPrice: 200 },
      ctx({ policy: loosePolicy })
    );
    expect(result.approved).toBe(false);
    expect(result.failedCheck).toBe("concentration");
  });

  it("6. blocks all trades once the daily loss limit is exceeded", () => {
    const losingPortfolio: Portfolio = { ...basePortfolio, dailyPnl: -300 };
    const result = evaluateTrade(
      { symbol: "AAPL", side: "BUY", quantity: 1, estimatedPrice: 100 },
      ctx({ portfolio: losingPortfolio })
    );
    expect(result.approved).toBe(false);
    expect(result.failedCheck).toBe("dailyLoss");
  });

  it("evaluates every check independently even when the trade is blocked", () => {
    const result = evaluateTrade(
      { symbol: "TSLA", side: "BUY", quantity: 50, estimatedPrice: 100 },
      ctx()
    );
    expect(result.checkDetails).toHaveLength(5);
    expect(result.checkDetails.map((c) => c.key)).toEqual([
      "singleTrade",
      "dailySpend",
      "positionLimit",
      "concentration",
      "dailyLoss",
    ]);
  });

  it("does not apply the position or spend checks to SELL orders", () => {
    const result = evaluateTrade(
      { symbol: "AAPL", side: "SELL", quantity: 3, estimatedPrice: 250 }, // $750, over single-trade limit alone
      ctx()
    );
    // Single trade limit still applies to sells (it's a blanket per-order cap)
    expect(result.checks.positionLimit).toBe(true);
    expect(result.checks.dailySpend).toBe(true);
  });
});

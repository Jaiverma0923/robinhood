import type {
  CheckDetail,
  GuardrailResult,
  Portfolio,
  RiskPolicy,
  TradeRequest,
} from "./types";

export function money(n: number): string {
  return n.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  });
}

export function computeTradeValue(request: TradeRequest): number {
  return round2(request.quantity * request.estimatedPrice);
}

export function portfolioValue(portfolio: Portfolio): number {
  return round2(
    portfolio.cash + portfolio.holdings.reduce((sum, h) => sum + h.value, 0)
  );
}

export function positionValue(portfolio: Portfolio, symbol: string): number {
  return portfolio.holdings.find((h) => h.symbol === symbol)?.value ?? 0;
}

function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

/**
 * Evaluates a single trading request against the configured risk policy.
 *
 * Every check is independent and always evaluated (short-circuiting is
 * intentionally avoided) so the caller — and the person auditing the
 * decision — can see the full picture, not just the first failure.
 */
export function evaluateTrade(
  request: TradeRequest,
  context: {
    portfolio: Portfolio;
    /** Total dollars already spent today on BUY orders, before this trade. */
    dailySpendSoFar: number;
    policy: RiskPolicy;
  }
): GuardrailResult {
  const { portfolio, dailySpendSoFar, policy } = context;
  const tradeValue = computeTradeValue(request);
  const isBuy = request.side === "BUY";
  const totalPortfolioValue = portfolioValue(portfolio);
  const currentPosition = positionValue(portfolio, request.symbol);

  const checks: CheckDetail[] = [];

  // 1. Maximum single trade
  const singleTradePassed = tradeValue <= policy.maxSingleTrade;
  checks.push({
    key: "singleTrade",
    label: "Single-trade limit",
    passed: singleTradePassed,
    detail: singleTradePassed
      ? `${money(tradeValue)} is within the ${money(policy.maxSingleTrade)} per-trade limit.`
      : `${money(tradeValue)} exceeds the ${money(policy.maxSingleTrade)} per-trade limit.`,
  });

  // 2. Daily spend cap — only BUY orders consume the spend budget
  const projectedSpend = isBuy ? dailySpendSoFar + tradeValue : dailySpendSoFar;
  const dailySpendPassed = projectedSpend <= policy.dailySpendCap;
  checks.push({
    key: "dailySpend",
    label: "Daily spend cap",
    passed: dailySpendPassed,
    detail: !isBuy
      ? `Sell orders don't draw from the daily spend budget (${money(dailySpendSoFar)} / ${money(policy.dailySpendCap)} used).`
      : dailySpendPassed
        ? `${money(projectedSpend)} of ${money(policy.dailySpendCap)} daily spend used after this trade.`
        : `Would bring daily spend to ${money(projectedSpend)}, over the ${money(policy.dailySpendCap)} cap.`,
  });

  // 3. Maximum position value — only meaningful for BUY orders
  const projectedPosition = isBuy ? currentPosition + tradeValue : currentPosition;
  const positionLimitPassed = !isBuy || projectedPosition <= policy.maxPositionValue;
  checks.push({
    key: "positionLimit",
    label: "Position limit",
    passed: positionLimitPassed,
    detail: !isBuy
      ? `Sell orders reduce position size, so this check doesn't apply.`
      : positionLimitPassed
        ? `${request.symbol} position would be ${money(projectedPosition)}, within the ${money(policy.maxPositionValue)} cap.`
        : `${request.symbol} position would reach ${money(projectedPosition)}, over the ${money(policy.maxPositionValue)} cap.`,
  });

  // 4. Portfolio concentration — projected position vs. projected portfolio value
  const projectedPortfolioValue = totalPortfolioValue; // cash <-> holding swap nets to zero
  const concentration =
    projectedPortfolioValue > 0 ? projectedPosition / projectedPortfolioValue : 0;
  const concentrationPassed = concentration <= policy.maxConcentration;
  checks.push({
    key: "concentration",
    label: "Concentration limit",
    passed: concentrationPassed,
    detail: concentrationPassed
      ? `${request.symbol} would be ${(concentration * 100).toFixed(1)}% of the portfolio, within the ${(policy.maxConcentration * 100).toFixed(0)}% limit.`
      : `${request.symbol} would be ${(concentration * 100).toFixed(1)}% of the portfolio, over the ${(policy.maxConcentration * 100).toFixed(0)}% limit.`,
  });

  // 5. Daily loss circuit breaker — blocks all trading once tripped
  const dailyLoss = Math.max(0, -portfolio.dailyPnl);
  const dailyLossPassed = dailyLoss < policy.dailyLossLimit;
  checks.push({
    key: "dailyLoss",
    label: "Daily loss limit",
    passed: dailyLossPassed,
    detail: dailyLossPassed
      ? `Daily loss is ${money(dailyLoss)}, under the ${money(policy.dailyLossLimit)} circuit breaker.`
      : `Daily loss of ${money(dailyLoss)} has hit the ${money(policy.dailyLossLimit)} circuit breaker. All trading is paused for today.`,
  });

  const failedDetail = checks.find((c) => !c.passed) ?? null;
  const approved = failedDetail === null;

  const checksMap = {
    singleTrade: checks[0].passed,
    dailySpend: checks[1].passed,
    positionLimit: checks[2].passed,
    concentration: checks[3].passed,
    dailyLoss: checks[4].passed,
  };

  return {
    approved,
    reason: approved
      ? "All guardrail checks passed."
      : failedDetail!.detail,
    failedCheck: failedDetail?.key ?? null,
    checks: checksMap,
    checkDetails: checks,
    tradeValue,
  };
}

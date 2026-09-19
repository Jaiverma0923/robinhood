/**
 * Pure fee-math helpers. No I/O, no config reads — the fee rate always comes
 * in as a parameter (from the loaded config) so this stays a single,
 * reusable source of truth for anywhere a fee needs to be computed, exactly
 * like `guardrail.ts` is the single source of truth for risk checks.
 */

function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

export interface FeeQuote {
  bps: number;
  /** Trade value before fees. */
  tradeValue: number;
  feeAmount: number;
  /** BUY: amount the wallet pays in total. SELL: amount deducted from proceeds. */
  total: number;
  /** For a SELL, what the user actually nets after the fee is taken out. */
  netProceeds: number;
}

export function computeFee(tradeValue: number, feeBps: number): FeeQuote {
  const feeAmount = round2((tradeValue * feeBps) / 10_000);
  return {
    bps: feeBps,
    tradeValue: round2(tradeValue),
    feeAmount,
    total: round2(tradeValue + feeAmount),
    netProceeds: round2(tradeValue - feeAmount),
  };
}

export function formatBps(bps: number): string {
  return `${(bps / 100).toFixed(2)}%`;
}

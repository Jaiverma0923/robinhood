import type { Portfolio, RiskPolicy } from "./types";

export const DEFAULT_POLICY: RiskPolicy = {
  dailySpendCap: 5000,
  maxSingleTrade: 500,
  maxPositionValue: 2000,
  maxConcentration: 0.25,
  dailyLossLimit: 250,
};

export const DEFAULT_PORTFOLIO: Portfolio = {
  cash: 4100,
  holdings: [
    { symbol: "AAPL", value: 1250 },
    { symbol: "NVDA", value: 850 },
    { symbol: "MSFT", value: 600 },
    { symbol: "TSLA", value: 400 },
  ],
  dailyPnl: -85,
};

import fs from "fs";
import path from "path";
import type { ActivityEntry, Portfolio, RiskPolicy } from "./types";
import { DEFAULT_POLICY, DEFAULT_PORTFOLIO } from "./defaults";

interface DbShape {
  policy: RiskPolicy;
  portfolio: Portfolio;
  activity: ActivityEntry[];
  dailySpend: number;
  lastResetDate: string; // yyyy-mm-dd, for same-day spend accumulation
}

const DATA_DIR = path.join(process.cwd(), "data");
const DB_PATH = path.join(DATA_DIR, "db.json");

function seedActivity(): ActivityEntry[] {
  const now = Date.now();
  const minsAgo = (m: number) => new Date(now - m * 60_000).toISOString();
  return [
    {
      id: "seed-1",
      timestamp: minsAgo(96),
      symbol: "AAPL",
      side: "BUY",
      quantity: 5,
      estimatedPrice: 250,
      tradeValue: 1250,
      decision: "APPROVED",
      reason: "All guardrail checks passed.",
      failedCheck: null,
      checkDetails: [],
      execution: { status: "executed", orderId: "RH-MOCK-10241" },
      agent: "portfolio-rebalancer-agent",
    },
    {
      id: "seed-2",
      timestamp: minsAgo(74),
      symbol: "TSLA",
      side: "BUY",
      quantity: 6,
      estimatedPrice: 200,
      tradeValue: 1200,
      decision: "BLOCKED",
      reason:
        "$1,200.00 exceeds the $500.00 per-trade limit.",
      failedCheck: "singleTrade",
      checkDetails: [],
      execution: { status: "not_attempted", orderId: null },
      agent: "momentum-scalper-agent",
    },
    {
      id: "seed-3",
      timestamp: minsAgo(51),
      symbol: "NVDA",
      side: "BUY",
      quantity: 2,
      estimatedPrice: 175,
      tradeValue: 350,
      decision: "APPROVED",
      reason: "All guardrail checks passed.",
      failedCheck: null,
      checkDetails: [],
      execution: { status: "executed", orderId: "RH-MOCK-10339" },
      agent: "momentum-scalper-agent",
    },
    {
      id: "seed-4",
      timestamp: minsAgo(33),
      symbol: "MSFT",
      side: "BUY",
      quantity: 4,
      estimatedPrice: 420,
      tradeValue: 1680,
      decision: "BLOCKED",
      reason:
        "MSFT position would reach $2,280.00, over the $2,000.00 cap.",
      failedCheck: "positionLimit",
      checkDetails: [],
      execution: { status: "not_attempted", orderId: null },
      agent: "portfolio-rebalancer-agent",
    },
    {
      id: "seed-5",
      timestamp: minsAgo(12),
      symbol: "AAPL",
      side: "SELL",
      quantity: 2,
      estimatedPrice: 245,
      tradeValue: 490,
      decision: "APPROVED",
      reason: "All guardrail checks passed.",
      failedCheck: null,
      checkDetails: [],
      execution: { status: "executed", orderId: "RH-MOCK-10412" },
      agent: "portfolio-rebalancer-agent",
    },
  ];
}

function todayKey(): string {
  return new Date().toISOString().slice(0, 10);
}

function defaultDb(): DbShape {
  return {
    policy: { ...DEFAULT_POLICY },
    portfolio: {
      ...DEFAULT_PORTFOLIO,
      holdings: DEFAULT_PORTFOLIO.holdings.map((h) => ({ ...h })),
    },
    activity: seedActivity(),
    dailySpend: 3420, // consistent with the two approved BUYs above ($1250+$350) + $1820 of other same-day agent activity
    lastResetDate: todayKey(),
  };
}

let cache: DbShape | null = null;

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

function load(): DbShape {
  if (cache) return cache;
  ensureDataDir();
  if (fs.existsSync(DB_PATH)) {
    try {
      const raw = fs.readFileSync(DB_PATH, "utf-8");
      cache = JSON.parse(raw) as DbShape;
      return cache;
    } catch {
      // fall through to default
    }
  }
  cache = defaultDb();
  persist();
  return cache;
}

function persist() {
  if (!cache) return;
  ensureDataDir();
  fs.writeFileSync(DB_PATH, JSON.stringify(cache, null, 2), "utf-8");
}

export function getPolicy(): RiskPolicy {
  return { ...load().policy };
}

export function setPolicy(policy: RiskPolicy) {
  const db = load();
  db.policy = { ...policy };
  persist();
}

export function getPortfolio(): Portfolio {
  const db = load();
  return {
    ...db.portfolio,
    holdings: db.portfolio.holdings.map((h) => ({ ...h })),
  };
}

export function getDailySpend(): number {
  return load().dailySpend;
}

export function getActivity(): ActivityEntry[] {
  return [...load().activity].sort((a, b) => (a.timestamp < b.timestamp ? 1 : -1));
}

function applyPortfolioEffects(db: DbShape, entry: ActivityEntry) {
  if (entry.side === "BUY") {
    db.dailySpend = round2(db.dailySpend + entry.tradeValue);
    db.portfolio.cash = round2(db.portfolio.cash - entry.tradeValue);
    const holding = db.portfolio.holdings.find((h) => h.symbol === entry.symbol);
    if (holding) {
      holding.value = round2(holding.value + entry.tradeValue);
    } else {
      db.portfolio.holdings.push({ symbol: entry.symbol, value: entry.tradeValue });
    }
  } else {
    db.portfolio.cash = round2(db.portfolio.cash + entry.tradeValue);
    const holding = db.portfolio.holdings.find((h) => h.symbol === entry.symbol);
    if (holding) {
      holding.value = round2(Math.max(0, holding.value - entry.tradeValue));
    }
  }
}

export function recordTrade(entry: ActivityEntry, options: { applyEffects: boolean }) {
  const db = load();
  db.activity.push(entry);

  if (options.applyEffects && entry.decision === "APPROVED") {
    applyPortfolioEffects(db, entry);
  }
  persist();
}

/**
 * Records a trade that has cleared the guardrail but has NOT been executed
 * yet — used by the simulator's fee flow, where execution and portfolio
 * effects only happen after the platform fee is confirmed on-chain (or the
 * caller decides to finalize without a fee, e.g. tests). No portfolio
 * effects are applied at this point.
 */
export function recordPendingTrade(entry: ActivityEntry) {
  const db = load();
  db.activity.push(entry);
  persist();
}

export function getActivityEntry(id: string): ActivityEntry | undefined {
  return load().activity.find((a) => a.id === id);
}

/**
 * Finalizes a previously-pending, guardrail-approved trade: applies the
 * portfolio effects (same logic as an immediate approval) and stamps on the
 * execution result and, if present, the fee that was collected for it.
 * Never called for a trade whose guardrail decision was BLOCKED.
 */
export function finalizeTrade(
  id: string,
  update: { execution: ActivityEntry["execution"]; fee?: ActivityEntry["fee"] }
): ActivityEntry | null {
  const db = load();
  const entry = db.activity.find((a) => a.id === id);
  if (!entry || entry.decision !== "APPROVED") return null;

  entry.execution = update.execution;
  if (update.fee) entry.fee = update.fee;

  if (update.execution.status === "executed") {
    applyPortfolioEffects(db, entry);
  }
  persist();
  return { ...entry };
}

export function resetDemoData() {
  cache = defaultDb();
  persist();
}

function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

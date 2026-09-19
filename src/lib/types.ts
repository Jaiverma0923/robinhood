export type Side = "BUY" | "SELL";

export interface RiskPolicy {
  dailySpendCap: number;
  maxSingleTrade: number;
  maxPositionValue: number;
  maxConcentration: number; // 0-1 fraction of total portfolio value
  dailyLossLimit: number;
}

export interface Holding {
  symbol: string;
  value: number;
}

export interface Portfolio {
  cash: number;
  holdings: Holding[];
  /** Realized + unrealized P&L for the current trading day. Negative = loss. */
  dailyPnl: number;
}

export interface TradeRequest {
  symbol: string;
  side: Side;
  quantity: number;
  estimatedPrice: number;
}

export interface GuardrailChecks {
  singleTrade: boolean;
  dailySpend: boolean;
  positionLimit: boolean;
  concentration: boolean;
  dailyLoss: boolean;
}

export type CheckKey = keyof GuardrailChecks;

export interface CheckDetail {
  key: CheckKey;
  label: string;
  passed: boolean;
  detail: string;
}

export interface GuardrailResult {
  approved: boolean;
  reason: string | null;
  failedCheck: CheckKey | null;
  checks: GuardrailChecks;
  checkDetails: CheckDetail[];
  tradeValue: number;
}

export type ExecutionStatus = "executed" | "not_attempted";

export interface ExecutionResult {
  status: ExecutionStatus;
  orderId: string | null;
}

export interface FeeInfo {
  bps: number;
  amount: number;
  token: string | null;
  recipient: string | null;
  /** Populated once the on-chain testnet fee transfer is submitted/confirmed. */
  txHash: string | null;
}

export interface ActivityEntry {
  id: string;
  timestamp: string; // ISO
  symbol: string;
  side: Side;
  quantity: number;
  estimatedPrice: number;
  tradeValue: number;
  decision: "APPROVED" | "BLOCKED";
  reason: string;
  failedCheck: CheckKey | null;
  checkDetails: CheckDetail[];
  execution: ExecutionResult;
  agent: string;
  /** Present only for trades that went through the simulator's platform-fee flow. */
  fee?: FeeInfo;
}

/**
 * Public (non-secret) platform-fee / testnet configuration handed to the
 * client so it can quote a fee and know which token/chain/recipient to use.
 * Never includes RPC credentials or anything server-only.
 */
export interface PublicFeeConfig {
  feeBps: number;
  tokenAddress: string;
  tokenSymbol: string;
  tokenDecimals: number;
  recipientAddress: string;
  chainIdHex: string;
  chainIdDecimal: number;
  chainName: string;
  blockExplorerBase: string | null;
  isTestnet: true;
}

export type TxPhase =
  | "idle"
  | "evaluating"
  | "blocked"
  | "approved"
  | "awaiting_wallet"
  | "checking_balance"
  | "insufficient_balance"
  | "submitted"
  | "confirmed"
  | "rejected_by_user"
  | "transaction_failed"
  | "guardrail_blocked";

export interface RiskSnapshot {
  dailySpend: number;
  dailySpendCap: number;
  dailyLoss: number;
  dailyLossLimit: number;
  largestPosition: { symbol: string; value: number } | null;
  maxPositionValue: number;
  concentration: number;
  maxConcentration: number;
  approvedCount: number;
  blockedCount: number;
  portfolioValue: number;
}

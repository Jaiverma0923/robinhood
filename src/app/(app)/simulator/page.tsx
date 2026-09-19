"use client";

import { useEffect, useState } from "react";
import { Loader2, Sparkles, ShieldAlert, ShieldCheck } from "lucide-react";
import { Card } from "@/components/Card";
import { CheckList } from "@/components/CheckList";
import { GateFlow, type FlowStatus } from "@/components/GateFlow";
import { FeePreviewCard } from "@/components/FeePreviewCard";
import { TxPhaseStatus } from "@/components/TxPhaseStatus";
import { TestnetBadge } from "@/components/TestnetBadge";
import { useToast } from "@/components/Toast";
import { money } from "@/lib/guardrail";
import { computeFee, type FeeQuote } from "@/lib/fees";
import {
  connectWallet,
  ensureChain,
  getErc20Balance,
  sendErc20Transfer,
  waitForReceipt,
  WalletError,
} from "@/lib/wallet";
import { toBaseUnits } from "@/lib/erc20";
import type { CheckDetail, PublicFeeConfig, Side, TxPhase } from "@/lib/types";

interface TradeResponse {
  approved: boolean;
  reason: string;
  checkDetails: CheckDetail[];
  tradeValue: number;
  execution: { status: string; orderId: string | null };
  activityId: string;
  pending: boolean;
}

const PRESETS = [
  {
    label: "Dangerous request",
    description: "20 shares of NVDA at $180 — well over the per-trade limit",
    symbol: "NVDA",
    side: "BUY" as Side,
    quantity: 20,
    estimatedPrice: 180,
    agent: "momentum-scalper-agent",
  },
  {
    label: "Safe request",
    description: "2 shares of AAPL at $180 — comfortably within every limit",
    symbol: "AAPL",
    side: "BUY" as Side,
    quantity: 2,
    estimatedPrice: 180,
    agent: "portfolio-rebalancer-agent",
  },
];

function toFlowStatus(phase: TxPhase): FlowStatus {
  if (phase === "evaluating") return "evaluating";
  if (phase === "blocked" || phase === "guardrail_blocked") return "blocked";
  if (phase === "idle") return "idle";
  return "approved";
}

export default function SimulatorPage() {
  const [symbol, setSymbol] = useState("AAPL");
  const [side, setSide] = useState<Side>("BUY");
  const [quantity, setQuantity] = useState("2");
  const [estimatedPrice, setEstimatedPrice] = useState("180");
  const [agent, setAgent] = useState("trade-simulator");

  const [phase, setPhase] = useState<TxPhase>("idle");
  const [result, setResult] = useState<TradeResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [txHash, setTxHash] = useState<string | null>(null);
  const [orderId, setOrderId] = useState<string | null>(null);
  const [walletAddress, setWalletAddress] = useState<string | null>(null);

  const [feeConfig, setFeeConfig] = useState<PublicFeeConfig | null>(null);
  const [feeConfigError, setFeeConfigError] = useState<string | null>(null);

  const { push } = useToast();

  const qty = parseFloat(quantity) || 0;
  const price = parseFloat(estimatedPrice) || 0;
  const tradeValue = qty * price;

  useEffect(() => {
    let cancelled = false;
    fetch("/api/fee-config")
      .then(async (res) => {
        const data = await res.json();
        if (cancelled) return;
        if (!res.ok) {
          setFeeConfigError(data.error ?? "Platform-fee configuration is unavailable.");
          return;
        }
        setFeeConfig(data as PublicFeeConfig);
      })
      .catch(() => {
        if (!cancelled) setFeeConfigError("Couldn't reach the platform-fee configuration endpoint.");
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const quote: FeeQuote | null =
    feeConfig && result?.approved ? computeFee(result.tradeValue, feeConfig.feeBps) : null;

  const busyPhases: TxPhase[] = ["awaiting_wallet", "checking_balance", "submitted"];

  async function submit(overrides?: Partial<(typeof PRESETS)[number]>) {
    setError(null);
    setResult(null);
    setTxHash(null);
    setOrderId(null);
    setPhase("evaluating");

    const payload = {
      symbol: overrides?.symbol ?? symbol,
      side: overrides?.side ?? side,
      quantity: overrides?.quantity ?? qty,
      estimatedPrice: overrides?.estimatedPrice ?? price,
      agent: overrides?.agent ?? agent,
      // Defer execution to after the platform fee is collected whenever the
      // fee feature is actually configured — otherwise fall back to the
      // original immediate-execution behavior so the simulator still works.
      deferExecution: Boolean(feeConfig),
    };

    if (overrides) {
      setSymbol(payload.symbol);
      setSide(payload.side);
      setQuantity(String(payload.quantity));
      setEstimatedPrice(String(payload.estimatedPrice));
      setAgent(payload.agent);
    }

    try {
      // brief pause so the flow diagram's "evaluating" state is visible —
      // mirrors the real latency of a policy check.
      await new Promise((r) => setTimeout(r, 550));
      const res = await fetch("/api/trade", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "The guardrail rejected this request.");
        setPhase("idle");
        return;
      }
      setResult(data);
      if (!data.approved) {
        setPhase("guardrail_blocked");
        push({ tone: "block", title: "Trade blocked", description: data.reason });
        return;
      }
      if (data.pending) {
        setPhase("approved");
      } else {
        // No fee flow configured — behaves like the original simulator.
        setOrderId(data.execution.orderId);
        setPhase("confirmed");
        push({
          tone: "approve",
          title: "Trade approved",
          description: `Execution simulated. Order ${data.execution.orderId}.`,
        });
      }
    } catch {
      setError("Couldn't reach the guardrail proxy. Try again.");
      setPhase("idle");
    }
  }

  async function payFeeAndExecute() {
    if (!feeConfig || !result || !quote) return;
    setError(null);
    try {
      setPhase("awaiting_wallet");
      const address = await connectWallet();
      setWalletAddress(address);
      await ensureChain(feeConfig.chainIdDecimal);

      setPhase("checking_balance");
      const required = toBaseUnits(quote.feeAmount, feeConfig.tokenDecimals);
      const balance = await getErc20Balance(feeConfig.tokenAddress, address);
      if (balance < required) {
        setPhase("insufficient_balance");
        return;
      }

      setPhase("awaiting_wallet");
      const hash = await sendErc20Transfer(feeConfig.tokenAddress, address, feeConfig.recipientAddress, required);
      setTxHash(hash);
      setPhase("submitted");

      const receipt = await waitForReceipt(hash);
      if (receipt.status !== "success") {
        setPhase("transaction_failed");
        setError("The fee transaction reverted on-chain.");
        return;
      }

      const finalizeRes = await fetch("/api/trade/finalize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ activityId: result.activityId, feeTxHash: hash }),
      });
      const finalizeData = await finalizeRes.json();
      if (!finalizeRes.ok) {
        setPhase("transaction_failed");
        setError(finalizeData.error ?? "Couldn't finalize the trade after the fee was paid.");
        return;
      }

      setOrderId(finalizeData.execution.orderId);
      setPhase("confirmed");
      push({
        tone: "approve",
        title: "Trade executed",
        description: `Fee paid and order ${finalizeData.execution.orderId} filled.`,
      });
    } catch (err) {
      if (err instanceof WalletError && err.code === "user_rejected") {
        setPhase("rejected_by_user");
      } else {
        setPhase("transaction_failed");
      }
      setError(err instanceof Error ? err.message : "Something went wrong with the wallet transaction.");
    }
  }

  const explorerUrl =
    feeConfig?.blockExplorerBase && txHash ? `${feeConfig.blockExplorerBase}/tx/${txHash}` : null;

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-10">
      <header className="flex flex-col gap-3">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-ink-faint">
          Simulate an agent request
        </p>
        <h1 className="text-4xl font-medium tracking-tight text-ink sm:text-5xl">
          Trade simulator
        </h1>
        <p className="max-w-xl text-sm text-ink-muted">
          Submit a request the way an AI trading agent would. It goes to{" "}
          <code className="font-data text-xs text-ink">POST /api/trade</code>, the guardrail
          proxy — never straight to execution. Approved trades pay a small platform fee on a
          public testnet before they execute.
        </p>
        <TestnetBadge chainName={feeConfig?.chainName} />
        {feeConfigError && (
          <p className="max-w-xl text-xs text-ink-faint">
            Platform-fee flow isn&apos;t configured ({feeConfigError}) — trades will still run
            through the guardrail and execute immediately, without a fee step.
          </p>
        )}
      </header>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
        <Card className="lg:col-span-2">
          <h2 className="text-sm font-semibold text-ink">Request</h2>

          <div className="mt-4 flex flex-col gap-4">
            <Field label="Symbol">
              <input
                value={symbol}
                onChange={(e) => setSymbol(e.target.value.toUpperCase())}
                maxLength={6}
                className="input"
                placeholder="AAPL"
              />
            </Field>

            <Field label="Side">
              <div className="flex gap-2">
                {(["BUY", "SELL"] as Side[]).map((s) => (
                  <button
                    key={s}
                    onClick={() => setSide(s)}
                    className={`flex-1 rounded-full border px-3 py-2 text-sm font-medium transition-colors ${
                      side === s
                        ? s === "BUY"
                          ? "border-approve/30 bg-approve/10 text-approve"
                          : "border-block/30 bg-block/10 text-block"
                        : "border-line text-ink-muted hover:border-line-strong"
                    }`}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </Field>

            <div className="grid grid-cols-2 gap-3">
              <Field label="Quantity">
                <input
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  inputMode="decimal"
                  className="input"
                />
              </Field>
              <Field label="Est. price">
                <input
                  value={estimatedPrice}
                  onChange={(e) => setEstimatedPrice(e.target.value)}
                  inputMode="decimal"
                  className="input"
                />
              </Field>
            </div>

            <Field label="Agent">
              <input
                value={agent}
                onChange={(e) => setAgent(e.target.value)}
                className="input font-data text-xs"
              />
            </Field>
          </div>

          <div className="mt-5 rounded-2xl border border-line bg-cream/60 p-4">
            <p className="text-xs font-medium text-ink-faint">Trade summary</p>
            <div className="mt-2 flex items-baseline justify-between">
              <span className="text-sm text-ink">
                {side} {qty || 0} {symbol || "—"}
              </span>
              <span className="font-data text-lg font-medium text-ink">{money(tradeValue)}</span>
            </div>
            <p className="mt-1 text-xs text-ink-faint">
              {qty || 0} shares × {money(price)}/share
            </p>
            {feeConfig && (
              <p className="mt-1 text-xs text-ink-faint">
                + platform fee ({(feeConfig.feeBps / 100).toFixed(2)}%) if approved
              </p>
            )}
          </div>

          <button
            onClick={() => submit()}
            disabled={phase === "evaluating" || busyPhases.includes(phase) || !symbol || qty <= 0 || price <= 0}
            className="mt-4 flex w-full items-center justify-center gap-2 rounded-full bg-ink px-4 py-3 text-sm font-medium text-cream transition-colors hover:bg-flame disabled:cursor-not-allowed disabled:opacity-50"
          >
            {phase === "evaluating" ? (
              <>
                <Loader2 size={15} className="animate-spin" /> Evaluating…
              </>
            ) : (
              "Send to guardrail"
            )}
          </button>

          <div className="mt-5 flex flex-col gap-2 border-t border-line pt-5">
            <p className="flex items-center gap-1.5 text-xs font-medium text-ink-faint">
              <Sparkles size={12} /> Demo scenarios
            </p>
            {PRESETS.map((p) => (
              <button
                key={p.label}
                onClick={() => submit(p)}
                disabled={phase === "evaluating" || busyPhases.includes(phase)}
                className="rounded-2xl border border-line px-3.5 py-2.5 text-left text-xs transition-colors hover:border-line-strong hover:bg-cream disabled:opacity-50"
              >
                <span className="font-medium text-ink">{p.label}</span>
                <span className="mt-0.5 block text-ink-faint">{p.description}</span>
              </button>
            ))}
          </div>

          {walletAddress && (
            <p className="mt-4 truncate font-data text-[11px] text-ink-faint">
              Wallet: {walletAddress}
            </p>
          )}
        </Card>

        <div className="flex flex-col gap-4 lg:col-span-3">
          <Card>
            <p className="text-xs font-medium text-ink-faint">Request path</p>
            <GateFlow status={toFlowStatus(phase)} />
          </Card>

          {error && (
            <Card className="border-block/25 bg-block/[0.05]">
              <p className="text-sm text-block">{error}</p>
            </Card>
          )}

          {result && (
            <>
              <Card
                className={
                  result.approved ? "border-approve/25 bg-approve/[0.05]" : "border-block/25 bg-block/[0.05]"
                }
              >
                <div className="flex items-start gap-3">
                  {result.approved ? (
                    <ShieldCheck size={22} className="mt-0.5 shrink-0 text-approve" />
                  ) : (
                    <ShieldAlert size={22} className="mt-0.5 shrink-0 text-block" />
                  )}
                  <div>
                    <p className={`text-lg font-medium ${result.approved ? "text-approve" : "text-block"}`}>
                      {result.approved ? "Trade approved" : "Trade blocked"}
                    </p>
                    <p className="mt-1 text-sm text-ink-muted">{result.reason}</p>
                  </div>
                </div>
              </Card>

              <Card>
                <p className="mb-3 text-xs font-medium text-ink-faint">Guardrail checks</p>
                <CheckList checks={result.checkDetails} />
              </Card>
            </>
          )}

          {result?.approved && quote && feeConfig && phase !== "confirmed" && (
            <FeePreviewCard
              side={side}
              symbol={result ? symbol : ""}
              quantity={qty}
              quote={quote}
              tokenSymbol={feeConfig.tokenSymbol}
              recipientAddress={feeConfig.recipientAddress}
              busy={busyPhases.includes(phase)}
              disabled={phase === "insufficient_balance"}
              onConfirm={payFeeAndExecute}
            />
          )}

          <TxPhaseStatus
            phase={phase}
            reason={
              phase === "insufficient_balance"
                ? `Your wallet doesn't hold enough ${feeConfig?.tokenSymbol ?? "fee token"} to cover the ${
                    quote ? money(quote.feeAmount) : "fee"
                  } platform fee. No trade was executed.`
                : phase === "rejected_by_user"
                  ? "You rejected the request in your wallet — no trade was executed and no fee was charged."
                  : undefined
            }
            txHash={txHash}
            explorerUrl={explorerUrl}
            orderId={orderId}
          />
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-xs font-medium text-ink-faint">{label}</span>
      {children}
    </label>
  );
}

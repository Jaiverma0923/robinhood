"use client";

import { Loader2 } from "lucide-react";
import { Card } from "@/components/Card";
import { money } from "@/lib/guardrail";
import { formatBps, type FeeQuote } from "@/lib/fees";
import type { Side } from "@/lib/types";

function shortAddress(address: string): string {
  if (address.length <= 10) return address;
  return `${address.slice(0, 6)}…${address.slice(-4)}`;
}

export function FeePreviewCard({
  side,
  symbol,
  quantity,
  quote,
  tokenSymbol,
  recipientAddress,
  busy,
  disabled,
  onConfirm,
}: {
  side: Side;
  symbol: string;
  quantity: number;
  quote: FeeQuote;
  tokenSymbol: string;
  recipientAddress: string;
  busy: boolean;
  disabled?: boolean;
  onConfirm: () => void;
}) {
  const isSell = side === "SELL";

  return (
    <Card className="border-flame/20 bg-flame/[0.03]">
      <p className="text-xs font-medium uppercase tracking-wide text-ink-faint">Confirm transaction</p>
      <div className="mt-2 flex items-baseline justify-between">
        <span className="text-sm font-medium text-ink">
          {side} {quantity} {symbol}
        </span>
      </div>

      <dl className="mt-4 flex flex-col gap-2 border-t border-line pt-4 text-sm">
        <Row label="Trade value" value={money(quote.tradeValue)} />
        <Row label={`Platform fee (${formatBps(quote.bps)})`} value={money(quote.feeAmount)} />
        <Row
          label={isSell ? "Net proceeds" : "Total"}
          value={money(isSell ? quote.netProceeds : quote.total)}
          strong
        />
      </dl>

      <div className="mt-4 flex items-center justify-between border-t border-line pt-4 text-xs text-ink-muted">
        <span>Fee token</span>
        <span className="font-data text-ink">{tokenSymbol} (testnet)</span>
      </div>
      <div className="mt-1.5 flex items-center justify-between text-xs text-ink-muted">
        <span>Recipient</span>
        <span className="font-data text-ink">{shortAddress(recipientAddress)}</span>
      </div>

      <button
        onClick={onConfirm}
        disabled={busy || disabled}
        className="mt-5 flex w-full items-center justify-center gap-2 rounded-full bg-ink px-4 py-3 text-sm font-medium text-cream transition-colors hover:bg-flame disabled:cursor-not-allowed disabled:opacity-50"
      >
        {busy ? (
          <>
            <Loader2 size={15} className="animate-spin" /> Waiting on wallet…
          </>
        ) : (
          "Confirm transaction"
        )}
      </button>
      <p className="mt-2 text-center text-[11px] text-ink-faint">
        This sends a real testnet transaction from your connected wallet. No mainnet funds are ever used.
      </p>
    </Card>
  );
}

function Row({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <dt className="text-ink-muted">{label}</dt>
      <dd className={strong ? "font-data text-base font-semibold text-ink" : "font-data text-ink"}>
        {value}
      </dd>
    </div>
  );
}

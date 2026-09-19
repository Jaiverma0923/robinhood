"use client";

import useSWR from "swr";
import Link from "next/link";
import { motion } from "framer-motion";
import { AlertTriangle, ArrowRight, ShieldCheck, ShieldX } from "lucide-react";
import { Card } from "@/components/Card";
import { MeterBar } from "@/components/MeterBar";
import { money } from "@/lib/guardrail";
import type { Portfolio, RiskSnapshot } from "@/lib/types";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export default function DashboardPage() {
  const { data: snapshot } = useSWR<RiskSnapshot>("/api/risk-snapshot", fetcher, {
    refreshInterval: 4000,
  });
  const { data: portfolio } = useSWR<Portfolio>("/api/portfolio", fetcher, {
    refreshInterval: 4000,
  });

  const remaining = snapshot ? Math.max(0, snapshot.dailySpendCap - snapshot.dailySpend) : 0;
  const totalPortfolio = snapshot?.portfolioValue ?? 0;
  const spendRatio = snapshot ? snapshot.dailySpend / snapshot.dailySpendCap : 0;
  const lossRatio = snapshot ? snapshot.dailyLoss / snapshot.dailyLossLimit : 0;
  const positionRatio = snapshot?.largestPosition
    ? snapshot.largestPosition.value / snapshot.maxPositionValue
    : 0;
  const concentrationRatio = snapshot ? snapshot.concentration / snapshot.maxConcentration : 0;

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-14">
      <header className="flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-ink-faint">
            Risk overview
          </p>
          <h1 className="mt-2 text-4xl font-medium tracking-tight text-ink sm:text-5xl">
            Dashboard
          </h1>
        </div>
        <Link
          href="/simulator"
          className="group flex w-fit items-center gap-2 rounded-full bg-ink px-5 py-2.5 text-sm font-medium text-cream transition-colors hover:bg-flame"
        >
          Submit a trade
          <ArrowRight size={14} className="transition-transform group-hover:translate-x-0.5" />
        </Link>
      </header>

      {/* Hero metric — daily spend dominates the hierarchy */}
      <motion.section
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <p className="text-xs font-medium uppercase tracking-[0.1em] text-ink-faint">Daily spend</p>
        <div className="mt-3 flex flex-wrap items-baseline gap-3">
          <span className="font-data text-6xl font-medium tabular-nums text-ink sm:text-7xl">
            {snapshot ? money(snapshot.dailySpend) : "—"}
          </span>
          <span className="font-data text-2xl text-ink-faint">
            / {snapshot ? money(snapshot.dailySpendCap) : "—"}
          </span>
        </div>
        <p className="mt-2 text-sm text-ink-muted">
          {snapshot ? `${money(remaining)} remaining today` : "Loading remaining budget…"}
        </p>
        <MeterBar ratio={spendRatio} className="mt-5 h-2" />
      </motion.section>

      {/* Secondary metrics — a single statement strip, not colorful cards */}
      <section className="grid grid-cols-2 gap-y-8 border-y border-line py-8 sm:grid-cols-3 md:grid-cols-6">
        <Stat label="Remaining" value={snapshot ? money(remaining) : "—"} />
        <Stat
          label="Daily loss"
          value={snapshot ? money(snapshot.dailyLoss) : "—"}
          danger={lossRatio >= 0.8}
        />
        <Stat
          label="Largest position"
          value={snapshot?.largestPosition ? money(snapshot.largestPosition.value) : "—"}
          sub={snapshot?.largestPosition?.symbol}
        />
        <Stat
          label="Concentration"
          value={snapshot ? `${(snapshot.concentration * 100).toFixed(1)}%` : "—"}
        />
        <Stat
          label="Approved"
          value={snapshot ? String(snapshot.approvedCount) : "—"}
          icon={<ShieldCheck size={13} className="text-approve" />}
        />
        <Stat
          label="Blocked"
          value={snapshot ? String(snapshot.blockedCount) : "—"}
          icon={<ShieldX size={13} className="text-block" />}
        />
      </section>

      {/* Risk headroom meters */}
      <section className="grid grid-cols-1 gap-6 sm:grid-cols-3">
        <Headroom label="Position headroom" ratio={positionRatio} cap={snapshot?.maxPositionValue} />
        <Headroom
          label="Concentration headroom"
          ratio={concentrationRatio}
          cap={snapshot ? snapshot.maxConcentration * 100 : undefined}
          suffix="%"
        />
        <Headroom label="Loss headroom" ratio={lossRatio} cap={snapshot?.dailyLossLimit} />
      </section>

      {/* Portfolio */}
      <Card padded={false} className="overflow-hidden">
        <div className="flex items-center justify-between border-b border-line px-6 py-5">
          <h2 className="text-lg font-medium tracking-tight text-ink">Portfolio</h2>
          <p className="font-data text-sm text-ink-muted">
            {portfolio ? money(totalPortfolio) : "—"} total
          </p>
        </div>
        <ul className="divide-y divide-line">
          <PortfolioRow symbol="Cash" value={portfolio?.cash ?? 0} total={totalPortfolio} isCash />
          {portfolio?.holdings.map((h) => (
            <PortfolioRow key={h.symbol} symbol={h.symbol} value={h.value} total={totalPortfolio} />
          ))}
        </ul>
      </Card>

      {snapshot && snapshot.dailyLoss >= snapshot.dailyLossLimit && (
        <div className="flex items-start gap-3 rounded-2xl border border-block/25 bg-block/[0.05] p-5">
          <AlertTriangle size={18} className="mt-0.5 shrink-0 text-block" />
          <div>
            <p className="text-sm font-medium text-ink">Daily loss circuit breaker tripped</p>
            <p className="mt-0.5 text-sm text-ink-muted">
              Realized and unrealized losses have reached the configured limit. New trades will
              be blocked until the limit is raised or the trading day resets.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

function Stat({
  label,
  value,
  sub,
  danger,
  icon,
}: {
  label: string;
  value: string;
  sub?: string;
  danger?: boolean;
  icon?: React.ReactNode;
}) {
  return (
    <div>
      <div className="flex items-center gap-1.5">
        <p className="text-xs text-ink-faint">{label}</p>
        {icon}
      </div>
      <p className={`mt-1.5 font-data text-xl font-medium tabular-nums ${danger ? "text-block" : "text-ink"}`}>
        {value}
      </p>
      {sub && <p className="mt-0.5 text-[11px] text-ink-faint">{sub}</p>}
    </div>
  );
}

function Headroom({
  label,
  ratio,
  cap,
  suffix,
}: {
  label: string;
  ratio: number;
  cap?: number;
  suffix?: string;
}) {
  return (
    <div className="rounded-2xl border border-line bg-paper p-5">
      <div className="flex items-baseline justify-between">
        <p className="text-xs text-ink-faint">{label}</p>
        <p className="font-data text-xs text-ink-muted">
          limit {cap !== undefined ? `${cap.toLocaleString()}${suffix ?? ""}` : "—"}
        </p>
      </div>
      <MeterBar ratio={ratio} className="mt-3" />
      <p className="mt-2 font-data text-xs text-ink-faint">{Math.min(100, ratio * 100).toFixed(0)}% used</p>
    </div>
  );
}

function PortfolioRow({
  symbol,
  value,
  total,
  isCash,
}: {
  symbol: string;
  value: number;
  total: number;
  isCash?: boolean;
}) {
  const pct = total > 0 ? (value / total) * 100 : 0;
  return (
    <li className="flex items-center justify-between px-6 py-4">
      <div className="flex items-center gap-3">
        <span
          className={`flex h-8 w-8 items-center justify-center rounded-full text-[10px] font-semibold ${
            isCash ? "bg-cream text-ink-muted" : "bg-flame/10 text-flame-deep"
          }`}
        >
          {isCash ? "$" : symbol.slice(0, 2)}
        </span>
        <span className="text-sm text-ink">{symbol}</span>
      </div>
      <div className="flex items-center gap-5">
        <span className="w-12 text-right text-xs text-ink-faint">{pct.toFixed(1)}%</span>
        <span className="w-24 text-right font-data text-sm text-ink">{money(value)}</span>
      </div>
    </li>
  );
}

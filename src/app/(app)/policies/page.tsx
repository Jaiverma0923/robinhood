"use client";

import { useState } from "react";
import useSWR from "swr";
import { RotateCcw, Save, ShieldCheck } from "lucide-react";
import { Card } from "@/components/Card";
import { useToast } from "@/components/Toast";
import type { RiskPolicy } from "@/lib/types";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

const FIELDS: {
  key: keyof RiskPolicy;
  label: string;
  help: string;
  prefix?: string;
  suffix?: string;
  percent?: boolean;
  min: number;
  max: number;
  step: number;
}[] = [
  {
    key: "dailySpendCap",
    label: "Daily spend cap",
    help: "Total dollars the agent can spend across all buy orders today.",
    prefix: "$",
    min: 0,
    max: 20000,
    step: 100,
  },
  {
    key: "maxSingleTrade",
    label: "Maximum single trade",
    help: "Largest dollar value allowed in one order, buy or sell.",
    prefix: "$",
    min: 0,
    max: 5000,
    step: 25,
  },
  {
    key: "maxPositionValue",
    label: "Maximum position",
    help: "Largest dollar value the agent can hold in a single symbol.",
    prefix: "$",
    min: 0,
    max: 10000,
    step: 100,
  },
  {
    key: "dailyLossLimit",
    label: "Daily loss limit",
    help: "Circuit breaker — all trading pauses once today's loss reaches this.",
    prefix: "$",
    min: 0,
    max: 5000,
    step: 25,
  },
  {
    key: "maxConcentration",
    label: "Maximum concentration",
    help: "Largest share of total portfolio value any one symbol can represent.",
    percent: true,
    min: 1,
    max: 100,
    step: 1,
  },
];

export default function PoliciesPage() {
  const { data, mutate } = useSWR<RiskPolicy>("/api/policies", fetcher);
  const [form, setForm] = useState<RiskPolicy | null>(null);
  const [loadedFrom, setLoadedFrom] = useState<RiskPolicy | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { push } = useToast();

  if (data && loadedFrom !== data && !form) {
    setLoadedFrom(data);
    setForm(data);
  }

  if (!form) {
    return (
      <div className="mx-auto max-w-2xl">
        <p className="text-sm text-ink-muted">Loading current policy…</p>
      </div>
    );
  }

  function update(key: keyof RiskPolicy, raw: number, percent?: boolean) {
    setForm((f) => (f ? { ...f, [key]: percent ? raw / 100 : raw } : f) as RiskPolicy);
  }

  async function save() {
    if (!form) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/policies", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error ?? "Couldn't save policy.");
        push({ tone: "block", title: "Save failed", description: json.error });
        return;
      }
      mutate(json, false);
      push({
        tone: "approve",
        title: "Risk policy saved",
        description: "Every new trade will be evaluated against these limits.",
      });
    } catch {
      setError("Couldn't reach the server.");
    } finally {
      setSaving(false);
    }
  }

  function reset() {
    if (data) setForm(data);
    setError(null);
  }

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-10">
      <header className="flex flex-col gap-2">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-ink-faint">
          Configuration
        </p>
        <h1 className="text-4xl font-medium tracking-tight text-ink sm:text-5xl">Risk policies</h1>
        <p className="text-sm text-ink-muted">
          These values are enforced by the guardrail engine on every request — change one and it
          takes effect immediately, on the very next trade.
        </p>
      </header>

      <Card className="flex flex-col gap-8">
        {FIELDS.map((f) => {
          const rawValue = f.percent ? Math.round(form[f.key] * 100) : form[f.key];
          return (
            <div key={f.key} className="flex flex-col gap-2.5">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-baseline sm:justify-between sm:gap-4">
                <div>
                  <label className="text-sm font-medium text-ink">{f.label}</label>
                  <p className="mt-0.5 text-xs text-ink-muted">{f.help}</p>
                </div>
                <div className="relative w-full shrink-0 sm:w-32">
                  {f.prefix && (
                    <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-ink-faint">
                      {f.prefix}
                    </span>
                  )}
                  <input
                    value={rawValue}
                    onChange={(e) => update(f.key, parseFloat(e.target.value) || 0, f.percent)}
                    inputMode="decimal"
                    className="input w-full font-data text-right"
                    style={{ paddingLeft: f.prefix ? "1.4rem" : undefined, paddingRight: f.suffix || f.percent ? "1.6rem" : undefined }}
                  />
                  {f.percent && (
                    <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm text-ink-faint">
                      %
                    </span>
                  )}
                </div>
              </div>
              <input
                type="range"
                min={f.min}
                max={f.max}
                step={f.step}
                value={rawValue}
                onChange={(e) => update(f.key, parseFloat(e.target.value), f.percent)}
                className="h-1.5 w-full cursor-pointer appearance-none rounded-full bg-cream-deep accent-[var(--flame)]"
              />
            </div>
          );
        })}

        {error && <p className="text-sm text-block">{error}</p>}

        <div className="flex gap-3 border-t border-line pt-6">
          <button
            onClick={save}
            disabled={saving}
            className="flex items-center gap-2 rounded-full bg-ink px-5 py-2.5 text-sm font-medium text-cream transition-colors hover:bg-flame disabled:opacity-60"
          >
            <Save size={14} /> {saving ? "Saving…" : "Save changes"}
          </button>
          <button
            onClick={reset}
            className="flex items-center gap-2 rounded-full border border-line px-5 py-2.5 text-sm font-medium text-ink-muted transition-colors hover:border-line-strong hover:text-ink"
          >
            <RotateCcw size={14} /> Reset
          </button>
        </div>
      </Card>

      <Card className="flex items-start gap-3 border-flame/20 bg-flame/[0.04]">
        <ShieldCheck size={18} className="mt-0.5 shrink-0 text-flame-deep" />
        <p className="text-sm text-ink-muted">
          Try it: lower <span className="text-ink">maximum single trade</span> to something
          small, save, then submit a trade above that amount in the simulator. It will be
          blocked immediately — no code change, no redeploy.
        </p>
      </Card>
    </div>
  );
}

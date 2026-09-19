"use client";

import { useMemo, useState } from "react";
import useSWR from "swr";
import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";
import { Card } from "@/components/Card";
import { Badge } from "@/components/Badge";
import { CheckList } from "@/components/CheckList";
import { money } from "@/lib/guardrail";
import { cn } from "@/lib/utils";
import type { ActivityEntry } from "@/lib/types";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

type Filter = "all" | "approved" | "blocked";

export default function ActivityPage() {
  const { data } = useSWR<ActivityEntry[]>("/api/activity", fetcher, { refreshInterval: 4000 });
  const [filter, setFilter] = useState<Filter>("all");
  const [selected, setSelected] = useState<ActivityEntry | null>(null);

  const rows = useMemo(() => {
    if (!data) return [];
    if (filter === "all") return data;
    return data.filter((r) =>
      filter === "approved" ? r.decision === "APPROVED" : r.decision === "BLOCKED"
    );
  }, [data, filter]);

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-8">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-ink-faint">
            Audit trail
          </p>
          <h1 className="mt-2 text-4xl font-medium tracking-tight text-ink sm:text-5xl">
            Activity
          </h1>
        </div>
        <div className="flex gap-1 rounded-full border border-line bg-paper p-1">
          {(["all", "approved", "blocked"] as Filter[]).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={cn(
                "rounded-full px-4 py-1.5 text-xs font-medium capitalize transition-colors",
                filter === f ? "bg-ink text-cream" : "text-ink-muted hover:text-ink"
              )}
            >
              {f}
            </button>
          ))}
        </div>
      </header>

      <Card padded={false} className="overflow-hidden">
        {rows.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-1 py-20 text-center">
            <p className="text-sm text-ink-muted">No requests yet.</p>
            <p className="text-xs text-ink-faint">Submit a trade in the simulator to see it here.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-line text-xs text-ink-faint">
                  <th className="px-6 py-3.5 font-medium">Time</th>
                  <th className="px-3 py-3.5 font-medium">Symbol</th>
                  <th className="px-3 py-3.5 font-medium">Side</th>
                  <th className="px-3 py-3.5 font-medium">Value</th>
                  <th className="px-3 py-3.5 font-medium">Decision</th>
                  <th className="px-3 py-3.5 font-medium">Reason</th>
                  <th className="px-6 py-3.5 font-medium">Execution</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {rows.map((r) => (
                  <tr
                    key={r.id}
                    onClick={() => setSelected(r)}
                    className="cursor-pointer transition-colors hover:bg-cream/70"
                  >
                    <td className="px-6 py-3.5 font-data text-xs text-ink-muted">
                      {new Date(r.timestamp).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </td>
                    <td className="px-3 py-3.5 font-medium text-ink">{r.symbol}</td>
                    <td className="px-3 py-3.5 text-ink-muted">{r.side}</td>
                    <td className="px-3 py-3.5 font-data text-ink">{money(r.tradeValue)}</td>
                    <td className="px-3 py-3.5">
                      <Badge tone={r.decision === "APPROVED" ? "approve" : "block"}>
                        {r.decision === "APPROVED" ? "Approved" : "Blocked"}
                      </Badge>
                    </td>
                    <td className="max-w-[240px] truncate px-3 py-3.5 text-xs text-ink-muted">
                      {r.reason}
                    </td>
                    <td className="px-6 py-3.5 font-data text-xs text-ink-faint">
                      {r.execution.status === "executed" ? r.execution.orderId : "not attempted"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <AnimatePresence>
        {selected && (
          <motion.div
            className="fixed inset-0 z-40 flex items-stretch justify-end bg-ink/30 backdrop-blur-[2px]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setSelected(null)}
          >
            <motion.div
              className="flex h-full w-full max-w-md flex-col overflow-y-auto border-l border-line bg-cream p-7"
              initial={{ x: 40, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: 40, opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="mb-5 flex items-start justify-between">
                <div>
                  <p className="text-xs text-ink-faint">
                    {new Date(selected.timestamp).toLocaleString()}
                  </p>
                  <h2 className="mt-1 text-xl font-medium tracking-tight text-ink">
                    {selected.side} {selected.quantity} {selected.symbol}
                  </h2>
                  <p className="mt-0.5 font-data text-sm text-ink-muted">
                    {money(selected.tradeValue)} · agent: {selected.agent}
                  </p>
                </div>
                <button
                  onClick={() => setSelected(null)}
                  className="rounded-full p-1.5 text-ink-faint transition-colors hover:bg-paper hover:text-ink-muted"
                >
                  <X size={18} />
                </button>
              </div>

              <Badge
                tone={selected.decision === "APPROVED" ? "approve" : "block"}
                className="mb-4 w-fit"
              >
                {selected.decision === "APPROVED" ? "Approved" : "Blocked"}
              </Badge>

              {selected.checkDetails.length > 0 ? (
                <CheckList checks={selected.checkDetails} />
              ) : (
                <p className="text-sm text-ink-muted">{selected.reason}</p>
              )}

              <div className="mt-6 border-t border-line pt-4">
                <p className="text-xs font-medium text-ink-faint">Execution</p>
                <p className="mt-1 font-data text-sm text-ink">
                  {selected.execution.status === "executed"
                    ? `Simulated execution · ${selected.execution.orderId}`
                    : "Not attempted — blocked before reaching execution"}
                </p>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

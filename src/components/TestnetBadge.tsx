import { FlaskConical } from "lucide-react";

export function TestnetBadge({ chainName }: { chainName?: string }) {
  return (
    <div className="inline-flex items-center gap-1.5 rounded-full border border-warn/30 bg-warn/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-warn">
      <FlaskConical size={12} />
      Testnet only{chainName ? ` · ${chainName}` : ""} — no real funds
    </div>
  );
}

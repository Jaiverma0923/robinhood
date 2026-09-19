import { cn } from "@/lib/utils";

export function Badge({
  tone,
  children,
  className,
}: {
  tone: "approve" | "block" | "warn" | "neutral" | "flame";
  children: React.ReactNode;
  className?: string;
}) {
  const tones: Record<typeof tone, string> = {
    approve: "bg-approve/10 text-approve border-approve/25",
    block: "bg-block/10 text-block border-block/25",
    warn: "bg-warn/10 text-warn border-warn/25",
    neutral: "bg-cream text-ink-muted border-line",
    flame: "bg-flame/10 text-flame-deep border-flame/25",
  };

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium leading-none",
        tones[tone],
        className
      )}
    >
      {children}
    </span>
  );
}

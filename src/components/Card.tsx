import { cn } from "@/lib/utils";

export function Card({
  children,
  className,
  padded = true,
}: {
  children: React.ReactNode;
  className?: string;
  padded?: boolean;
}) {
  return (
    <div
      className={cn(
        "rounded-3xl border border-line bg-paper",
        padded && "p-6",
        className
      )}
    >
      {children}
    </div>
  );
}

"use client";

import { FloatingNav } from "@/components/FloatingNav";

const APP_LINKS = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/simulator", label: "Simulator" },
  { href: "/policies", label: "Risk policies" },
  { href: "/activity", label: "Activity" },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-cream">
      <FloatingNav links={APP_LINKS} ctaLabel="View site" ctaHref="/" />
      <main className="mx-auto max-w-6xl px-4 pb-20 pt-28 sm:px-6 sm:pt-32">{children}</main>
    </div>
  );
}

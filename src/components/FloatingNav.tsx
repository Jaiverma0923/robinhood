"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Menu, X, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

export interface NavLink {
  href: string;
  label: string;
}

export function FloatingNav({
  links,
  ctaLabel,
  ctaHref,
  logoHref = "/",
}: {
  links: NavLink[];
  ctaLabel: string;
  ctaHref: string;
  logoHref?: string;
}) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  return (
    <div className="fixed inset-x-0 top-4 z-50 flex justify-center px-4 sm:top-6">
      <div className="flex w-full max-w-3xl flex-col items-center">
        <nav className="soft-shadow flex w-full items-center justify-between gap-4 rounded-full border border-line bg-paper/90 px-3 py-2 backdrop-blur-md sm:px-4">
          <Link href={logoHref} className="flex items-center gap-2 rounded-full px-2 py-1.5">
            <Mark />
            <span className="font-medium text-[15px] tracking-tight text-ink">Boundary</span>
          </Link>

          <div className="hidden items-center gap-1 md:flex">
            {links.map((link) => {
              const active = link.href.startsWith("/") && pathname === link.href;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={cn(
                    "rounded-full px-3.5 py-1.5 text-[13.5px] font-medium text-ink-soft transition-colors hover:bg-cream hover:text-ink",
                    active && "bg-cream text-ink"
                  )}
                >
                  {link.label}
                </Link>
              );
            })}
          </div>

          <div className="flex items-center gap-2">
            <Link
              href={ctaHref}
              className="hidden items-center gap-1.5 rounded-full bg-ink px-4 py-2 text-[13.5px] font-medium text-cream transition-colors hover:bg-flame sm:flex"
            >
              {ctaLabel}
              <ArrowRight size={13} />
            </Link>
            <button
              onClick={() => setOpen((o) => !o)}
              className="flex h-9 w-9 items-center justify-center rounded-full text-ink-soft transition-colors hover:bg-cream md:hidden"
              aria-label="Toggle menu"
            >
              {open ? <X size={18} /> : <Menu size={18} />}
            </button>
          </div>
        </nav>

        <AnimatePresence>
          {open && (
            <motion.div
              initial={{ opacity: 0, y: -8, height: 0 }}
              animate={{ opacity: 1, y: 0, height: "auto" }}
              exit={{ opacity: 0, y: -8, height: 0 }}
              transition={{ duration: 0.2 }}
              className="soft-shadow mt-2 w-full overflow-hidden rounded-3xl border border-line bg-paper md:hidden"
            >
              <div className="flex flex-col gap-1 p-3">
                {links.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    onClick={() => setOpen(false)}
                    className="rounded-xl px-3.5 py-2.5 text-sm font-medium text-ink-soft transition-colors hover:bg-cream hover:text-ink"
                  >
                    {link.label}
                  </Link>
                ))}
                <Link
                  href={ctaHref}
                  onClick={() => setOpen(false)}
                  className="mt-1 flex items-center justify-center gap-1.5 rounded-xl bg-ink px-4 py-2.5 text-sm font-medium text-cream"
                >
                  {ctaLabel}
                  <ArrowRight size={13} />
                </Link>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

export function Mark({ size = 22 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden>
      <rect x="0.5" y="0.5" width="23" height="23" rx="7" fill="var(--ink)" />
      <path
        d="M7 12h3.2M13.8 12H17"
        stroke="var(--cream)"
        strokeWidth="1.4"
        strokeLinecap="round"
        strokeDasharray="0.1 3.6"
      />
      <rect x="10.4" y="6" width="3.2" height="12" rx="1" fill="var(--flame)" />
    </svg>
  );
}

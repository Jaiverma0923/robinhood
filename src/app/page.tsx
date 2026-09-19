import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { FloatingNav } from "@/components/FloatingNav";
import { FlowingGlow } from "@/components/FlowingGlow";
import { GuardrailOrbit } from "@/components/GuardrailOrbit";
import { HeroRiskField } from "@/components/HeroRiskField";
import { HeroCtaButtons } from "@/components/HeroCtaButtons";
import { HeroMiniStat } from "@/components/HeroMiniStat";
import { HeroVisual, HeroVisualLayer } from "@/components/HeroVisual";
import { PulseDot } from "@/components/PulseDot";
import { LiveTradeDemo } from "@/components/LiveTradeDemo";
import { Reveal } from "@/components/Reveal";
import { ValueCards } from "@/components/ValueCards";

const MARKETING_LINKS = [
  { href: "#how-it-works", label: "How it works" },
  { href: "#controls", label: "Risk controls" },
  { href: "#demo", label: "Preview" },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-cream">
      <FloatingNav links={MARKETING_LINKS} ctaLabel="Open dashboard" ctaHref="/dashboard" />
      <Hero />
      <ValueSection />
      <HowItWorks />
      <DemoSection />
      <FinalCta />
      <Footer />
    </div>
  );
}

function Hero() {
  return (
    <section className="relative overflow-hidden px-4 pb-24 pt-40 sm:px-6 sm:pt-48">
      <FlowingGlow className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[720px] w-full opacity-90" />

      {/* Barely-there grain, so the cream field reads as textured paper
          rather than a flat digital fill. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[820px] w-full opacity-[0.05] mix-blend-multiply"
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='160'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")",
        }}
      />

      {/* Soft vignette so the edges of the hero recede slightly, giving the
          risk field something to sit inside rather than floating on a flat
          field. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[820px] w-full"
        style={{
          background:
            "radial-gradient(ellipse 70% 60% at 55% 30%, transparent 55%, rgba(24,20,14,0.05) 100%)",
        }}
      />

      {/* The large, screen-wide "risk engine" visual — travels slowly
          through the hero behind the copy. Tablet/desktop only. */}
      <HeroRiskField className="pointer-events-none absolute inset-x-0 top-0 hidden h-[820px] w-full md:block" />

      {/* Compact fallback for phones: no travel, no parallax, just the
          core system, tucked into the open margin beside the copy. */}
      <GuardrailOrbit
        className="pointer-events-none absolute -right-16 top-16 h-[300px] w-[300px] opacity-80 md:hidden"
        style={{
          maskImage: "linear-gradient(to left, black 45%, transparent 88%)",
          WebkitMaskImage: "linear-gradient(to left, black 45%, transparent 88%)",
        }}
      />

      <div className="mx-auto max-w-4xl text-center">
        {/* 200–700ms */}
        <Reveal delay={0.2} y={24} duration={0.5}>
          <div className="mx-auto mb-6 inline-flex items-center gap-2 rounded-full border border-line bg-paper/70 px-4 py-1.5 text-xs font-medium text-ink-soft backdrop-blur">
            <PulseDot className="bg-flame" />
            Built for Robinhood&apos;s Trading MCP
          </div>
        </Reveal>

        <Reveal delay={0.25} y={22} duration={0.5}>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-ink-muted">
            The risk layer for
          </p>
        </Reveal>

        {/* 350–900ms, blur → clear headline reveal */}
        <Reveal delay={0.35} y={30} blur duration={0.55}>
          <h1 className="mt-3 text-[13vw] font-medium leading-[0.96] tracking-tight text-ink sm:text-7xl md:text-8xl">
            <span className="font-editorial">Autonomous</span> Trading
          </h1>
        </Reveal>

        {/* 500–1000ms */}
        <Reveal delay={0.5} y={28} duration={0.5}>
          <p className="mx-auto mt-8 max-w-lg text-[15px] leading-relaxed text-ink-soft sm:text-base">
            AI agents can make trading decisions at machine speed. Risk limits should be
            enforced at machine speed too — before an order ever reaches execution.
          </p>
        </Reveal>

        {/* 650–1100ms */}
        <Reveal delay={0.65} y={24} duration={0.45}>
          <HeroCtaButtons />
        </Reveal>
      </div>

      {/* Hero visual enters first in time (0–500ms) even though it sits below
          the text in the layout: lower + scaled down + transparent → final
          position + full scale. */}
      <Reveal delay={0} duration={0.5} y={40} scale={0.92} className="mx-auto mt-20 max-w-3xl">
        <HeroVisual className="soft-shadow-lg overflow-hidden rounded-[32px] border border-line bg-paper">
          <div className="flex items-center gap-2 border-b border-line px-6 py-4">
            <span className="h-2.5 w-2.5 rounded-full bg-block/50" />
            <span className="h-2.5 w-2.5 rounded-full bg-warn/50" />
            <span className="h-2.5 w-2.5 rounded-full bg-approve/50" />
            <span className="ml-3 font-data text-xs text-ink-faint">guardrail — request timeline</span>
          </div>
          <HeroVisualLayer strength={1.5} className="grid grid-cols-1 divide-y divide-line sm:grid-cols-3 sm:divide-x sm:divide-y-0">
            <HeroMiniStat label="Daily spend cap" value="$5,000" index={0} />
            <HeroMiniStat label="Max single trade" value="$500" index={1} />
            <HeroMiniStat label="Daily loss limit" value="$250" index={2} />
          </HeroVisualLayer>
        </HeroVisual>
      </Reveal>
    </section>
  );
}

function ValueSection() {
  return (
    <section id="controls" className="scroll-mt-28 px-4 py-24 sm:px-6 sm:py-32">
      <div className="mx-auto max-w-6xl">
        <Reveal>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-ink-muted">
            [ Risk controls ]
          </p>
          <h2 className="mt-3 max-w-2xl text-4xl font-medium leading-[1.05] tracking-tight text-ink sm:text-5xl">
            Everything you need to <span className="font-editorial">control</span> AI trading
          </h2>
        </Reveal>

        <ValueCards />
      </div>
    </section>
  );
}

const STEPS = [
  {
    n: "01",
    title: "AI agent requests trade",
    body: "The agent calls a single endpoint with a symbol, side, quantity, and price — the same shape it would send to a real execution API.",
  },
  {
    n: "02",
    title: "Guardrail evaluates policy",
    body: "Five independent checks run against your configured limits: single trade, daily spend, position size, concentration, and daily loss.",
  },
  {
    n: "03",
    title: "Trade approved or blocked",
    body: "Only requests that clear every check are forwarded to execution. Everything else is stopped and returned with the exact reason.",
  },
  {
    n: "04",
    title: "Decision is logged",
    body: "Approved and blocked requests both land in the audit trail, with a full breakdown of which checks passed or failed.",
  },
];

function HowItWorks() {
  return (
    <section id="how-it-works" className="scroll-mt-28 border-y border-line bg-paper/60 px-4 py-24 sm:px-6 sm:py-32">
      <div className="mx-auto max-w-5xl">
        <Reveal>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-ink-muted">
            [ How it works ]
          </p>
          <h2 className="mt-3 max-w-xl text-4xl font-medium leading-[1.05] tracking-tight text-ink sm:text-5xl">
            Put a <span className="font-editorial">boundary</span> around autonomous trading
          </h2>
        </Reveal>

        <div className="mt-16 flex flex-col">
          {STEPS.map((step, i) => (
            <Reveal key={step.n} delay={i * 0.05}>
              <div className="grid grid-cols-[auto_1fr] items-start gap-6 border-t border-line py-8 first:border-t-0 sm:grid-cols-[120px_1fr] sm:gap-10">
                <span className="font-editorial text-4xl text-flame-deep/70 sm:text-5xl">{step.n}</span>
                <div>
                  <h3 className="text-xl font-medium tracking-tight text-ink sm:text-2xl">
                    {step.title}
                  </h3>
                  <p className="mt-2 max-w-lg text-sm leading-relaxed text-ink-muted sm:text-[15px]">
                    {step.body}
                  </p>
                </div>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

function DemoSection() {
  return (
    <section id="demo" className="scroll-mt-28 px-4 py-24 sm:px-6 sm:py-32">
      <div className="mx-auto max-w-4xl">
        <Reveal className="text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-ink-muted">
            [ Preview ]
          </p>
          <h2 className="mx-auto mt-3 max-w-xl text-4xl font-medium leading-[1.05] tracking-tight text-ink sm:text-5xl">
            See the guardrail <span className="font-editorial">decide</span>
          </h2>
        </Reveal>

        <Reveal delay={0.1} className="mt-14">
          <LiveTradeDemo />
        </Reveal>
      </div>
    </section>
  );
}

function FinalCta() {
  return (
    <section className="border-t border-line px-4 py-24 sm:px-6 sm:py-32">
      <Reveal className="mx-auto max-w-2xl text-center">
        <h2 className="text-4xl font-medium leading-[1.05] tracking-tight text-ink sm:text-5xl">
          Put a boundary around <span className="font-editorial">autonomous trading</span>
        </h2>
        <p className="mx-auto mt-5 max-w-md text-[15px] text-ink-muted">
          Configure your limits, run a trade through the simulator, and watch the guardrail
          decide in real time.
        </p>
        <Link
          href="/dashboard"
          className="mt-8 inline-flex items-center gap-2 rounded-full bg-ink px-7 py-3.5 text-sm font-medium text-cream transition-colors hover:bg-flame"
        >
          Open dashboard
          <ArrowRight size={15} />
        </Link>
      </Reveal>
    </section>
  );
}

function Footer() {
  return (
    <footer className="border-t border-line px-4 py-10 sm:px-6">
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 text-xs text-ink-faint sm:flex-row">
        <span>Boundary — a guardrail prototype for AI trading agents</span>
        <span>Execution is simulated in this MVP. No real trades are placed.</span>
      </div>
    </footer>
  );
}

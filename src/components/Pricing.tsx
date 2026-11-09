import { useState, type ComponentType } from "react";
import { ArrowRight, BadgePercent, Check, Clock, Crown, Hourglass, Trophy, Users } from "lucide-react";
import { PRICING, type PricingPlan, type ServiceId } from "@/data/site";
import { useBooking } from "@/context/booking";
import { usePublicData } from "@/context/publicData";
import { cn } from "@/utils/cn";
import { Button } from "./ui/Button";
import { Reveal } from "./ui/Reveal";
import { Rupee } from "./ui/Rupee";
import { SectionHeading } from "./ui/SectionHeading";
import { Tabs, type TabItem } from "./ui/Tabs";

const ICONS: Record<ServiceId, ComponentType<{ className?: string }>> = {
  hourly: Clock,
  pack3: Hourglass,
  daypass: Crown,
  group: Users,
  tournament: Trophy,
};

type ConsoleTab = "ps4" | "ps4pro";

function PlanCard({ plan, consoleTab }: { plan: PricingPlan; consoleTab: ConsoleTab }) {
  const { openBooking } = useBooking();
  const Icon = ICONS[plan.id];
  const isPro = consoleTab === "ps4pro";
  const activePrice = isPro ? plan.ps4ProPrice : plan.ps4Price;
  const activeSavings = isPro ? plan.ps4ProSavings : plan.ps4Savings;
  const consolePref = isPro ? "PS4 Pro" : "PS4";
  const features = [
    ...(plan.bonusMinutes && plan.bonusMinutes > 0 ? [`${plan.bonusMinutes} mins bonus play time`] : []),
    ...plan.features.filter((feature) => !/bonus play time/i.test(feature)),
  ];

  return (
    <article
      className={cn(
        "group relative flex h-full flex-col rounded-2xl border p-6 transition-all duration-300 hover:-translate-y-1.5 sm:p-7",
        plan.featured
          ? "neon-frame border-transparent bg-linear-to-b from-blood/[0.16] to-coal shadow-[0_30px_80px_-30px_rgba(229,9,20,0.75)]"
          : "border-white/10 bg-coal hover:border-blood/50 hover:shadow-[0_24px_60px_-24px_rgba(229,9,20,0.55)]",
      )}
    >
      {plan.badge && (
        <span className="absolute -top-3 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-blood px-3.5 py-1 font-tech text-xs font-bold uppercase tracking-[0.2em] shadow-[0_0_20px_rgba(229,9,20,0.6)]">
          {plan.badge}
        </span>
      )}

      <div className="flex items-center justify-between">
        <span
          className={cn(
            "grid h-12 w-12 place-items-center rounded-xl border transition-transform duration-300 group-hover:scale-110",
            plan.featured ? "border-blood/50 bg-blood/15 text-blood-300" : "border-white/10 bg-white/[0.04] text-white/80",
          )}
        >
          <Icon className="h-6 w-6" />
        </span>
        <span className="font-tech text-xs font-bold uppercase tracking-[0.26em] text-white/40">{plan.category}</span>
      </div>

      <h3 className="mt-6 font-display text-lg font-black uppercase tracking-wide">{plan.name}</h3>
      <p className="mt-1.5 text-sm text-white/55">{plan.tagline}</p>

      {/* Main price */}
      <div className="mt-6 flex items-end gap-2">
        <span className="font-display text-5xl font-black leading-none tracking-tight">
          <Rupee className="text-[0.8em]" />
          {activePrice}
        </span>
        <span className="pb-1 font-tech text-base font-semibold text-white/55">{plan.unit}</span>
      </div>

      {/* Dual rate breakdown tag */}
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <span className="inline-flex items-center gap-1.5 rounded-md border border-white/10 bg-black/40 px-2 py-1 font-tech text-xs text-white/70">
          <span className={cn("font-bold", !isPro && "text-blood-300")}>PS4: ₹{plan.ps4Price}</span>
          <span className="text-white/25">·</span>
          <span className={cn("font-bold", isPro && "text-blood-300")}>PS4 Pro: ₹{plan.ps4ProPrice}</span>
        </span>
        {activeSavings && (
          <span className="inline-flex items-center gap-1 rounded-md border border-blood/40 bg-blood/10 px-2 py-1 font-tech text-xs font-bold uppercase tracking-[0.14em] text-blood-300">
            <BadgePercent className="h-3 w-3" />
            {activeSavings}
          </span>
        )}
      </div>

      <div aria-hidden="true" className="my-6 h-px bg-linear-to-r from-white/15 via-white/5 to-transparent" />

      <ul className="flex-1 space-y-3">
        {features.map((feature) => (
          <li key={feature} className="flex items-start gap-3 text-sm text-white/75">
            <span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-blood/15 text-blood-400">
              <Check className="h-3 w-3" strokeWidth={3.5} />
            </span>
            {feature}
          </li>
        ))}
      </ul>

      <Button
        className="mt-8 w-full"
        variant={plan.featured ? "primary" : "outline"}
        onClick={() => openBooking({ service: plan.id, consolePref })}
      >
        {plan.cta} ({consolePref})
      </Button>
    </article>
  );
}

export function Pricing() {
  const { openBooking } = useBooking();
  const { pricing, backendConnected } = usePublicData();
  const [consoleTab, setConsoleTab] = useState<ConsoleTab>("ps4");

  const livePricing: PricingPlan[] = (() => {
    if (!backendConnected) return PRICING;

    const activeConsolePricing = pricing.filter(
      (record) => (record.category === "ps4" || record.category === "ps4pro") && record.is_active,
    );
    const durations = [...new Set(activeConsolePricing.map((record) => record.duration_minutes))].sort((a, b) => a - b);

    return durations.map((duration, index) => {
      const base = PRICING.find((plan) => {
        const knownDuration = plan.id === "hourly" ? 60 : plan.id === "pack3" ? 180 : 300;
        return knownDuration === duration;
      });
      const ps4Record = activeConsolePricing.find((record) => record.category === "ps4" && record.duration_minutes === duration);
      const ps4ProRecord = activeConsolePricing.find(
        (record) => record.category === "ps4pro" && record.duration_minutes === duration,
      );
      const fallbackPs4 = base?.ps4Price ?? 0;
      const fallbackPs4Pro = base?.ps4ProPrice ?? 0;
      const durationLabel = duration >= 60 && duration % 60 === 0 ? `${duration / 60} hour${duration === 60 ? "" : "s"}` : `${duration} mins`;

      return {
        ...(base ?? {
          id: "hourly" as const,
          name: `${durationLabel} Session`,
          category: "Custom Session",
          unit: `/ ${durationLabel.toLowerCase()}`,
          tagline: "A flexible session configured by the lounge.",
          features: ["Access to full game library", "DualShock 4 controllers"],
          cta: "Book Session",
        }),
        id: base?.id ?? ("hourly" as const),
        name: ps4Record?.label ?? ps4ProRecord?.label ?? `${durationLabel} Session`,
        ps4Price: Number(ps4Record?.price ?? fallbackPs4),
        ps4ProPrice: Number(ps4ProRecord?.price ?? fallbackPs4Pro),
        bonusMinutes: Number(ps4Record?.bonus_minutes ?? ps4ProRecord?.bonus_minutes ?? base?.bonusMinutes ?? 0),
        unit: base?.unit ?? `/ ${durationLabel.toLowerCase()}`,
        featured: base?.featured ?? index === durations.length - 1,
      };
    });
  })();

  const wholeLoungePrice = pricing.find((p) => p.category === "whole_lounge" && p.is_active)?.price ?? 2500;
  const ps4Hr = livePricing[0]?.ps4Price ?? 70;
  const ps4ProHr = livePricing[0]?.ps4ProPrice ?? 90;
  const dynamicTabs: TabItem<ConsoleTab>[] = [
    { id: "ps4", label: "PlayStation 4", icon: <span className="rounded bg-black/30 px-1.5 py-0.5 text-[10px]">₹{ps4Hr}/hr</span> },
    { id: "ps4pro", label: "PlayStation 4 Pro", icon: <span className="rounded bg-black/30 px-1.5 py-0.5 text-[10px]">₹{ps4ProHr}/hr</span> },
  ];

  return (
    <section id="pricing" aria-labelledby="pricing-title" className="relative py-20 sm:py-28">
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 bg-grid mask-radial" />
      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <Reveal>
          <SectionHeading
            id="pricing-title"
            eyebrow="Pricing"
            title={
              <>
                Pricing <span className="text-blood text-glow-sm">Packages</span>
              </>
            }
            description="Transparent rates for our 2 dedicated consoles. Choose PlayStation 4 for smooth Full HD play or PlayStation 4 Pro for enhanced 4K visuals."
          />
        </Reveal>

        {/* Console switcher */}
        <Reveal className="mt-8 flex justify-center">
          <Tabs
            items={dynamicTabs}
            value={consoleTab}
            onChange={setConsoleTab}
            label="Filter pricing by console"
            idPrefix="pricing-console"
          />
        </Reveal>

        <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {livePricing.map((plan, i) => (
            <Reveal key={`${plan.id}-${i}`} delay={i * 80} className="h-full">
              <PlanCard plan={plan} consoleTab={consoleTab} />
            </Reveal>
          ))}
        </div>

        <Reveal className="mt-10">
          <div className="relative flex flex-col items-start justify-between gap-6 overflow-hidden rounded-2xl border border-blood/30 bg-linear-to-r from-blood/20 via-coal to-coal p-6 sm:p-8 md:flex-row md:items-center">
            <Users aria-hidden="true" className="absolute -bottom-6 right-6 h-36 w-36 text-blood/[0.07]" />
            <div className="relative flex items-center gap-5">
              <span className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-blood text-white shadow-[0_0_30px_rgba(229,9,20,0.6)]">
                <Users className="h-7 w-7" />
              </span>
              <div>
                <p className="font-tech text-xs font-bold uppercase tracking-[0.3em] text-blood-400">Group Events</p>
                <h3 className="mt-1 font-display text-lg font-black uppercase sm:text-2xl">
                  Book the whole venue — <span className="text-blood text-glow-sm"><Rupee />{Number(wholeLoungePrice)}</span> flat
                </h3>
                <p className="mt-1 text-sm text-white/60">Both PS4 &amp; PS4 Pro stations exclusively for your crew.</p>
              </div>
            </div>
            <div className="relative flex flex-wrap gap-3">
              <Button onClick={() => openBooking({ service: "group" })}>
                <Users /> Book Group Event
              </Button>
              <Button variant="ghost" href="#events">
                Learn more <ArrowRight />
              </Button>
            </div>
          </div>
        </Reveal>

        <p className="mt-6 text-center text-xs text-white/40">All prices in Indian Rupees (₹). Access to full game library included.</p>
      </div>
    </section>
  );
}

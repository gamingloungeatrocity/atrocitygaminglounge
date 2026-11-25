import { useState, type ComponentType } from "react";
import { ArrowRight, BadgePercent, Check, Clock, Crown, Hourglass, Trophy, Users } from "lucide-react";
import { PRICING, type PricingPlan, type ServiceId } from "@/data/site";
import { useBooking } from "@/context/booking";
import { usePublicData } from "@/context/publicData";
import type { PricingRecord } from "@/lib/api";
import { cn } from "@/utils/cn";
import { Button } from "./ui/Button";
import { PriceCounter } from "./ui/PriceCounter";
import { Reveal } from "./ui/Reveal";
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

interface ActivePricingPlan {
  record: PricingRecord;
  template?: PricingPlan;
  ps4Record?: PricingRecord;
  ps4ProRecord?: PricingRecord;
  savings?: string;
}

function serviceForDuration(durationMinutes: number): ServiceId {
  if (durationMinutes === 180) return "pack3";
  if (durationMinutes === 300) return "daypass";
  return "hourly";
}

function durationLabel(durationMinutes: number): string {
  if (durationMinutes % 60 === 0) {
    const hours = durationMinutes / 60;
    return `${hours} hour${hours === 1 ? "" : "s"}`;
  }
  return `${durationMinutes} minutes`;
}

function PlanCard({ plan, consoleTab }: { plan: ActivePricingPlan; consoleTab: ConsoleTab }) {
  const { openBooking } = useBooking();
  const { record, template, ps4Record, ps4ProRecord } = plan;
  const Icon = ICONS[serviceForDuration(record.duration_minutes)];
  const isPro = consoleTab === "ps4pro";
  const activePrice = Number(record.price);
  const consolePref = isPro ? "PS4 Pro" : "PS4";
  const features = [
    ...(record.bonus_minutes > 0 ? [`${record.bonus_minutes} mins bonus play time`] : []),
    ...(template?.features ?? ["Access to full game library", "DualShock 4 controllers"]).filter(
      (feature) => !/bonus play time/i.test(feature),
    ),
  ];
  const name = record.label.trim() || template?.name || `${durationLabel(record.duration_minutes)} Session`;
  const unit = template?.unit ?? `/ ${durationLabel(record.duration_minutes).toLowerCase()}`;

  return (
    <article
      className={cn(
        "group relative flex h-full flex-col rounded-2xl border p-6 transition-all duration-300 hover:-translate-y-1.5 sm:p-7",
        template?.featured
          ? "neon-frame border-transparent bg-linear-to-b from-blood/[0.16] to-coal shadow-[0_30px_80px_-30px_rgba(229,9,20,0.75)]"
          : "border-white/10 bg-coal hover:border-blood/50 hover:shadow-[0_24px_60px_-24px_rgba(229,9,20,0.55)]",
      )}
    >
      {template?.badge && (
        <span className="absolute -top-3 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-blood px-3.5 py-1 font-tech text-xs font-bold uppercase tracking-[0.2em] shadow-[0_0_20px_rgba(229,9,20,0.6)]">
          {template.badge}
        </span>
      )}

      <div className="flex items-center justify-between">
        <span
          className={cn(
            "grid h-12 w-12 place-items-center rounded-xl border transition-transform duration-300 group-hover:scale-110",
            template?.featured ? "border-blood/50 bg-blood/15 text-blood-300" : "border-white/10 bg-white/[0.04] text-white/80",
          )}
        >
          <Icon className="h-6 w-6" />
        </span>
        <span className="font-tech text-xs font-bold uppercase tracking-[0.26em] text-white/40">
          {template?.category ?? "Configured Package"}
        </span>
      </div>

      <h3 className="mt-6 font-display text-lg font-black uppercase tracking-wide">{name}</h3>
      <p className="mt-1.5 text-sm text-white/55">
        {template?.tagline ?? "A session package configured by the lounge."}
      </p>

      {/* Main price */}
      <div className="mt-6 flex items-end gap-2">
        <span className="font-display text-5xl font-black leading-none tracking-tight">
          <PriceCounter value={activePrice} rupeeClassName="text-[0.8em]" />
        </span>
        <span className="pb-1 font-tech text-base font-semibold text-white/55">{unit}</span>
      </div>

      {/* Dual rate breakdown tag */}
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <span className="inline-flex items-center gap-1.5 rounded-md border border-white/10 bg-black/40 px-2 py-1 font-tech text-xs text-white/70">
          {ps4Record && ps4ProRecord ? (
            <>
              <span className={cn("font-bold", !isPro && "text-blood-300")}>PS4: ₹{Number(ps4Record.price)}</span>
              <span className="text-white/25">·</span>
              <span className={cn("font-bold", isPro && "text-blood-300")}>PS4 Pro: ₹{Number(ps4ProRecord.price)}</span>
            </>
          ) : (
            <span className="font-bold text-blood-300">
              {consolePref}: ₹{activePrice} / player
            </span>
          )}
        </span>
        {plan.savings && (
          <span className="inline-flex items-center gap-1 rounded-md border border-blood/40 bg-blood/10 px-2 py-1 font-tech text-xs font-bold uppercase tracking-[0.14em] text-blood-300">
            <BadgePercent className="h-3 w-3" />
            {plan.savings}
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
        variant={template?.featured ? "primary" : "outline"}
        onClick={() => openBooking({ service: serviceForDuration(record.duration_minutes), consolePref, pricingId: record.id })}
      >
        {template?.cta ?? "Book Session"} ({consolePref})
      </Button>
    </article>
  );
}

export function Pricing() {
  const { openBooking } = useBooking();
  const { pricing, backendConnected } = usePublicData();
  const [consoleTab, setConsoleTab] = useState<ConsoleTab>("ps4");

  const activeConsolePricing = backendConnected
    ? pricing
        .filter((record) => record.category === consoleTab && record.is_active && record.duration_minutes > 0)
        .sort((a, b) => a.sort_order - b.sort_order || a.duration_minutes - b.duration_minutes)
    : [];
  const livePricing: ActivePricingPlan[] = activeConsolePricing.map((record) => {
    const ps4Record = pricing.find((item) => item.category === "ps4" && item.duration_minutes === record.duration_minutes && item.is_active);
    const ps4ProRecord = pricing.find((item) => item.category === "ps4pro" && item.duration_minutes === record.duration_minutes && item.is_active);
    const template = PRICING.find((plan) => {
      const duration = plan.id === "hourly" ? 60 : plan.id === "pack3" ? 180 : 300;
      return duration === record.duration_minutes;
    });
    const hourlyRecord = pricing.find((item) => item.category === record.category && item.duration_minutes === 60 && item.is_active);
    const savings = hourlyRecord && record.duration_minutes > 60
      ? Math.round(Number(hourlyRecord.price) * (record.duration_minutes / 60) - Number(record.price))
      : 0;

    return {
      record,
      template,
      ps4Record,
      ps4ProRecord,
      savings: savings > 0 ? `Save ₹${savings}` : undefined,
    };
  });
  const hourlyPs4 = backendConnected ? pricing.find((p) => p.category === "ps4" && p.duration_minutes === 60 && p.is_active) : undefined;
  const hourlyPs4Pro = backendConnected ? pricing.find((p) => p.category === "ps4pro" && p.duration_minutes === 60 && p.is_active) : undefined;
  const wholeLoungePricing = backendConnected
    ? pricing.find((p) => p.category === "whole_lounge" && p.duration_minutes === 180 && p.is_active) ??
      pricing.find((p) => p.category === "whole_lounge" && p.is_active)
    : undefined;
  const dynamicTabs: TabItem<ConsoleTab>[] = [
    {
      id: "ps4",
      label: "PlayStation 4",
      icon: hourlyPs4 ? <span className="rounded bg-black/30 px-1.5 py-0.5 text-[10px]">₹{Number(hourlyPs4.price)}/hr</span> : undefined,
    },
    {
      id: "ps4pro",
      label: "PlayStation 4 Pro",
      icon: hourlyPs4Pro ? <span className="rounded bg-black/30 px-1.5 py-0.5 text-[10px]">₹{Number(hourlyPs4Pro.price)}/hr</span> : undefined,
    },
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
          {livePricing.length > 0 ? (
            livePricing.map((plan, i) => (
              <Reveal key={plan.record.id} delay={i * 80} className="h-full">
                <PlanCard plan={plan} consoleTab={consoleTab} />
              </Reveal>
            ))
          ) : (
            <p className="col-span-full rounded-2xl border border-white/10 bg-coal p-6 text-center text-sm text-white/55">
              {backendConnected
                ? "No active packages are configured for this console."
                : "Live pricing is temporarily unavailable."}
            </p>
          )}
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
                  Book the whole venue —{" "}
                  <span className="text-blood text-glow-sm">
                    {wholeLoungePricing ? (
                      <PriceCounter value={Number(wholeLoungePricing.price)} />
                    ) : (
                      "Unavailable"
                    )}
                  </span>{" "}
                  flat
                </h3>
                <p className="mt-1 text-sm text-white/60">Both PS4 &amp; PS4 Pro stations exclusively for your crew.</p>
              </div>
            </div>
            <div className="relative flex flex-wrap gap-3">
              <Button onClick={() => openBooking({ service: "group" })} disabled={!wholeLoungePricing}>
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

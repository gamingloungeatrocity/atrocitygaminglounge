import { useState } from "react";
import { Check, Gamepad2, Wrench } from "lucide-react";
import { CONSOLES, type ConsoleId } from "@/data/site";
import { useBooking } from "@/context/booking";
import { usePublicData } from "@/context/publicData";
import { Button } from "./ui/Button";
import { Reveal } from "./ui/Reveal";
import { Rupee } from "./ui/Rupee";
import { SectionHeading } from "./ui/SectionHeading";
import { Tabs, type TabItem } from "./ui/Tabs";
import { CircleShape, SquareShape, TriangleShape } from "./ui/icons";

function serviceForDuration(durationMinutes: number) {
  if (durationMinutes === 180) return "pack3" as const;
  if (durationMinutes === 300) return "daypass" as const;
  return "hourly" as const;
}

export function Consoles() {
  const { openBooking } = useBooking();
  const { consoles: liveConsoles, pricing, backendConnected } = usePublicData();
  const [active, setActive] = useState<ConsoleId>("ps4pro");
  const baseInfo = CONSOLES.find((c) => c.id === active) ?? CONSOLES[0];
  const liveRow = liveConsoles.find((c) => c.slug === active || c.console_type === baseInfo.short);
  const activePricing = backendConnected
    ? pricing.filter((item) => item.category === active && item.is_active && item.duration_minutes > 0)
    : [];
  const hourlyPricing = activePricing.find((item) => item.duration_minutes === 60);
  const pack3Pricing = activePricing.find((item) => item.duration_minutes === 180);
  const dayPassPricing = activePricing.find((item) => item.duration_minutes === 300);
  const defaultPricing = hourlyPricing ?? activePricing[0];
  const hourlyRate = hourlyPricing ? Number(hourlyPricing.price) : null;
  const hourlyPs4 = backendConnected
    ? pricing.find((item) => item.category === "ps4" && item.duration_minutes === 60 && item.is_active)
    : undefined;
  const hourlyPs4Pro = backendConnected
    ? pricing.find((item) => item.category === "ps4pro" && item.duration_minutes === 60 && item.is_active)
    : undefined;
  const consoleInfo = {
    ...baseInfo,
    name: liveRow?.name || baseInfo.name,
    description: liveRow?.description || baseInfo.description,
    specs: baseInfo.specs.map((s) =>
      s.label === "Hourly rate"
        ? { ...s, value: hourlyRate === null ? "Not configured" : `₹${hourlyRate} / hour` }
        : s,
    ),
  };
  const liveStatus = liveRow?.effective_status || liveRow?.status || "available";
  const isBlocked = liveStatus === "maintenance" || liveStatus === "disabled";
  const tabItems: TabItem<ConsoleId>[] = [
    {
      id: "ps4",
      label: (
        <>
          PS4
          {hourlyPs4 && (
            <span className="ml-1 rounded bg-black/30 px-1.5 py-0.5 text-[10px] leading-none">
              ₹{Number(hourlyPs4.price)}/hr
            </span>
          )}
        </>
      ),
    },
    {
      id: "ps4pro",
      label: (
        <>
          PS4 Pro
          {hourlyPs4Pro && (
            <span className="ml-1 rounded bg-black/30 px-1.5 py-0.5 text-[10px] leading-none">
              ₹{Number(hourlyPs4Pro.price)}/hr
            </span>
          )}
        </>
      ),
    },
  ];

  return (
    <section id="consoles" aria-labelledby="consoles-title" className="relative overflow-hidden py-20 sm:py-28">
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 bg-grid mask-radial" />
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 hidden lg:block">
        <TriangleShape className="absolute left-[4%] top-[12%] h-12 w-12 animate-float text-blood/25" />
        <CircleShape className="absolute right-[5%] top-[22%] h-10 w-10 animate-float text-white/10 [animation-delay:-3s]" />
        <SquareShape className="absolute bottom-[12%] left-[7%] h-9 w-9 animate-float text-white/10 [animation-delay:-5s]" />
      </div>

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <Reveal>
          <SectionHeading
            id="consoles-title"
            eyebrow="Consoles & Hardware"
            title={
              <>
                Two Dedicated <span className="text-blood text-glow-sm">Gaming Stations</span>
              </>
            }
            description="Our lounge features two dedicated PlayStation consoles. Every station is tuned for smooth gameplay, DualShock 4 controllers, and our complete game library."
          />
        </Reveal>

        <Reveal className="mt-10 flex justify-center">
          <Tabs items={tabItems} value={active} onChange={setActive} label="Choose a console station" idPrefix="console" />
        </Reveal>

        <Reveal className="mt-8">
          <div
            id="console-panel"
            role="tabpanel"
            aria-labelledby={`console-tab-${active}`}
            className="hud grid items-center gap-8 rounded-3xl border border-white/10 bg-coal/70 p-4 backdrop-blur-sm sm:p-6 lg:grid-cols-2 lg:gap-12 lg:p-10"
          >
            <div key={`${active}-img`} className="group relative animate-fade-up overflow-hidden rounded-2xl border border-white/5 bg-black">
              <img
                src={consoleInfo.image}
                alt={`${consoleInfo.name} console with a DualShock 4 controller under red lighting`}
                width={960}
                height={540}
                loading="lazy"
                decoding="async"
                className="aspect-video w-full object-cover transition-transform duration-700 group-hover:scale-105"
              />
              <div className="pointer-events-none absolute inset-0 bg-linear-to-t from-black/60 to-transparent" />
              <span className="absolute left-4 top-4 rounded-md border border-blood/40 bg-black/70 px-2.5 py-1 font-tech text-xs font-bold uppercase tracking-[0.2em] text-blood-300 backdrop-blur">
                {consoleInfo.badge}
              </span>
            </div>

            <div key={`${active}-info`} className="animate-fade-up">
              <div className="flex flex-wrap items-center gap-3">
                {hourlyRate !== null ? (
                  <span className="rounded-full border border-blood/40 bg-blood/10 px-3 py-1 font-tech text-xs font-bold uppercase tracking-[0.2em] text-blood-300">
                    <Rupee />
                    {hourlyRate} / hour
                  </span>
                ) : (
                  <span className="rounded-full border border-white/10 bg-white/[0.03] px-3 py-1 font-tech text-xs font-bold uppercase tracking-[0.2em] text-white/50">
                    Hourly tier unavailable
                  </span>
                )}
                {(pack3Pricing || dayPassPricing) && (
                  <span className="font-tech text-xs font-semibold text-white/50">
                    {[
                      pack3Pricing && `3 hrs: ₹${Number(pack3Pricing.price)}`,
                      dayPassPricing && `5 hrs: ₹${Number(dayPassPricing.price)}`,
                    ]
                      .filter(Boolean)
                      .join(" · ")}
                  </span>
                )}
              </div>

              <h3 className="mt-3 font-display text-2xl font-black uppercase sm:text-3xl">{consoleInfo.name}</h3>
              <p className="mt-1 font-tech text-sm font-bold uppercase tracking-[0.24em] text-blood-400">{consoleInfo.tagline}</p>
              <p className="mt-4 leading-relaxed text-white/65">{consoleInfo.description}</p>

              <dl className="mt-6 grid grid-cols-2 gap-3">
                {consoleInfo.specs.map((spec) => (
                  <div key={spec.label} className="rounded-xl border border-white/10 bg-black/40 p-3.5 transition-colors hover:border-blood/40">
                    <dt className="font-tech text-xs font-semibold uppercase tracking-[0.2em] text-white/45">{spec.label}</dt>
                    <dd className="mt-1 font-display text-sm font-bold sm:text-base">{spec.value}</dd>
                  </div>
                ))}
              </dl>

              <ul className="mt-6 grid gap-2.5 sm:grid-cols-2">
                {consoleInfo.highlights.map((item) => (
                  <li key={item} className="flex items-start gap-2.5 text-sm text-white/75">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-blood-400" strokeWidth={3} />
                    {item}
                  </li>
                ))}
              </ul>

              {isBlocked && (
                <p className="mt-5 flex items-center gap-2 rounded-xl border border-orange-500/40 bg-orange-500/10 px-4 py-2.5 text-sm text-orange-200">
                  <Wrench className="h-4 w-4 shrink-0" />
                  {consoleInfo.name} is currently marked as <strong className="uppercase">{liveStatus}</strong>.
                </p>
              )}

              <div className="mt-8 flex flex-wrap gap-3">
                <Button
                  disabled={isBlocked || !defaultPricing}
                  onClick={() =>
                    defaultPricing &&
                    openBooking({
                      service: serviceForDuration(defaultPricing.duration_minutes),
                      consolePref: consoleInfo.short,
                      pricingId: defaultPricing.id,
                    })
                  }
                >
                  <Gamepad2 />
                  {isBlocked
                    ? `${consoleInfo.short} Unavailable`
                    : defaultPricing
                      ? `Book ${consoleInfo.short}${hourlyRate !== null ? ` (₹${hourlyRate}/hr)` : ""}`
                      : `${consoleInfo.short} Pricing Unavailable`}
                </Button>
                <Button variant="outline" href="#pricing">
                  View All Rates
                </Button>
              </div>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

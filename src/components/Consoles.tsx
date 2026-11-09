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

const TAB_ITEMS: TabItem<ConsoleId>[] = [
  {
    id: "ps4",
    label: (
      <>
        PS4 <span className="rounded bg-black/30 px-1.5 py-0.5 text-[10px] leading-none">₹70/hr</span>
      </>
    ),
  },
  {
    id: "ps4pro",
    label: (
      <>
        PS4 Pro <span className="rounded bg-black/30 px-1.5 py-0.5 text-[10px] leading-none">₹90/hr</span>
      </>
    ),
  },
];

export function Consoles() {
  const { openBooking } = useBooking();
  const { consoles: liveConsoles, pricing } = usePublicData();
  const [active, setActive] = useState<ConsoleId>("ps4pro");
  const baseInfo = CONSOLES.find((c) => c.id === active) ?? CONSOLES[0];
  const liveRow = liveConsoles.find((c) => c.slug === active || c.console_type === baseInfo.short);
  const priceByDur = (mins: number, fallback: number) => {
    const found = pricing.find((p) => p.category === active && p.duration_minutes === mins && p.is_active);
    return found ? Number(found.price) : fallback;
  };
  const hourlyRate = priceByDur(60, baseInfo.hourlyRate);
  const pack3Rate = priceByDur(180, baseInfo.pack3Rate);
  const dayPassRate = priceByDur(300, baseInfo.dayPassRate);
  const consoleInfo = {
    ...baseInfo,
    name: liveRow?.name || baseInfo.name,
    description: liveRow?.description || baseInfo.description,
    hourlyRate,
    pack3Rate,
    dayPassRate,
    specs: baseInfo.specs.map((s) => (s.label === "Hourly rate" ? { ...s, value: `₹${hourlyRate} / hour` } : s)),
  };
  const liveStatus = liveRow?.effective_status || liveRow?.status || "available";
  const isBlocked = liveStatus === "maintenance" || liveStatus === "disabled";

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
            description="Our lounge features two consoles: one PlayStation 4 (₹70/hr) and one PlayStation 4 Pro (₹90/hr). Every station is tuned for smooth gameplay, DualShock 4 controllers, and our complete game library."
          />
        </Reveal>

        <Reveal className="mt-10 flex justify-center">
          <Tabs items={TAB_ITEMS} value={active} onChange={setActive} label="Choose a console station" idPrefix="console" />
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
                <span className="rounded-full border border-blood/40 bg-blood/10 px-3 py-1 font-tech text-xs font-bold uppercase tracking-[0.2em] text-blood-300">
                  <Rupee />
                  {consoleInfo.hourlyRate} / hour
                </span>
                <span className="font-tech text-xs font-semibold text-white/50">
                  3 hrs: ₹{consoleInfo.pack3Rate} · 5 hrs: ₹{consoleInfo.dayPassRate}
                </span>
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
                  disabled={isBlocked}
                  onClick={() => openBooking({ service: "hourly", consolePref: consoleInfo.short })}
                >
                  <Gamepad2 /> {isBlocked ? `${consoleInfo.short} Unavailable` : `Book ${consoleInfo.short} (₹${consoleInfo.hourlyRate}/hr)`}
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

import type { ComponentType } from "react";
import { Gauge, Timer, Trophy } from "lucide-react";
import racingImg from "@/assets/raw/racing.webp";
import { RACING_TITLES } from "@/data/site";
import { useBooking } from "@/context/booking";
import { PedalSim } from "./PedalSim";
import { Button } from "./ui/Button";
import { Reveal } from "./ui/Reveal";
import { Rupee } from "./ui/Rupee";
import { SectionHeading } from "./ui/SectionHeading";
import { SteeringWheelIcon } from "./ui/icons";

const FEATURES: { icon: ComponentType<{ className?: string }>; title: string; text: string }[] = [
  { icon: SteeringWheelIcon, title: "Force Feedback Wheel", text: "Real resistance through every corner, kerb and collision." },
  { icon: Gauge, title: "Gas · Brake · Clutch", text: "A full three-pedal set for precise, manual control." },
  { icon: Trophy, title: "Simulation Titles", text: "Authentic tracks, real physics and serious lap times." },
];

export function Racing() {
  const { openBooking } = useBooking();

  return (
    <section id="racing" aria-labelledby="racing-title" className="relative overflow-hidden py-20 sm:py-28">
      <div aria-hidden="true" className="pointer-events-none absolute inset-0">
        <div className="absolute inset-0 bg-linear-to-b from-black via-blood-950 to-black" />
        <div className="absolute inset-0 bg-stripes opacity-60 mask-radial" />
        <div className="absolute -right-40 top-10 h-[30rem] w-[30rem] rounded-full bg-blood/15 blur-[140px]" />
        <p className="absolute -left-4 top-4 select-none font-display text-[22vw] font-black leading-none text-outline lg:text-[16rem]">
          RACE
        </p>
      </div>

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid items-center gap-14 lg:grid-cols-2 lg:gap-16">
          <div className="lg:order-2">
            <Reveal>
              <SectionHeading
                align="left"
                id="racing-title"
                eyebrow="Racing Simulator"
                title={
                  <>
                    Professional Racing <span className="text-blood text-glow-sm">Wheel &amp; Pedals</span>
                  </>
                }
                description="Feel every kerb, slide and impact. Our sim rig puts you in the driver's seat with force-feedback steering and a full three-pedal setup — the closest thing to a real race car."
              />
            </Reveal>

            <div className="mt-8 grid gap-3 sm:grid-cols-3">
              {FEATURES.map(({ icon: Icon, title, text }, i) => (
                <Reveal key={title} delay={i * 90}>
                  <div className="h-full rounded-2xl border border-white/10 bg-black/50 p-5 transition-all duration-300 hover:-translate-y-1 hover:border-blood/50">
                    <span className="grid h-11 w-11 place-items-center rounded-xl bg-blood/15 text-blood-400">
                      <Icon className="h-6 w-6" />
                    </span>
                    <h3 className="mt-4 font-tech text-base font-bold uppercase tracking-wider">{title}</h3>
                    <p className="mt-1.5 text-sm leading-relaxed text-white/55">{text}</p>
                  </div>
                </Reveal>
              ))}
            </div>

            <Reveal className="mt-8">
              <p className="font-tech text-xs font-bold uppercase tracking-[0.3em] text-white/45">Sim titles such as</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {RACING_TITLES.map((title) => (
                  <span
                    key={title}
                    className="rounded-lg border border-white/10 bg-white/[0.04] px-3 py-1.5 font-tech text-sm font-semibold text-white/80 transition-colors hover:border-blood/50 hover:text-white"
                  >
                    {title}
                  </span>
                ))}
              </div>
            </Reveal>

            <Reveal className="mt-8">
              <div className="flex flex-col gap-5 rounded-2xl border border-blood/40 bg-black/60 p-6 shadow-[0_20px_60px_-30px_rgba(229,9,20,0.8)] sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="font-tech text-xs font-bold uppercase tracking-[0.3em] text-white/50">Racing Session</p>
                  <p className="mt-1 flex items-baseline gap-2">
                    <span className="font-display text-4xl font-black">
                      <Rupee />
                      250
                    </span>
                    <span className="font-tech text-base font-semibold text-white/60">/ 60 minutes</span>
                  </p>
                  <p className="mt-1.5 flex items-center gap-2 text-sm text-white/60">
                    <Timer className="h-4 w-4 text-blood-400" /> Extendable in 30-min increments
                  </p>
                </div>
                {/* Racing service is commented out; fallback to hourly if ever clicked */}
                <Button size="lg" onClick={() => openBooking({ service: "hourly" })}>
                  <SteeringWheelIcon /> Book Racing Session
                </Button>
              </div>
            </Reveal>
          </div>

          <Reveal className="relative lg:order-1">
            <div className="hud relative overflow-hidden rounded-3xl border border-white/10">
              <img
                src={racingImg}
                alt="Professional racing simulator with a steering wheel and illuminated dashboard under red light"
                width={720}
                height={1080}
                loading="lazy"
                decoding="async"
                className="aspect-[4/5] w-full object-cover sm:aspect-[16/11] lg:aspect-[4/5]"
              />
              <div aria-hidden="true" className="absolute inset-0 bg-linear-to-t from-black via-black/10 to-transparent" />
              <div className="absolute left-4 top-4 flex flex-wrap gap-2">
                <span className="inline-flex items-center gap-2 rounded-md border border-white/15 bg-black/70 px-2.5 py-1 font-tech text-xs font-bold uppercase tracking-[0.2em] backdrop-blur">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" /> Sim rig ready
                </span>
                <span className="rounded-md border border-blood/40 bg-black/70 px-2.5 py-1 font-tech text-xs font-bold uppercase tracking-[0.2em] text-blood-300 backdrop-blur">
                  Force feedback
                </span>
              </div>
            </div>
            <PedalSim className="relative z-10 mx-3 -mt-28 sm:mx-auto sm:max-w-sm lg:absolute lg:-bottom-10 lg:-right-6 lg:mx-0 lg:mt-0 lg:w-[22rem]" />
          </Reveal>
        </div>
      </div>
    </section>
  );
}

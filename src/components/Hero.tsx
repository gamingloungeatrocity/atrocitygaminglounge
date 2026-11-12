import type { ComponentType, ReactNode } from "react";
import { ArrowDown, CalendarClock, Clock, Cpu, Crown, Gamepad2, Zap } from "lucide-react";
import heroImg from "@/assets/raw/hero.jpg";
import logoImg from "@/assets/raw/logo.png";
import { useBooking } from "@/context/booking";
import { cn } from "@/utils/cn";
import { Button } from "./ui/Button";
import { OpenStatus } from "./ui/OpenStatus";
import { Rupee } from "./ui/Rupee";
import { CircleShape, CrossShape, SquareShape, /* SteeringWheelIcon, */ TriangleShape } from "./ui/icons";

type IconType = ComponentType<{ className?: string }>;

const STATS: { icon: IconType; value: ReactNode; label: string }[] = [
  { icon: Gamepad2, value: "2 Consoles", label: "1x PS4 · 1x PS4 Pro" },
  { icon: Zap, value: <><Rupee />70–90/hr</>, label: "Starting rates" },
  { icon: Clock, value: "10AM–10PM", label: "Open daily" },
];

const CHIPS: { icon: IconType; title: string; sub: string; position: string; delay: string }[] = [
  { icon: Cpu, title: "PS4 Pro", sub: "₹90/hr · 4K visuals", position: "-left-10 top-12", delay: "0s" },
  { icon: Gamepad2, title: "PS4", sub: "₹70/hr · Full HD", position: "-right-8 top-[46%]", delay: "-2.3s" },
  { icon: Crown, title: "Tournaments", sub: "Get crowned", position: "-left-2 bottom-8", delay: "-4.6s" },
];

function HeroEmblem() {
  return (
    <div aria-hidden="true" className="relative mx-auto hidden w-full max-w-[440px] lg:block">
      <div className="relative aspect-square">
        <div className="emblem-ring absolute inset-0 animate-spin-slow rounded-full opacity-80" />
        <div className="absolute inset-5 animate-spin-reverse rounded-full border border-dashed border-white/15" />
        <div className="absolute inset-14 rounded-full bg-blood/30 blur-3xl" />
        <div className="absolute inset-9 animate-float">
          <div className="relative h-full w-full overflow-hidden rounded-full bg-black shadow-[0_0_90px_-10px_rgba(229,9,20,0.6)] ring-1 ring-blood/50">
            <img src={logoImg} alt="" width={560} height={560} decoding="async" className="h-full w-full object-cover" />
            {/* Pulsing glow over the mascot's eyes */}
            <span className="absolute left-[38.5%] top-[39.3%] h-[5%] w-[9%] animate-eye rounded-full bg-blood-400 mix-blend-screen blur-md" />
            <span className="absolute left-[52.6%] top-[39.3%] h-[5%] w-[9%] animate-eye rounded-full bg-blood-400 mix-blend-screen blur-md" />
          </div>
        </div>
        {CHIPS.map(({ icon: Icon, title, sub, position, delay }) => (
          <div
            key={title}
            style={{ animationDelay: delay }}
            className={cn(
              "absolute flex animate-float items-center gap-3 rounded-xl border border-white/10 bg-black/75 px-4 py-3 shadow-[0_20px_40px_-20px_rgba(0,0,0,0.9)] backdrop-blur-md",
              position,
            )}
          >
            <span className="grid h-9 w-9 place-items-center rounded-lg bg-blood/15 text-blood-400">
              <Icon className="h-5 w-5" />
            </span>
            <span>
              <span className="block font-display text-xs font-bold uppercase tracking-wider text-white">{title}</span>
              <span className="block font-tech text-xs font-semibold text-white/55">{sub}</span>
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function Hero() {
  const { openBooking, openAvailability } = useBooking();

  return (
    <section
      id="home"
      aria-labelledby="hero-title"
      className="relative isolate flex min-h-[100svh] items-center overflow-hidden pb-20 pt-28 sm:pt-32"
    >
      {/* Background layers */}
      <div aria-hidden="true" className="absolute inset-0 -z-10">
        <img
          src={heroImg}
          alt=""
          width={1280}
          height={720}
          fetchPriority="high"
          decoding="async"
          className="h-full w-full object-cover object-center opacity-70"
        />
        <div className="absolute inset-0 bg-linear-to-r from-black via-black/85 to-black/25" />
        <div className="absolute inset-0 bg-linear-to-t from-black via-black/10 to-black/70" />
        <div className="absolute inset-0 bg-scanlines opacity-60" />
        <div className="absolute -left-32 top-1/3 h-[28rem] w-[28rem] rounded-full bg-blood/20 blur-[120px]" />
        <div className="hero-floor-wrap absolute inset-x-0 bottom-0 h-[36%] opacity-70">
          <div className="hero-floor" />
        </div>
      </div>

      {/* Floating PlayStation face-button shapes */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10 hidden md:block">
        <TriangleShape className="absolute right-[7%] top-[17%] h-10 w-10 animate-float text-blood/45" />
        <CircleShape className="absolute right-[46%] top-[13%] h-8 w-8 animate-float text-white/15 [animation-delay:-2s]" />
        <CrossShape className="absolute bottom-[20%] right-[40%] h-7 w-7 animate-float text-blood/35 [animation-delay:-3.5s]" />
        <SquareShape className="absolute bottom-[32%] right-[3%] h-9 w-9 animate-float text-white/10 [animation-delay:-5s]" />
      </div>

      <div className="mx-auto grid w-full max-w-7xl items-center gap-14 px-4 sm:px-6 lg:grid-cols-[1.1fr_0.9fr] lg:px-8">
        <div className="animate-fade-up">
          <OpenStatus />

          <h1 id="hero-title" className="mt-6 font-display font-black uppercase">
            <span className="sr-only">Welcome to Atrocity Gaming Lounge</span>
            <span aria-hidden="true" className="block font-tech text-xl font-bold tracking-[0.4em] text-white/85 sm:text-2xl lg:text-3xl">
              Welcome to
            </span>
            <span aria-hidden="true" className="mt-3 block text-[2.6rem] leading-[0.98] tracking-tight text-blood text-glow sm:text-6xl lg:text-7xl xl:text-[5.5rem]">
              <span className="glitch" data-text="Atrocity">
                Atrocity
              </span>
              <br />
              <span className="glitch" data-text="Gaming">
                Gaming
              </span>
              <span className="ml-2 inline-block align-baseline font-tech text-[0.3em] font-bold uppercase tracking-[0.24em] text-white/85 sm:ml-3">
                Lounge
              </span>
            </span>
          </h1>

          <p className="mt-7 max-w-xl text-base leading-relaxed text-white/70 sm:text-lg">
            Experience premium gaming with PlayStation 4 &amp; PS4 Pro consoles. Dive into the latest games with crystal-clear
            graphics and immersive gameplay.
          </p>

          <div className="mt-9 flex flex-col gap-3 sm:flex-row">
            <Button id="hero-book-now" size="lg" onClick={() => openBooking()} starBorder>
              <Gamepad2 /> Book Now
            </Button>
            <Button size="lg" variant="outline" onClick={openAvailability}>
              <CalendarClock /> View Availability
            </Button>
          </div>

          <ul className="mt-12 grid max-w-xl grid-cols-2 gap-3 sm:grid-cols-3">
            {STATS.map(({ icon: Icon, value, label }, i) => (
              <li
                key={label}
                className={cn(
                  "rounded-xl border border-white/10 bg-white/[0.03] p-3.5 backdrop-blur-sm transition-colors duration-300 hover:border-blood/50",
                  i === STATS.length - 1 && "col-span-2 sm:col-span-1",
                )}
              >
                <Icon className="h-5 w-5 text-blood-400" />
                <p className="mt-2.5 font-display text-sm font-bold tracking-wide text-white sm:text-[15px]">{value}</p>
                <p className="mt-0.5 font-tech text-xs font-semibold uppercase tracking-[0.16em] text-white/45">{label}</p>
              </li>
            ))}
          </ul>
        </div>

        <HeroEmblem />
      </div>

      <a
        href="#consoles"
        className="absolute bottom-6 left-1/2 hidden -translate-x-1/2 flex-col items-center gap-2 font-tech text-[11px] font-bold uppercase tracking-[0.4em] text-white/40 transition-colors hover:text-white sm:flex"
      >
        Scroll
        <span className="grid h-9 w-6 place-items-center rounded-full border border-white/20">
          <ArrowDown className="h-3.5 w-3.5 animate-bounce-soft" />
        </span>
      </a>
    </section>
  );
}

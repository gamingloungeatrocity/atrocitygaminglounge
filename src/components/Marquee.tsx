import { cn } from "@/utils/cn";
import { CrossShape } from "./ui/icons";

const ITEMS = [
  "Play",
  "Connect",
  "Enjoy",
  "PS4 (₹70/hr)",
  "PS4 Pro (₹90/hr)",
  "Tournaments",
  "Group Events",
  "Open Daily 10AM–10PM",
];

function Row({ tone }: { tone: "red" | "dark" }) {
  return (
    <div className="flex shrink-0 items-center">
      {ITEMS.map((item) => (
        <span key={item} className="flex items-center">
          <span
            className={cn(
              "whitespace-nowrap px-5 font-display text-sm font-black uppercase tracking-[0.26em] sm:px-7 sm:text-base",
              tone === "red" ? "text-black" : "text-white/35",
            )}
          >
            {item}
          </span>
          <CrossShape strokeWidth={3} className={cn("h-3.5 w-3.5 shrink-0", tone === "red" ? "text-black/70" : "text-blood")} />
        </span>
      ))}
    </div>
  );
}

/** Crossed arcade ticker bands between the hero and the hardware section. */
export function Marquee() {
  return (
    <div aria-hidden="true" className="relative z-10 overflow-hidden py-10 sm:py-14">
      <div className="absolute inset-x-[-5%] top-1/2 -translate-y-1/2 rotate-[2.5deg] border-y border-white/10 bg-coal-800 py-3">
        <div className="flex w-max animate-marquee-reverse">
          <Row tone="dark" />
          <Row tone="dark" />
        </div>
      </div>
      <div className="relative mx-[-5%] rotate-[-2deg] bg-blood py-3 shadow-[0_0_60px_rgba(229,9,20,0.45)]">
        <div className="flex w-max animate-marquee">
          <Row tone="red" />
          <Row tone="red" />
        </div>
      </div>
    </div>
  );
}

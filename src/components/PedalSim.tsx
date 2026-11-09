import { useCallback, useEffect, useRef, useState, type KeyboardEvent, type PointerEvent } from "react";
import { cn } from "@/utils/cn";

type PedalId = "clutch" | "brake" | "gas";

const PEDALS: { id: PedalId; label: string; fill: string }[] = [
  { id: "clutch", label: "Clutch", fill: "bg-white/75" },
  { id: "brake", label: "Brake", fill: "bg-blood-300" },
  { id: "gas", label: "Gas", fill: "bg-blood" },
];

const SEGMENTS = 16;
const MAX_SPEED = 248;
const IDLE = { speed: 0, rpm: 0.12, gear: "N" };

function Readout({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className="px-2">
      <p className={cn("font-display text-xl font-black tabular-nums sm:text-2xl", highlight ? "text-blood-400 text-glow-sm" : "text-white")}>
        {value}
      </p>
      <p className="mt-0.5 font-tech text-[10px] font-bold uppercase tracking-[0.24em] text-white/45">{label}</p>
    </div>
  );
}

/**
 * A playful mini "telemetry" widget: hold the pedals to rev the engine.
 * Runs a requestAnimationFrame loop only while something is happening.
 */
export function PedalSim({ className }: { className?: string }) {
  const [pressed, setPressed] = useState<Record<PedalId, boolean>>({ clutch: false, brake: false, gas: false });
  const [tele, setTele] = useState(IDLE);
  const pressedRef = useRef(pressed);
  const speedRef = useRef(0);
  const rafRef = useRef(0);

  const setPedal = useCallback((id: PedalId, down: boolean) => {
    setPressed((prev) => (prev[id] === down ? prev : { ...prev, [id]: down }));
  }, []);

  useEffect(() => {
    pressedRef.current = pressed;
    if (rafRef.current) return; // loop already running — it reads the ref
    if (!pressed.gas && !pressed.brake && !pressed.clutch && speedRef.current <= 0) return;

    let last = performance.now();
    const tick = (t: number) => {
      const dt = Math.min(0.05, (t - last) / 1000);
      last = t;
      const p = pressedRef.current;
      let speed = speedRef.current;
      if (p.gas && !p.clutch) speed += (MAX_SPEED - speed) * 0.6 * dt;
      else speed -= 20 * dt;
      if (p.brake) speed -= 160 * dt;
      speed = Math.max(0, Math.min(MAX_SPEED, speed));
      speedRef.current = speed;

      const gearNum = Math.min(6, 1 + Math.floor(speed / 42));
      let rpm: number;
      if (p.clutch) rpm = p.gas ? 0.97 : 0.14;
      else if (speed < 0.5) rpm = p.gas ? 0.5 : 0.12;
      else {
        const low = (gearNum - 1) * 42;
        const span = gearNum === 6 ? MAX_SPEED - low : 42;
        rpm = 0.25 + Math.min(1, (speed - low) / span) * 0.72;
      }
      const gear = p.clutch || (speed < 0.5 && !p.gas) ? "N" : String(gearNum);
      setTele({ speed, rpm, gear });

      if (p.gas || p.brake || p.clutch || speed > 0) {
        rafRef.current = requestAnimationFrame(tick);
      } else {
        rafRef.current = 0;
        setTele(IDLE);
      }
    };
    rafRef.current = requestAnimationFrame(tick);
  }, [pressed]);

  useEffect(
    () => () => {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = 0;
    },
    [],
  );

  const lit = Math.round(tele.rpm * SEGMENTS);
  const redline = tele.rpm > 0.92;

  return (
    <div
      className={cn(
        "rounded-2xl border border-white/10 bg-black/85 p-4 shadow-[0_30px_80px_-20px_rgba(0,0,0,0.9)] backdrop-blur-xl sm:p-5",
        className,
      )}
    >
      <div className="flex items-center justify-between">
        <span className="font-tech text-xs font-bold uppercase tracking-[0.3em] text-white/50">Live Telemetry</span>
        <span className="flex items-center gap-1.5 font-tech text-xs font-bold uppercase tracking-[0.2em] text-blood-400">
          <span className="relative flex h-1.5 w-1.5">
            <span className="absolute inline-flex h-full w-full animate-ping-soft rounded-full bg-blood-400" />
            <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-blood-400" />
          </span>
          FFB On
        </span>
      </div>

      <div aria-hidden="true" className={cn("mt-4 flex h-9 items-end gap-[3px]", redline && "animate-blink")}>
        {Array.from({ length: SEGMENTS }, (_, i) => {
          const on = i < lit;
          const zone = i >= SEGMENTS - 3 ? "red" : i >= SEGMENTS - 6 ? "warn" : "ok";
          return (
            <span
              key={i}
              style={{ height: `${38 + (i / (SEGMENTS - 1)) * 62}%` }}
              className={cn(
                "flex-1 rounded-[2px] transition-colors duration-75",
                on
                  ? zone === "red"
                    ? "bg-blood shadow-[0_0_10px_#e50914]"
                    : zone === "warn"
                      ? "bg-blood-300"
                      : "bg-white/85"
                  : "bg-white/10",
              )}
            />
          );
        })}
      </div>

      <div aria-hidden="true" className="mt-4 grid grid-cols-3 divide-x divide-white/10 text-center">
        <Readout label="Gear" value={tele.gear} highlight />
        <Readout label="km/h" value={String(Math.round(tele.speed))} />
        <Readout label="RPM" value={`${(tele.rpm * 8).toFixed(1)}k`} />
      </div>

      <div className="mt-4 grid grid-cols-3 gap-2">
        {PEDALS.map((pedal) => {
          const down = pressed[pedal.id];
          return (
            <button
              key={pedal.id}
              type="button"
              aria-pressed={down}
              aria-label={`${pedal.label} pedal — press and hold`}
              onPointerDown={(e: PointerEvent<HTMLButtonElement>) => {
                e.preventDefault();
                e.currentTarget.setPointerCapture?.(e.pointerId);
                setPedal(pedal.id, true);
              }}
              onPointerUp={() => setPedal(pedal.id, false)}
              onPointerCancel={() => setPedal(pedal.id, false)}
              onLostPointerCapture={() => setPedal(pedal.id, false)}
              onKeyDown={(e: KeyboardEvent<HTMLButtonElement>) => {
                if ((e.key === " " || e.key === "Enter") && !e.repeat) {
                  e.preventDefault();
                  setPedal(pedal.id, true);
                }
              }}
              onKeyUp={(e: KeyboardEvent<HTMLButtonElement>) => {
                if (e.key === " " || e.key === "Enter") {
                  e.preventDefault();
                  setPedal(pedal.id, false);
                }
              }}
              onBlur={() => setPedal(pedal.id, false)}
              onContextMenu={(e) => e.preventDefault()}
              className={cn(
                "touch-none select-none rounded-xl border p-2 transition-colors duration-200 [-webkit-touch-callout:none]",
                down ? "border-blood/70 bg-blood/10" : "border-white/10 bg-black/40 hover:border-blood/40",
              )}
            >
              <span className="relative block h-14 w-full overflow-hidden rounded-lg border border-white/10 bg-white/[0.04]">
                <span
                  className={cn(
                    "absolute inset-0 origin-bottom transition-transform duration-150 ease-out",
                    pedal.fill,
                    down ? "scale-y-100" : "scale-y-0",
                  )}
                />
                <span
                  aria-hidden="true"
                  className="absolute inset-0 bg-[repeating-linear-gradient(180deg,transparent_0_6px,rgba(0,0,0,0.35)_6px_8px)]"
                />
              </span>
              <span className="mt-2 block font-tech text-xs font-bold uppercase tracking-[0.2em] text-white/85">{pedal.label}</span>
            </button>
          );
        })}
      </div>
      <p className="mt-3 text-center font-tech text-[11px] font-semibold uppercase tracking-[0.22em] text-white/40">
        Hold the pedals — feel the revs
      </p>
    </div>
  );
}

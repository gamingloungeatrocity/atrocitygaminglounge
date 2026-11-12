/*
 * CountUp — React Bits (https://reactbits.dev/text-animations/count-up)
 * Ported to TypeScript for this project. Requires the `motion` package.
 */
import { animate, cubicBezier, useInView } from "motion/react";
import {
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
} from "react";

export type CountUpEasing = "easeOut" | "linear" | "expo" | "spring";
export type CountUpMode = "count" | "roll";
export type CountUpFormat = "standard" | "compact";
export type CountUpTrigger = "view" | "load";

export interface CountUpProps {
  /** The target number to count up to. */
  to: number;
  /** The initial number from which the count starts. */
  from?: number;
  /** Count direction. `down` swaps `from` and `to`. */
  direction?: "up" | "down";
  /** Delay in seconds before the counting starts. */
  delay?: number;
  /** How long the count takes, in seconds. */
  duration?: number;
  className?: string;
  /** Inline styles for the number, like its font size or weight. */
  style?: CSSProperties;
  /** Whether the animation may start once the component is in view. */
  startWhen?: boolean;
  /** Character used as a thousands separator. */
  separator?: string;
  /** Text shown before the number, like a currency sign. */
  prefix?: string;
  /** Text shown after the number. */
  suffix?: string;
  mode?: CountUpMode;
  easing?: CountUpEasing;
  /** Fixed number of decimals. Defaults to the decimals in `from` / `to`. */
  decimals?: number;
  format?: CountUpFormat;
  trigger?: CountUpTrigger;
  /** Replays the count on hover. */
  replayOnHover?: boolean;
  onStart?: () => void;
  onEnd?: () => void;
}

const CELL = 1.2;
const STAGGER = 0.07;

const UNITS: [number, string][] = [
  [1e12, "T"],
  [1e9, "B"],
  [1e6, "M"],
  [1e3, "K"],
];

const SLOT_STYLE: CSSProperties = {
  display: "inline-block",
  height: `${CELL}em`,
  lineHeight: `${CELL}em`,
};

const SR_ONLY: CSSProperties = {
  position: "absolute",
  width: 1,
  height: 1,
  padding: 0,
  margin: -1,
  overflow: "hidden",
  clip: "rect(0, 0, 0, 0)",
  whiteSpace: "nowrap",
  border: 0,
};

const useIsoLayoutEffect = typeof window !== "undefined" ? useLayoutEffect : useEffect;

const clamp01 = (value: number) => Math.min(1, Math.max(0, value));

const smooth = (edge0: number, edge1: number, value: number) => {
  const t = clamp01((value - edge0) / (edge1 - edge0));
  return t * t * (3 - 2 * t);
};

const mod10 = (value: number) => ((value % 10) + 10) % 10;

const makeSpring = (overshoot: number): ((t: number) => number) => {
  const log = Math.log(Math.min(0.5, Math.max(0.001, overshoot)));
  const zeta = -log / Math.sqrt(Math.PI * Math.PI + log * log);
  const damped = Math.PI / 0.52;
  const natural = damped / Math.sqrt(1 - zeta * zeta);
  const raw = (t: number) =>
    1 - Math.exp(-zeta * natural * t) * (Math.cos(damped * t) + ((zeta * natural) / damped) * Math.sin(damped * t));
  const residual = 1 - raw(1);
  return (t) => (t >= 1 ? 1 : raw(t) + residual * t * t * t);
};

const EASINGS: Record<CountUpEasing, (t: number) => number> = {
  linear: (t) => t,
  easeOut: cubicBezier(0.33, 1, 0.68, 1),
  expo: (t) => (t >= 1 ? 1 : (1 - Math.pow(2, -10 * t)) / (1 - Math.pow(2, -10))),
  spring: makeSpring(0.06),
};

const getDecimalPlaces = (num: number): number => {
  const str = num.toString();

  if (str.includes(".")) {
    const decimals = str.split(".")[1];

    if (parseInt(decimals, 10) !== 0) {
      return decimals.length;
    }
  }

  return 0;
};

const unitFor = (value: number): [number, string] =>
  UNITS.find(([size]) => Math.abs(value) >= size * 0.9995) ?? [1, ""];

interface Scale {
  size: number;
  label: string;
  digits: number;
}

const scaleFor = (value: number, compact: boolean, decimals: number | undefined, places: number): Scale => {
  if (!compact) return { size: 1, label: "", digits: places };
  const [size, label] = unitFor(value);
  const digits = decimals ?? (label ? (Math.abs(value) / size < 100 ? 1 : 0) : places);
  return { size, label, digits };
};

interface NumberParts {
  negative: boolean;
  int: string;
  frac: string;
}

const splitNumber = (value: number, digits: number, size: number): NumberParts => {
  const fixed = (Math.abs(value) / size).toFixed(digits);
  const [int, frac = ""] = fixed.split(".");
  return { negative: value < 0 && Number(fixed) !== 0, int, frac };
};

const group = (int: string, separator: string) =>
  separator ? int.replace(/\B(?=(\d{3})+(?!\d))/g, separator) : int;

export interface RollColumn {
  slot: number;
  index: number;
  place: number;
  from: number;
  to: number;
  enter: boolean;
  leave: boolean;
  delta: number;
}

export interface RollCharSlot {
  char: string;
  enter?: boolean;
  leave?: boolean;
  follow?: number;
}

export type RollSlot = RollColumn | RollCharSlot;

export interface RollModel {
  slots: RollSlot[];
  columns: RollColumn[];
  label: string;
}

const isCharSlot = (slot: RollSlot): slot is RollCharSlot => "char" in slot;

const buildRoll = (
  a: number,
  b: number,
  spin: boolean,
  { compact, decimals, places, separator }: { compact: boolean; decimals?: number; places: number; separator: string },
): RollModel => {
  const { size, label, digits } = scaleFor(b, compact, decimals, places);
  const pa = splitNumber(a, digits, size);
  const pb = splitNumber(b, digits, size);
  const length = Math.max(pa.int.length, pb.int.length);
  const slots: RollSlot[] = [];
  const columns: RollColumn[] = [];
  if (pa.negative || pb.negative) slots.push({ char: "-", enter: !pa.negative, leave: !pb.negative });
  const digitAt = (parts: NumberParts, place: number): number | null => {
    if (place < 0) return Number(parts.frac[-place - 1]);
    const index = parts.int.length - 1 - place;
    return index >= 0 ? Number(parts.int[index]) : null;
  };
  for (let place = length - 1; place >= -digits; place--) {
    if (place === -1) slots.push({ char: "." });
    const start = digitAt(pa, place);
    const end = digitAt(pb, place);
    const column: RollColumn = {
      slot: slots.length,
      index: columns.length,
      place,
      from: start ?? 0,
      to: end ?? 0,
      enter: start === null,
      leave: end === null,
      delta: 0,
    };
    slots.push(column);
    columns.push(column);
    if (separator && place > 0 && place % 3 === 0) slots.push({ char: separator, follow: column.index });
  }
  const up = spin || b >= a;
  columns.forEach((column, index) => {
    const rank = columns.length - 1 - index;
    const base = up ? mod10(column.to - column.from) : -mod10(column.from - column.to);
    const turns = spin
      ? Math.max(1, 3 - rank)
      : Math.min(
          Math.floor(Math.abs(b - a) / (size * 10 ** (column.place + 1))),
          Math.max(0, 3 - rank),
        );
    column.delta = base + (up ? 10 : -10) * turns;
  });
  return { slots, columns, label };
};

interface PlayState {
  id: number;
  from: number;
  to: number;
  spin: boolean;
  wait?: boolean;
}

interface LiveHandles {
  formatValue: (value: number) => string;
  onStart?: () => void;
  onEnd?: () => void;
  model: RollModel | null;
  mode: CountUpMode;
  easing: CountUpEasing;
  duration: number;
  delay: number;
}

interface LiveColumn extends RollColumn {
  box: HTMLSpanElement | null;
  strip: HTMLElement | null;
  blur: SVGFEGaussianBlurElement | null;
  cells: (ChildNode | null)[];
  width: number;
  ease: (t: number) => number;
  base: number;
  sigma: number;
  presence: number;
}
/**
 * Animated number counter. With `trigger="view"` it counts once, the first time
 * it scrolls into view, and respects `prefers-reduced-motion`.
 */
export default function CountUp({
  to,
  from = 0,
  direction = "up",
  delay = 0,
  duration = 2,
  className = "",
  style,
  startWhen = true,
  separator = "",
  prefix = "",
  suffix = "",
  mode = "count",
  easing = "easeOut",
  decimals,
  format = "standard",
  trigger = "view",
  replayOnHover = false,
  onStart,
  onEnd,
}: CountUpProps) {
  const ref = useRef<HTMLSpanElement>(null);
  const textRef = useRef<HTMLSpanElement>(null);
  const slotRefs = useRef<(HTMLSpanElement | null)[]>([]);
  const filterRefs = useRef<(SVGFEGaussianBlurElement | null)[]>([]);
  const uid = useId().replace(/[^\w-]/g, "");
  const startValue = direction === "down" ? to : from;
  const endValue = direction === "down" ? from : to;
  const valueRef = useRef(startValue);
  const startedRef = useRef(false);
  const runningRef = useRef(false);
  const [play, setPlay] = useState<PlayState | null>(null);
  const isInView = useInView(ref, { once: true, margin: "0px" });
  const active = trigger === "load" || isInView;
  const compact = format === "compact";
  const places = decimals ?? Math.max(getDecimalPlaces(from), getDecimalPlaces(to));

  const formatValue = useCallback(
    (latest: number) => {
      const { size, label, digits } = scaleFor(latest, compact, decimals, places);
      const parts = splitNumber(latest, digits, size);
      const body = `${parts.negative ? "-" : ""}${group(parts.int, separator)}${parts.frac ? `.${parts.frac}` : ""}`;
      return `${prefix}${body}${label}${suffix}`;
    },
    [compact, decimals, places, separator, prefix, suffix],
  );

  const model = useMemo(() => {
    if (mode !== "roll") return null;
    const a = play ? play.from : startValue;
    const b = play ? play.to : endValue;
    return buildRoll(a, b, !!play?.spin, { compact, decimals, places, separator });
  }, [mode, play, startValue, endValue, compact, decimals, places, separator]);

  const [initialText] = useState(() => formatValue(startValue));
  const latestRef = useRef<LiveHandles | null>(null);

  useIsoLayoutEffect(() => {
    latestRef.current = {
      formatValue,
      onStart,
      onEnd,
      model,
      mode,
      easing,
      duration: Math.max(0, duration),
      delay,
    };
  });

  useIsoLayoutEffect(() => {
    if (!startedRef.current) valueRef.current = startValue;
    if (mode === "count" && !runningRef.current && textRef.current) {
      textRef.current.textContent = formatValue(valueRef.current);
    }
  }, [mode, startValue, formatValue]);

  useEffect(() => {
    if (!active || !startWhen) return;
    startedRef.current = true;
    setPlay((previous) => ({
      id: (previous?.id || 0) + 1,
      from: valueRef.current,
      to: endValue,
      spin: false,
      wait: true,
    }));
  }, [active, startWhen, endValue]);

  useEffect(() => {
    if (!play) return undefined;
    const live = latestRef.current;
    if (!live) return undefined;
    const ease = EASINGS[live.easing] || EASINGS.easeOut;
    const total = live.duration;
    const progress = (t: number) => (total > 0 ? clamp01(t / total) : 1);
    let render: (t: number) => void;

    if (live.mode === "roll" && live.model && ref.current) {
      const { columns: layout, slots } = live.model;
      const fontSize = parseFloat(getComputedStyle(ref.current).fontSize) || 16;
      const cell = CELL * fontSize;
      const stagger = layout.length > 1 ? Math.min(STAGGER, (total * 0.4) / (layout.length - 1)) : 0;
      const span = Math.max(0.001, total - stagger * (layout.length - 1));
      const columns: LiveColumn[] = layout.map((column) => {
        const box = slotRefs.current[column.slot] ?? null;
        const strip = (box?.firstChild as HTMLElement | null) ?? null;
        return {
          ...column,
          box,
          strip,
          blur: filterRefs.current[column.index] ?? null,
          cells: strip ? Array.from(strip.childNodes, (node) => node.firstChild) : [],
          width: box ? box.scrollWidth : 0,
          ease:
            live.easing === "spring"
              ? makeSpring(Math.min(0.12, Math.max(0.01, 0.35 / Math.max(1, Math.abs(column.delta)))))
              : ease,
          base: Math.floor(column.from),
          sigma: 0,
          presence: column.enter ? 0 : 1,
        };
      });
      const marks = slots
        .map((slot, index) => ({ slot, node: slotRefs.current[index] ?? null }))
        .filter(
          (mark): mark is { slot: RollCharSlot; node: HTMLSpanElement } =>
            isCharSlot(mark.slot) &&
            mark.node !== null &&
            (mark.slot.enter === true || mark.slot.leave === true || mark.slot.follow !== undefined),
        )
        .map((mark) => ({ ...mark.slot, node: mark.node, width: mark.node.scrollWidth }));

      const fade = (node: HTMLElement | null, width: number, presence: number, settled: boolean) => {
        if (!node) return;
        node.style.width = settled ? "" : `${(presence * width).toFixed(2)}px`;
        node.style.opacity = settled ? "" : presence.toFixed(3);
      };

      render = (t: number) => {
        columns.forEach((column, index) => {
          if (!column.strip) return;
          const u = clamp01((t - index * stagger) / span);
          const pos = column.from + column.delta * column.ease(u);
          const base = Math.floor(pos);
          if (base !== column.base) {
            column.base = base;
            column.cells.forEach((node, offset) => {
              if (node) node.nodeValue = String(mod10(base + offset - 1));
            });
          }
          column.strip.style.transform = `translateY(${(-(1 + pos - base) * CELL).toFixed(4)}em)`;

          const u0 = Math.max(0, u - 0.004);
          const u1 = Math.min(1, u + 0.004);
          const speed =
            u1 > u0
              ? (Math.abs(column.delta) * Math.abs(column.ease(u1) - column.ease(u0))) / (u1 - u0) / span
              : 0;
          const sigma = u > 0 && u < 1 ? Math.min(cell * 0.05, (speed * cell) / 600) : 0;
          if (Math.abs(sigma - column.sigma) > 0.05 || (sigma === 0 && column.sigma !== 0)) {
            column.sigma = sigma;
            if (sigma > 0.2 && column.blur) {
              column.blur.setAttribute("stdDeviation", `0 ${sigma.toFixed(2)}`);
              column.strip.style.filter = `url(#${uid}-${index})`;
            } else {
              column.strip.style.filter = "";
            }
          }

          if (column.enter || column.leave) {
            column.presence = column.enter ? smooth(0, 0.45, u) : 1 - smooth(0.55, 1, u);
            fade(column.box, column.width, column.presence, column.enter && u >= 1);
          }
        });

        const overall = progress(t);
        marks.forEach((mark) => {
          if (mark.follow !== undefined) {
            const column = columns[mark.follow];
            if (column && (column.enter || column.leave))
              fade(mark.node, mark.width, column.presence, column.enter && column.presence >= 1);
          } else {
            const presence = mark.enter ? smooth(0, 0.3, overall) : 1 - smooth(0.7, 1, overall);
            fade(mark.node, mark.width, presence, !!mark.enter && overall >= 1);
          }
        });

        valueRef.current = play.from + (play.to - play.from) * ease(overall);
      };
    } else {
      render = (t: number) => {
        const value = play.from + (play.to - play.from) * ease(progress(t));
        valueRef.current = value;
        if (textRef.current) textRef.current.textContent = live.formatValue(value);
      };
    }

    runningRef.current = true;
    if (typeof live.onStart === "function") live.onStart();

    const finish = () => {
      render(Infinity);
      valueRef.current = play.to;
      runningRef.current = false;
      const current = latestRef.current;
      if (current && typeof current.onEnd === "function") current.onEnd();
    };

    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) {
      finish();
      return undefined;
    }

    const controls = animate(0, total, {
      duration: total,
      delay: play.wait ? live.delay : 0,
      ease: "linear",
      onUpdate: render,
      onComplete: finish,
    });

    return () => {
      controls.stop();
      runningRef.current = false;
    };
  }, [play, uid]);

  const replay = () => {
    if (!replayOnHover || runningRef.current || !startedRef.current) return;
    setPlay((previous) =>
      mode === "roll"
        ? { id: (previous?.id || 0) + 1, from: valueRef.current, to: valueRef.current, spin: true }
        : { id: (previous?.id || 0) + 1, from: startValue, to: endValue, spin: false },
    );
  };

  const finalText = formatValue(play ? play.to : endValue);

  return (
    <span
      className={className}
      ref={ref}
      style={{ fontVariantNumeric: "tabular-nums", ...style }}
      onPointerEnter={replayOnHover ? replay : undefined}
    >
      {model ? (
        <>
          <span
            key={`roll-${play?.id || 0}`}
            aria-hidden="true"
            style={{ display: "inline-flex", whiteSpace: "pre", userSelect: "none" }}
          >
            {prefix && <span style={SLOT_STYLE}>{prefix}</span>}
            {model.slots.map((slot, index) => {
              const hidden = isCharSlot(slot)
                ? slot.enter === true || (slot.follow !== undefined && model.columns[slot.follow].enter)
                : slot.enter;
              const collapsed = hidden ? { width: 0, opacity: 0 } : null;
              if (isCharSlot(slot)) {
                return (
                  <span
                    key={index}
                    ref={(node) => {
                      slotRefs.current[index] = node;
                    }}
                    style={{ ...SLOT_STYLE, overflow: "hidden", ...collapsed }}
                  >
                    {slot.char}
                  </span>
                );
              }
              return (
                <span
                  key={index}
                  ref={(node) => {
                    slotRefs.current[index] = node;
                  }}
                  style={{ ...SLOT_STYLE, position: "relative", overflow: "hidden", ...collapsed }}
                >
                  <span
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      transform: `translateY(${-CELL}em)`,
                    }}
                  >
                    {[-1, 0, 1, 2].map((offset) => (
                      <span key={offset} style={{ height: `${CELL}em` }}>
                        {mod10(slot.from + offset)}
                      </span>
                    ))}
                  </span>
                </span>
              );
            })}
            {model.label && <span style={SLOT_STYLE}>{model.label}</span>}
            {suffix && <span style={SLOT_STYLE}>{suffix}</span>}
          </span>
          <span style={SR_ONLY}>{finalText}</span>
          <svg aria-hidden="true" width="0" height="0" style={{ position: "absolute" }}>
            <defs>
              {model.columns.map((column) => (
                <filter
                  key={column.index}
                  id={`${uid}-${column.index}`}
                  x="-20%"
                  y="-50%"
                  width="140%"
                  height="200%"
                  colorInterpolationFilters="sRGB"
                >
                  <feGaussianBlur
                    ref={(node) => {
                      filterRefs.current[column.index] = node;
                    }}
                    stdDeviation="0 0"
                  />
                </filter>
              ))}
            </defs>
          </svg>
        </>
      ) : (
        <span key="count" ref={textRef}>
          {initialText}
        </span>
      )}
    </span>
  );
}

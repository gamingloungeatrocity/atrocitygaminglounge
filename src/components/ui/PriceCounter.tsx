import CountUp from "./CountUp";
import { Rupee } from "./Rupee";

/** Seconds the price takes to count up from ₹0. */
const COUNT_DURATION_SECONDS = 1.35;

interface PriceCounterProps {
  /** Exact rupee amount to display once the animation settles. */
  value: number;
  /** Size class for the rupee glyph, relative to the surrounding price type. */
  rupeeClassName?: string;
  className?: string;
}

/**
 * Rupee price that counts up from zero when it scrolls into view.
 * The symbol stays visible the whole time and the final frame is the exact price.
 */
export function PriceCounter({ value, rupeeClassName, className }: PriceCounterProps) {
  return (
    <span className={className}>
      <Rupee className={rupeeClassName} />
      <CountUp
        to={value}
        from={0}
        duration={COUNT_DURATION_SECONDS}
        easing="easeOut"
        separator=","
        trigger="view"
      />
    </span>
  );
}

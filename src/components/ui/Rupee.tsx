import { cn } from "@/utils/cn";

/** Rupee symbol rendered in Inter so it stays consistent next to Orbitron numerals. */
export function Rupee({ className }: { className?: string }) {
  return <span className={cn("mr-[0.06em] font-sans font-bold", className)}>₹</span>;
}

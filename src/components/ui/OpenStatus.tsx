import { useIstNow } from "@/hooks/useIstNow";
import { getOpenStatus } from "@/lib/time";
import { cn } from "@/utils/cn";

interface OpenStatusProps {
  className?: string;
  showDetail?: boolean;
}

/** Live "Open now / Closed" pill, computed in India Standard Time. */
export function OpenStatus({ className, showDetail = true }: OpenStatusProps) {
  const status = getOpenStatus(useIstNow());
  return (
    <span
      className={cn(
        "inline-flex items-center gap-2 rounded-full border px-3 py-1.5 font-tech text-xs font-bold uppercase tracking-[0.18em]",
        status.open ? "border-emerald-400/30 bg-emerald-400/[0.07] text-white" : "border-white/15 bg-white/5 text-white/75",
        className,
      )}
    >
      <span className="relative flex h-2 w-2" aria-hidden="true">
        {status.open && <span className="absolute inline-flex h-full w-full animate-ping-soft rounded-full bg-emerald-400" />}
        <span className={cn("relative inline-flex h-2 w-2 rounded-full", status.open ? "bg-emerald-400" : "bg-blood-400")} />
      </span>
      {status.label}
      {showDetail && <span className="font-semibold text-white/50">· {status.detail}</span>}
    </span>
  );
}

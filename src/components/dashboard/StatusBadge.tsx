import type { ReactNode } from "react";
import { Loader2 } from "lucide-react";
import { cn } from "@/utils/cn";

const STYLES: Record<string, string> = {
  available: "border-emerald-500/35 bg-emerald-500/10 text-emerald-300",
  occupied: "border-amber-500/35 bg-amber-500/10 text-amber-300",
  maintenance: "border-orange-500/40 bg-orange-500/15 text-orange-300",
  disabled: "border-white/15 bg-white/5 text-white/45",

  confirmed: "border-emerald-500/35 bg-emerald-500/10 text-emerald-300",
  approved: "border-emerald-500/35 bg-emerald-500/10 text-emerald-300",
  active: "border-blood/50 bg-blood/15 text-blood-300",
  completed: "border-sky-500/35 bg-sky-500/10 text-sky-300",
  pending: "border-amber-500/35 bg-amber-500/10 text-amber-300",
  rejected: "border-blood/40 bg-blood/10 text-blood-300",
  cancelled: "border-white/15 bg-white/5 text-white/45",

  paid: "border-emerald-500/35 bg-emerald-500/10 text-emerald-300",
  failed: "border-blood/50 bg-blood/15 text-blood-300",
  refunded: "border-purple-500/35 bg-purple-500/10 text-purple-300",

  upcoming: "border-sky-500/35 bg-sky-500/10 text-sky-300",
  registration_open: "border-emerald-500/35 bg-emerald-500/10 text-emerald-300",
  registration_closed: "border-amber-500/35 bg-amber-500/10 text-amber-300",
  ongoing: "border-blood/50 bg-blood/15 text-blood-300",

  admin: "border-blood/50 bg-blood/15 text-blood-300",
  staff: "border-sky-500/35 bg-sky-500/10 text-sky-300",
  cash: "border-emerald-500/30 bg-emerald-500/10 text-emerald-300",
  upi: "border-violet-500/30 bg-violet-500/10 text-violet-300",
  cashfree: "border-sky-500/30 bg-sky-500/10 text-sky-300",
  online: "border-sky-500/30 bg-sky-500/10 text-sky-300",
  walkin: "border-amber-500/30 bg-amber-500/10 text-amber-300",
};

export function StatusBadge({ status, label, className }: { status: string; label?: string; className?: string }) {
  const key = String(status || "").toLowerCase();
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 whitespace-nowrap rounded-md border px-2 py-0.5 font-tech text-[11px] font-bold uppercase tracking-[0.14em]",
        STYLES[key] || "border-white/15 bg-white/5 text-white/70",
        className,
      )}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {label || key.replace(/_/g, " ")}
    </span>
  );
}

export function PanelLoader({ label = "Loading lounge data..." }: { label?: string }) {
  return (
    <div className="flex min-h-[260px] flex-col items-center justify-center gap-3 rounded-2xl border border-white/10 bg-coal/60 p-8 text-center">
      <Loader2 className="h-7 w-7 animate-spin text-blood" />
      <p className="font-tech text-sm font-semibold uppercase tracking-[0.2em] text-white/55">{label}</p>
    </div>
  );
}

export function EmptyState({ icon, title, subtitle, action }: { icon?: ReactNode; title: string; subtitle?: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-white/15 bg-coal/40 p-10 text-center">
      {icon && <div className="mb-3 grid h-12 w-12 place-items-center rounded-xl bg-blood/10 text-blood-400">{icon}</div>}
      <p className="font-display text-base font-bold uppercase tracking-wide text-white">{title}</p>
      {subtitle && <p className="mt-1.5 max-w-md text-sm text-white/55">{subtitle}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

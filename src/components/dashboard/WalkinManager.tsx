import { useEffect, useState, type FormEvent } from "react";
import { CheckCircle2, Clock, Gamepad2, PlusCircle, Timer, Wallet } from "lucide-react";
import { Modal } from "@/components/Modal";
import { Button } from "@/components/ui/Button";
import { Rupee } from "@/components/ui/Rupee";
import { useToast } from "@/components/ui/Toast";
import { api, ApiClientError, type ConsoleRecord, type PricingRecord, type WalkinRecord } from "@/lib/api";
import { cn } from "@/utils/cn";
import { EmptyState, StatusBadge } from "./StatusBadge";

function formatRemaining(expectedEndIso: string, nowMs: number) {
  const diff = Math.floor((Date.parse(expectedEndIso) - nowMs) / 1000);
  if (diff <= 0) return { text: "Time up", overdue: true };
  const h = Math.floor(diff / 3600);
  const m = Math.floor((diff % 3600) / 60);
  const s = diff % 60;
  return {
    text: h > 0 ? `${h}h ${String(m).padStart(2, "0")}m ${String(s).padStart(2, "0")}s` : `${m}m ${String(s).padStart(2, "0")}s`,
    overdue: false,
  };
}

function formatClock(iso: string) {
  try {
    return new Date(iso).toLocaleTimeString("en-IN", {
      timeZone: "Asia/Kolkata",
      hour: "numeric",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

export function ActiveSessionsList({
  sessions,
  onCompleted,
}: {
  sessions: WalkinRecord[];
  onCompleted: () => void;
}) {
  const toast = useToast();
  const [nowMs, setNowMs] = useState(() => Date.now());
  const [completingId, setCompletingId] = useState<string | null>(null);

  useEffect(() => {
    const id = window.setInterval(() => setNowMs(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, []);

  const handleComplete = async (id: string) => {
    setCompletingId(id);
    try {
      await api.staff.completeWalkin(id);
      toast.success("Session marked completed and console released.");
      onCompleted();
    } catch (err) {
      toast.error(err instanceof ApiClientError ? err.message : "Could not complete session.");
    } finally {
      setCompletingId(null);
    }
  };

  if (!sessions.length) {
    return (
      <EmptyState
        icon={<Timer className="h-6 w-6" />}
        title="No Active Sessions"
        subtitle="Start a walk-in session to track console timers and payments in real time."
      />
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2">
      {sessions.map((s) => {
        const rem = formatRemaining(s.expected_end_time, nowMs);
        return (
          <article
            key={s.id}
            className={cn(
              "hud rounded-2xl border bg-coal p-5 transition-colors",
              rem.overdue ? "border-blood/70 bg-blood/[0.08]" : "border-white/10",
            )}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <span className="font-tech text-xs font-bold uppercase tracking-[0.2em] text-blood-400">
                  {s.consoles?.name || "Console"}
                </span>
                <h4 className="mt-1 font-display text-lg font-black uppercase">{s.customer_name}</h4>
                <p className="text-xs text-white/55">+91 {s.customer_phone}</p>
              </div>
              <StatusBadge status={s.payment_status} label={`${s.payment_method} · ${s.payment_status}`} />
            </div>

            <div className="mt-5 grid grid-cols-3 gap-2 rounded-xl border border-white/10 bg-black/40 p-3 text-center">
              <div>
                <p className="font-tech text-[10px] font-bold uppercase tracking-[0.2em] text-white/45">Start</p>
                <p className="mt-0.5 font-display text-xs font-bold">{formatClock(s.start_time)}</p>
              </div>
              <div>
                <p className="font-tech text-[10px] font-bold uppercase tracking-[0.2em] text-white/45">Expected End</p>
                <p className="mt-0.5 font-display text-xs font-bold">{formatClock(s.expected_end_time)}</p>
              </div>
              <div>
                <p className="font-tech text-[10px] font-bold uppercase tracking-[0.2em] text-white/45">Remaining</p>
                <p className={cn("mt-0.5 font-display text-xs font-black tabular-nums", rem.overdue ? "text-blood-400" : "text-emerald-400")}>
                  {rem.text}
                </p>
              </div>
            </div>

            <div className="mt-4 flex items-center justify-between gap-3">
              <p className="font-tech text-sm font-bold text-white/75">
                Collected: <Rupee />
                {Number(s.amount_collected)} ({s.duration_minutes} min)
              </p>
              <Button
                size="sm"
                variant="outline"
                disabled={completingId === s.id}
                onClick={() => handleComplete(s.id)}
              >
                <CheckCircle2 className="h-4 w-4" />
                {completingId === s.id ? "Completing..." : "Complete Session"}
              </Button>
            </div>
          </article>
        );
      })}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Walk-in Booking Modal                                               */
/* ------------------------------------------------------------------ */
interface WalkinModalProps {
  open: boolean;
  onClose: () => void;
  consoles: ConsoleRecord[];
  pricing: PricingRecord[];
  onCreated: () => void;
}

export function WalkinBookingModal({ open, onClose, consoles, pricing, onCreated }: WalkinModalProps) {
  const toast = useToast();
  const availableConsoles = consoles.filter((c) => !["maintenance", "disabled"].includes(c.status));
  const [consoleId, setConsoleId] = useState<string>("");
  const [duration, setDuration] = useState<number>(60);
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<"cash" | "upi">("cash");
  const [customAmount, setCustomAmount] = useState<string>("");
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (open && !consoleId) {
      const preferred = availableConsoles.find((c) => c.effective_status === "available") || availableConsoles[0];
      if (preferred) setConsoleId(preferred.id);
    }
  }, [open, consoleId, availableConsoles]);

  const selectedConsole = consoles.find((c) => c.id === consoleId) || availableConsoles[0];
  const category = selectedConsole?.slug === "ps4pro" || selectedConsole?.console_type === "PS4 Pro" ? "ps4pro" : "ps4";
  const categoryPricing = pricing.filter((p) => p.category === category && p.is_active);
  const matchingPlan = categoryPricing.find((p) => p.duration_minutes === duration);
  const hourlyPlan = categoryPricing.find((p) => p.duration_minutes === 60);
  const calculatedPrice = matchingPlan
    ? Number(matchingPlan.price)
    : hourlyPlan
      ? Math.round(Number(hourlyPlan.price) * (duration / 60))
      : category === "ps4pro"
        ? 90
        : 70;

  const durationOptions = categoryPricing.length
    ? categoryPricing.map((p) => ({ minutes: p.duration_minutes, label: p.label, price: Number(p.price) }))
    : [
        { minutes: 30, label: "30 Minutes", price: category === "ps4pro" ? 55 : 40 },
        { minutes: 60, label: "1 Hour", price: category === "ps4pro" ? 90 : 70 },
        { minutes: 180, label: "3 Hours", price: category === "ps4pro" ? 230 : 200 },
        { minutes: 300, label: "5 Hours", price: category === "ps4pro" ? 380 : 350 },
      ];

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!selectedConsole) {
      toast.error("No operational console selected.");
      return;
    }
    setBusy(true);
    try {
      const amount = customAmount.trim() !== "" ? Number(customAmount) : calculatedPrice;
      await api.staff.createWalkin({
        customer_name: customerName,
        customer_phone: customerPhone,
        console_id: selectedConsole.id,
        duration_minutes: duration,
        payment_method: paymentMethod,
        amount_collected: amount,
        notes: notes.trim() || null,
      });
      toast.success(`Walk-in started on ${selectedConsole.name} (₹${amount} via ${paymentMethod.toUpperCase()}).`);
      setCustomerName("");
      setCustomerPhone("");
      setCustomAmount("");
      setNotes("");
      onCreated();
      onClose();
    } catch (err) {
      toast.error(err instanceof ApiClientError ? err.message : "Failed to register walk-in session.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="New Walk-in Session" subtitle="Register a customer visiting the lounge right now.">
      <form onSubmit={handleSubmit} className="space-y-5 p-5 sm:p-7">
        {/* Console Selection */}
        <div>
          <span className="block font-tech text-xs font-bold uppercase tracking-[0.2em] text-white/55">1. Select Console</span>
          <div className="mt-2 grid gap-2.5 sm:grid-cols-2">
            {consoles.map((c) => {
              const blocked = c.status === "maintenance" || c.status === "disabled";
              const occupied = c.effective_status === "occupied";
              const selected = (selectedConsole?.id || "") === c.id;
              return (
                <button
                  key={c.id}
                  type="button"
                  disabled={blocked}
                  onClick={() => setConsoleId(c.id)}
                  className={cn(
                    "flex items-center justify-between rounded-xl border p-3.5 text-left transition-all",
                    blocked
                      ? "cursor-not-allowed border-white/5 bg-white/[0.02] opacity-45"
                      : selected
                        ? "border-blood bg-blood/15 shadow-[0_0_24px_-8px_rgba(229,9,20,0.85)]"
                        : "border-white/10 bg-black/40 hover:border-white/25",
                  )}
                >
                  <div className="flex items-center gap-3">
                    <Gamepad2 className={cn("h-5 w-5", selected ? "text-blood-400" : "text-white/60")} />
                    <div>
                      <p className="font-display text-sm font-black uppercase">{c.name}</p>
                      <p className="text-xs text-white/50">{occupied ? "Currently occupied" : "Ready now"}</p>
                    </div>
                  </div>
                  <StatusBadge status={c.effective_status || c.status} />
                </button>
              );
            })}
          </div>
        </div>

        {/* Customer Details */}
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="wk-name" className="block font-tech text-xs font-bold uppercase tracking-[0.2em] text-white/55">
              Customer Name
            </label>
            <input
              id="wk-name"
              required
              minLength={2}
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              placeholder="Customer full name"
              className="field mt-2"
            />
          </div>
          <div>
            <label htmlFor="wk-phone" className="block font-tech text-xs font-bold uppercase tracking-[0.2em] text-white/55">
              Phone Number
            </label>
            <input
              id="wk-phone"
              required
              type="tel"
              value={customerPhone}
              onChange={(e) => setCustomerPhone(e.target.value)}
              placeholder="98765 43210"
              className="field mt-2"
            />
          </div>
        </div>

        {/* Duration */}
        <div>
          <span className="block font-tech text-xs font-bold uppercase tracking-[0.2em] text-white/55">2. Session Duration</span>
          <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3">
            {durationOptions.map((opt) => (
              <button
                key={opt.minutes}
                type="button"
                onClick={() => setDuration(opt.minutes)}
                className={cn(
                  "rounded-xl border p-2.5 text-left transition-all",
                  duration === opt.minutes ? "border-blood bg-blood/15 text-white" : "border-white/10 bg-black/40 text-white/70",
                )}
              >
                <p className="font-tech text-sm font-bold uppercase">{opt.label}</p>
                <p className="font-display text-sm font-black text-blood-300">
                  <Rupee />
                  {opt.price}
                </p>
              </button>
            ))}
          </div>
        </div>

        {/* Payment Collection */}
        <div className="grid gap-4 rounded-2xl border border-white/10 bg-black/40 p-4 sm:grid-cols-2">
          <div>
            <span className="block font-tech text-xs font-bold uppercase tracking-[0.2em] text-white/55">3. Payment Method</span>
            <div className="mt-2 grid grid-cols-2 gap-2">
              {(["cash", "upi"] as const).map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setPaymentMethod(m)}
                  className={cn(
                    "flex items-center justify-center gap-2 rounded-xl border py-2.5 font-tech text-sm font-bold uppercase tracking-wider",
                    paymentMethod === m ? "border-blood bg-blood text-white" : "border-white/10 bg-coal text-white/65",
                  )}
                >
                  <Wallet className="h-4 w-4" />
                  {m.toUpperCase()}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label htmlFor="wk-amt" className="block font-tech text-xs font-bold uppercase tracking-[0.2em] text-white/55">
              Amount Collected (Default ₹{calculatedPrice})
            </label>
            <input
              id="wk-amt"
              type="number"
              min={0}
              value={customAmount}
              onChange={(e) => setCustomAmount(e.target.value)}
              placeholder={String(calculatedPrice)}
              className="field mt-2"
            />
          </div>
        </div>

        <div>
          <label htmlFor="wk-notes" className="block font-tech text-xs font-bold uppercase tracking-[0.2em] text-white/55">
            Notes (Optional)
          </label>
          <input
            id="wk-notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="e.g. FC27 1v1, extra controller..."
            className="field mt-2"
          />
        </div>

        <div className="flex items-center justify-between gap-4 border-t border-white/10 pt-4">
          <div className="flex items-center gap-2 text-sm text-white/70">
            <Clock className="h-4 w-4 text-blood-400" />
            Total Due:{" "}
            <strong className="font-display text-lg text-white">
              <Rupee />
              {customAmount.trim() !== "" ? Number(customAmount) : calculatedPrice}
            </strong>
          </div>
          <Button type="submit" disabled={busy || !selectedConsole}>
            <PlusCircle />
            {busy ? "Starting..." : "Confirm & Start Session"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

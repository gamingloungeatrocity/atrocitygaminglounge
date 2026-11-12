import { useEffect, useMemo, useState, type ComponentType, type FormEvent } from "react";
import { Check, CircleCheckBig, Clock, Crown, CreditCard, Gamepad2, Hourglass, Info, Mail, Minus, Phone, Plus, Trophy, Users } from "lucide-react";
import {
  BUSINESS,
  GAMES,
  SERVICES,
  getService,
  type BookingPrefill,
  type ConsolePref,
  type Service,
  type ServiceId,
} from "@/data/site";
import { usePublicData } from "@/context/publicData";
import { api, ApiClientError, type PricingRecord, type TournamentRecord } from "@/lib/api";
import { mailtoHref, normalizeIndianMobile, telHref, whatsappHref } from "@/lib/contact";
import { addDaysYmd, buildSlots, formatYmd, getIstNow, valueToLabel } from "@/lib/time";
import { cn } from "@/utils/cn";
import { Modal } from "./Modal";
import { Button } from "./ui/Button";
import { Rupee } from "./ui/Rupee";
import { WhatsAppIcon } from "./ui/icons";

interface FormState {
  service: ServiceId;
  consolePref: ConsolePref;
  hours: number;
  date: string;
  time: string;
  players: number;
  groupSize: number;
  game: string;
  tournament: string;
  gamerTag: string;
  name: string;
  phone: string;
  notes: string;
}

type FieldErrors = Partial<Record<"name" | "phone" | "date" | "time" | "server", string>>;

const SERVICE_ICONS: Record<ServiceId, ComponentType<{ className?: string }>> = {
  hourly: Clock,
  pack3: Hourglass,
  daypass: Crown,
  group: Users,
  tournament: Trophy,
};

const LABEL = "block font-tech text-xs font-bold uppercase tracking-[0.2em] text-white/55";
const LEGEND = "flex items-center gap-2.5 font-display text-sm font-black uppercase tracking-wider";

function sessionMinutes(service: ServiceId, hours: number): number {
  return service === "hourly" ? hours * 60 : getService(service).durationMins || 60;
}

function openSlotsFor(date: string, service: ServiceId, hours: number) {
  return buildSlots(date, sessionMinutes(service, hours), 30).filter((slot) => !slot.past);
}

function getRateFromPricing(pricing: PricingRecord[], category: "ps4" | "ps4pro" | "whole_lounge", mins: number, fallback: number): number {
  const exact = pricing.find((p) => p.category === category && p.duration_minutes === mins && p.is_active);
  if (exact) return Number(exact.price);
  if (category === "whole_lounge") {
    const anyWl = pricing.find((p) => p.category === "whole_lounge" && p.is_active);
    if (anyWl) return Number(anyWl.price);
  }
  const hourly = pricing.find((p) => p.category === category && p.duration_minutes === 60 && p.is_active);
  if (hourly) return Math.round(Number(hourly.price) * (mins / 60));
  return fallback;
}

function estimateFor(
  service: ServiceId,
  hours: number,
  consolePref: ConsolePref,
  pricing: PricingRecord[],
  tournaments: TournamentRecord[],
  selectedTournamentId: string,
): number | null {
  const cat = consolePref === "PS4 Pro" ? "ps4pro" : "ps4";
  if (service === "hourly") return getRateFromPricing(pricing, cat, hours * 60, hours * (cat === "ps4pro" ? 90 : 70));
  if (service === "pack3") return getRateFromPricing(pricing, cat, 180, cat === "ps4pro" ? 230 : 200);
  if (service === "daypass") return getRateFromPricing(pricing, cat, 300, cat === "ps4pro" ? 380 : 350);
  if (service === "group") return getRateFromPricing(pricing, "whole_lounge", 180, 2500);
  if (service === "tournament") {
    const t = tournaments.find((x) => x.id === selectedTournamentId || x.title === selectedTournamentId);
    return t ? Number(t.entry_fee) : null;
  }
  return null;
}

function getServicePriceLabel(service: Service, consolePref: ConsolePref, pricing: PricingRecord[]): string {
  const cat = consolePref === "PS4 Pro" ? "ps4pro" : "ps4";
  if (service.kind === "group") {
    const p = getRateFromPricing(pricing, "whole_lounge", 180, 2500);
    return `₹${p} flat`;
  }
  if (service.kind === "tournament") return "Register";
  if (service.id === "hourly") return `₹${getRateFromPricing(pricing, cat, 60, cat === "ps4pro" ? 90 : 70)} / hr`;
  if (service.id === "pack3") return `₹${getRateFromPricing(pricing, cat, 180, cat === "ps4pro" ? 230 : 200)} / 3 hrs`;
  if (service.id === "daypass") return `₹${getRateFromPricing(pricing, cat, 300, cat === "ps4pro" ? 380 : 350)} / 5 hrs`;
  return "Select";
}

function createInitialState(prefill: BookingPrefill, tournaments: TournamentRecord[]): FormState {
  const today = getIstNow().ymd;
  const service = prefill.service ?? "hourly";
  let date = prefill.date && prefill.date >= today ? prefill.date : today;
  let slots = openSlotsFor(date, service, 1);
  if (!slots.length && !prefill.date) {
    date = addDaysYmd(today, 1);
    slots = openSlotsFor(date, service, 1);
  }
  const time = prefill.time && slots.some((s) => s.value === prefill.time) ? prefill.time : (slots[0]?.value ?? "");
  const defaultTournament =
    prefill.tournament ||
    tournaments.find((t) => t.status === "registration_open" || t.status === "upcoming")?.id ||
    "";
  return {
    service,
    consolePref: prefill.consolePref ?? "PS4",
    hours: 1,
    date,
    time,
    players: 1,
    groupSize: 8,
    game: prefill.game ?? "",
    tournament: defaultTournament,
    gamerTag: "",
    name: "",
    phone: "",
    notes: "",
  };
}

function summaryRows(form: FormState, tournaments: TournamentRecord[]): [string, string][] {
  const svc = getService(form.service);
  const rows: [string, string][] = [["Experience", svc.name]];
  if (svc.kind === "console") rows.push(["Console", form.consolePref]);
  if (form.service === "hourly") rows.push(["Duration", `${form.hours} hour${form.hours > 1 ? "s" : ""}`]);
  if (svc.kind !== "tournament") {
    rows.push(["Date", form.date ? formatYmd(form.date, "short") : "—"]);
    rows.push(["Time", form.time ? valueToLabel(form.time) : "—"]);
  }
  if (svc.kind === "console") rows.push(["Players", String(form.players)]);
  if (svc.kind === "group") rows.push(["Group size", `${form.groupSize} people`]);
  if (svc.kind === "console" && form.game) rows.push(["Game", form.game]);
  if (svc.kind === "tournament") {
    const matched = tournaments.find((t) => t.id === form.tournament || t.title === form.tournament);
    rows.push(["Tournament", matched?.title || form.tournament || "Upcoming tournament"]);
    if (form.gamerTag.trim()) rows.push(["Gamer tag", form.gamerTag.trim()]);
  }
  return rows;
}

function buildMessage(
  form: FormState,
  phone: string,
  estimate: number | null,
  tournaments: TournamentRecord[],
  bookingCode?: string,
): string {
  const svc = getService(form.service);
  const lines = [
    "Hi Atrocity Gaming Lounge! 🎮",
    svc.kind === "tournament" ? "I've submitted a tournament registration." : "I've submitted a booking request.",
    ...(bookingCode ? [`• Reference ID: ${bookingCode}`] : []),
    "",
    `• Name: ${form.name.trim()}`,
    `• Phone: +91 ${phone}`,
    ...summaryRows(form, tournaments).map(([label, value]) => `• ${label}: ${value}`),
  ];
  if (estimate !== null && estimate > 0) lines.push(`• Estimated total: ₹${estimate}`);
  if (form.notes.trim()) lines.push(`• Notes: ${form.notes.trim()}`);
  lines.push("", svc.kind === "tournament" ? "Please share tournament confirmation details. Thanks!" : "Please confirm my slot. Thanks!");
  return lines.join("\n");
}

function StepNum({ n }: { n: number }) {
  return (
    <span className="grid h-6 w-6 place-items-center rounded-md bg-blood/15 font-display text-[11px] font-black text-blood-400">
      {n}
    </span>
  );
}

function FieldError({ id, message }: { id: string; message?: string }) {
  if (!message) return null;
  return (
    <p id={id} role="alert" className="mt-1.5 flex items-center gap-1.5 text-xs font-medium text-blood-300">
      <Info className="h-3.5 w-3.5 shrink-0" />
      {message}
    </p>
  );
}

function StepperField({
  id,
  label,
  value,
  min,
  max,
  suffix,
  onChange,
}: {
  id: string;
  label: string;
  value: number;
  min: number;
  max: number;
  suffix?: string;
  onChange: (value: number) => void;
}) {
  return (
    <div>
      <span id={`${id}-label`} className={LABEL}>
        {label}
      </span>
      <div
        role="group"
        aria-labelledby={`${id}-label`}
        className="mt-2 flex h-12 items-center justify-between rounded-xl border border-white/10 bg-black/45 px-1.5"
      >
        <button
          type="button"
          onClick={() => onChange(Math.max(min, value - 1))}
          disabled={value <= min}
          aria-label={`Decrease ${label.toLowerCase()}`}
          className="grid h-9 w-9 place-items-center rounded-lg text-white/70 transition-colors hover:bg-blood/15 hover:text-white disabled:opacity-30"
        >
          <Minus className="h-4 w-4" />
        </button>
        <output id={id} aria-live="polite" className="font-display text-base font-bold">
          {value}
          {suffix && <span className="ml-1.5 font-tech text-sm font-semibold text-white/50">{suffix}</span>}
        </output>
        <button
          type="button"
          onClick={() => onChange(Math.min(max, value + 1))}
          disabled={value >= max}
          aria-label={`Increase ${label.toLowerCase()}`}
          className="grid h-9 w-9 place-items-center rounded-lg text-white/70 transition-colors hover:bg-blood/15 hover:text-white disabled:opacity-30"
        >
          <Plus className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

function BookingForm({ prefill, onClose }: { prefill: BookingPrefill; onClose: () => void }) {
  const { consoles, pricing, tournaments, backendConnected } = usePublicData();
  const [form, setForm] = useState<FormState>(() => createInitialState(prefill, tournaments));
  const [errors, setErrors] = useState<FieldErrors>({});
  const [submitting, setSubmitting] = useState(false);
  const [confirmed, setConfirmed] = useState<{
    whatsappUrl: string;
    bookingCode?: string;
    recordId?: string;
    bookingType: "console" | "group" | "tournament";
    paidOnline?: boolean;
  } | null>(null);
  const [payNotice, setPayNotice] = useState<string | null>(null);

  const today = useMemo(() => getIstNow().ymd, []);
  const maxDate = useMemo(() => addDaysYmd(today, 60), [today]);

  const ps4Hourly = getRateFromPricing(pricing, "ps4", 60, 70);
  const ps4ProHourly = getRateFromPricing(pricing, "ps4pro", 60, 90);
  const ps4Row = consoles.find((c) => c.slug === "ps4" || c.console_type === "PS4");
  const ps4ProRow = consoles.find((c) => c.slug === "ps4pro" || c.console_type === "PS4 Pro");
  const isAvailable = (row: typeof ps4Row) => row?.status !== "maintenance" && row?.status !== "disabled";
  const availableConsoleIds = useMemo(
    () => ([
      ...(isAvailable(ps4Row) ? (["PS4"] as const) : []),
      ...(isAvailable(ps4ProRow) ? (["PS4 Pro"] as const) : []),
    ]),
    [ps4Row, ps4ProRow],
  );

  const consoleOptions: { id: ConsolePref; label: string; rate: string; disabled: boolean }[] = [
    {
      id: "PS4",
      label: "PS4",
      rate: ps4Row?.status === "maintenance" || ps4Row?.status === "disabled" ? ps4Row.status : `₹${ps4Hourly}/hr`,
      disabled: ps4Row?.status === "maintenance" || ps4Row?.status === "disabled",
    },
    {
      id: "PS4 Pro",
      label: "PS4 Pro",
      rate: ps4ProRow?.status === "maintenance" || ps4ProRow?.status === "disabled" ? ps4ProRow.status : `₹${ps4ProHourly}/hr`,
      disabled: ps4ProRow?.status === "maintenance" || ps4ProRow?.status === "disabled",
    },
  ];
  const CONSOLE_OPTIONS = consoleOptions.filter(
    (option) => !option.disabled || availableConsoleIds.length === 0,
  );

  useEffect(() => {
    if (availableConsoleIds.length && !availableConsoleIds.includes(form.consolePref as "PS4" | "PS4 Pro")) {
      update({ consolePref: availableConsoleIds[0] });
    }
  }, [availableConsoleIds, form.consolePref]);

  const service = getService(form.service);
  const isConsole = service.kind === "console";
  const needsSchedule = service.kind !== "tournament";
  const slots = useMemo(
    () => (needsSchedule ? openSlotsFor(form.date, form.service, form.hours) : []),
    [needsSchedule, form.date, form.service, form.hours],
  );
  const estimate = estimateFor(form.service, form.hours, form.consolePref, pricing, tournaments, form.tournament);
  const rows = summaryRows(form, tournaments);

  const update = (patch: Partial<FormState>) => {
    setForm((prev) => {
      const next = { ...prev, ...patch };
      if (getService(next.service).kind !== "tournament") {
        const open = openSlotsFor(next.date, next.service, next.hours);
        if (!open.some((s) => s.value === next.time)) next.time = open[0]?.value ?? "";
      }
      return next;
    });
    setErrors((prev) => {
      const keys = Object.keys(patch);
      const scheduleChange = keys.some((k) => k === "date" || k === "service" || k === "hours");
      const copy = { ...prev };
      delete copy.server;
      for (const k of keys) delete copy[k as keyof FieldErrors];
      if (scheduleChange) delete copy.time;
      return copy;
    });
  };

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const next: FieldErrors = {};
    const phone = normalizeIndianMobile(form.phone);
    if (needsSchedule) {
      if (!form.date) next.date = "Please pick a date.";
      else if (form.date < today) next.date = "That date has already passed.";
      if (!form.time) next.time = "No slots left on this date — please choose another day.";
    }
    if (form.name.trim().length < 2) next.name = "Please enter your name.";
    if (!phone) next.phone = "Enter a valid 10-digit Indian mobile number.";
    setErrors(next);

    const firstInvalid = (["date", "time", "name", "phone"] as const).find((key) => next[key]);
    if (firstInvalid || !phone) {
      if (firstInvalid) document.getElementById(`bk-${firstInvalid}`)?.focus();
      return;
    }

    setSubmitting(true);
    setPayNotice(null);

    try {
      let bookingCode: string | undefined;
      let recordId: string | undefined;
      let bookingType: "console" | "group" | "tournament" = "console";

      if (backendConnected) {
        if (service.kind === "console") {
          bookingType = "console";
          const targetConsole = form.consolePref;
          const res = await api.public.createBooking({
            customer_name: form.name.trim(),
            customer_phone: phone,
            console_type: targetConsole,
            booking_date: form.date,
            start_time: form.time,
            duration: sessionMinutes(form.service, form.hours),
            game_title: form.game || null,
            players: form.players,
            notes: form.notes.trim() || null,
          });
          bookingCode = res.booking_code;
          recordId = res.id;
        } else if (service.kind === "group") {
          bookingType = "group";
          const res = await api.public.createGroupBooking({
            customer_name: form.name.trim(),
            customer_phone: phone,
            booking_date: form.date,
            start_time: form.time,
            duration: 180,
            number_of_people: form.groupSize,
            notes: form.notes.trim() || null,
          });
          bookingCode = res.booking_code;
          recordId = res.id;
        } else {
          bookingType = "tournament";
          const tId =
            tournaments.find((t) => t.id === form.tournament || t.title === form.tournament)?.id ||
            tournaments[0]?.id;
          if (!tId) throw new ApiClientError(400, "NO_TOURNAMENT", "No tournament selected.");
          const res = await api.public.registerTournament(tId, {
            participant_name: form.name.trim(),
            phone,
            gamer_tag: form.gamerTag.trim() || null,
            notes: form.notes.trim() || null,
          });
          bookingCode = res.registration_code;
          recordId = res.id;
        }
      }

      const url = whatsappHref(buildMessage(form, phone, estimate, tournaments, bookingCode));
      if (!backendConnected) {
        window.open(url, "_blank", "noopener,noreferrer");
      }
      setConfirmed({ whatsappUrl: url, bookingCode, recordId, bookingType });
    } catch (err) {
      if (err instanceof ApiClientError) {
        setErrors({ server: err.message });
      } else {
        setErrors({ server: "Unable to complete booking right now. Please try another slot or contact us." });
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handlePayOnline = async () => {
    if (!confirmed?.recordId) return;
    setPayNotice(null);
    try {
      const order = await api.public.createCashfreeOrder({
        booking_type: confirmed.bookingType,
        record_id: confirmed.recordId,
      });

      const getCashfreeSdk = async (): Promise<((opts: { mode: string }) => {
        checkout: (opts: { paymentSessionId: string; redirectTarget?: string }) => Promise<{
          error?: { message?: string };
          redirect?: boolean;
          paymentDetails?: unknown;
        }>;
      }) | null> => {
        const win = window as unknown as { Cashfree?: (opts: { mode: string }) => any };
        if (typeof win.Cashfree === "function") return win.Cashfree;
        return new Promise((resolve) => {
          const script = document.createElement("script");
          script.src = "https://sdk.cashfree.com/js/v3/cashfree.js";
          script.async = true;
          script.onload = () => resolve((window as unknown as { Cashfree?: any }).Cashfree || null);
          script.onerror = () => resolve(null);
          document.head.appendChild(script);
        });
      };

      const CashfreeCtor = await getCashfreeSdk();
      if (!CashfreeCtor) {
        setPayNotice("Cashfree checkout script not loaded in browser. You can pay at the lounge via Cash or UPI.");
        return;
      }

      const cashfree = CashfreeCtor({
        mode: order.environment === "production" ? "production" : "sandbox",
      });

      const result = await cashfree.checkout({
        paymentSessionId: order.payment_session_id,
        redirectTarget: "_modal",
      });

      if (result?.error) {
        setPayNotice(result.error.message || "Payment was cancelled or could not be completed.");
        return;
      }

      try {
        await api.public.verifyCashfreeOrder({ order_id: order.order_id });
        setConfirmed((c) => (c ? { ...c, paidOnline: true } : c));
        setPayNotice("Payment verified on backend server.");
      } catch (e) {
        setPayNotice(e instanceof ApiClientError ? e.message : "Payment verification failed.");
      }
    } catch (err) {
      setPayNotice(err instanceof ApiClientError ? err.message : "Online payment unavailable; pay at lounge.");
    }
  };

  if (confirmed) {
    return (
      <div className="p-6 text-center sm:p-10">
        <div className="mx-auto grid h-20 w-20 place-items-center rounded-full bg-blood/15 shadow-[0_0_40px_rgba(229,9,20,0.45)] ring-1 ring-blood/50">
          <CircleCheckBig className="h-10 w-10 text-blood-400" />
        </div>
        <h3 className="mt-6 font-display text-2xl font-black uppercase sm:text-3xl">
          {confirmed.bookingCode ? `Confirmed: ${confirmed.bookingCode}` : "Request ready!"}
        </h3>
        <p className="mx-auto mt-3 max-w-md text-white/65">
          {confirmed.bookingCode
            ? "Your request is saved in our system. You can send the summary on WhatsApp or pay online / at the lounge."
            : "We’ve opened WhatsApp with your details. Hit Send and our team will confirm with you shortly."}
        </p>

        {confirmed.paidOnline && (
          <p className="mx-auto mt-3 w-fit rounded-full border border-emerald-500/40 bg-emerald-500/10 px-4 py-1 font-tech text-xs font-bold uppercase text-emerald-300">
            Paid &amp; Verified
          </p>
        )}
        {payNotice && <p className="mt-3 text-xs text-amber-200">{payNotice}</p>}

        <dl className="mx-auto mt-6 max-w-sm space-y-2 rounded-2xl border border-white/10 bg-black/40 p-4 text-left text-sm">
          {rows.map(([label, value]) => (
            <div key={label} className="flex items-start justify-between gap-4">
              <dt className="text-white/50">{label}</dt>
              <dd className="text-right font-medium">{value}</dd>
            </div>
          ))}
        </dl>

        <div className="mt-7 flex flex-col justify-center gap-3 sm:flex-row">
          {confirmed.recordId && !confirmed.paidOnline && estimate && estimate > 0 && (
            <Button onClick={handlePayOnline}>
              <CreditCard /> Pay Online (₹{estimate})
            </Button>
          )}
          <Button variant={confirmed.recordId ? "outline" : "primary"} href={confirmed.whatsappUrl} target="_blank" rel="noopener noreferrer">
            <WhatsAppIcon /> Send on WhatsApp
          </Button>
          <Button variant="outline" href={telHref}>
            <Phone /> Call {BUSINESS.phoneDisplay}
          </Button>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="mt-5 font-tech text-sm font-bold uppercase tracking-[0.2em] text-white/50 transition-colors hover:text-white"
        >
          Done
        </button>
      </div>
    );
  }

  return (
    <form noValidate onSubmit={onSubmit} className="grid gap-8 p-5 sm:p-7 lg:grid-cols-[minmax(0,1fr)_300px]">
      <div className="min-w-0 space-y-8">
        {errors.server && (
          <div role="alert" className="rounded-xl border border-blood/60 bg-blood/15 p-4 text-sm text-blood-200">
            {errors.server}
          </div>
        )}

        <fieldset>
          <legend className={LEGEND}>
            <StepNum n={1} /> Choose your experience
          </legend>
          <div className="mt-4 grid grid-cols-2 gap-2.5 sm:grid-cols-3">
            {SERVICES.filter((s) => !prefill.game || s.kind === "console").map((s) => {
              const Icon = SERVICE_ICONS[s.id];
              const checked = form.service === s.id;
              const priceLabel = getServicePriceLabel(s, form.consolePref, pricing);
              return (
                <label
                  key={s.id}
                  className={cn(
                    "relative flex cursor-pointer flex-col rounded-xl border p-3 transition-all duration-200 has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-blood-400",
                    checked
                      ? "border-blood bg-blood/10 shadow-[0_0_24px_-8px_rgba(229,9,20,0.9)]"
                      : "border-white/10 bg-white/[0.02] hover:border-white/25",
                  )}
                >
                  <input
                    type="radio"
                    name="bk-service"
                    value={s.id}
                    checked={checked}
                    onChange={() => update({ service: s.id })}
                    className="sr-only"
                  />
                  <span className="flex items-center justify-between">
                    <Icon className={cn("h-5 w-5", checked ? "text-blood-400" : "text-white/60")} />
                    <span
                      className={cn(
                        "grid h-4 w-4 place-items-center rounded-full border",
                        checked ? "border-blood bg-blood" : "border-white/25",
                      )}
                    >
                      {checked && <Check className="h-2.5 w-2.5" strokeWidth={4} />}
                    </span>
                  </span>
                  <span className="mt-2.5 font-tech text-sm font-bold uppercase tracking-wider">{s.short}</span>
                  <span className="text-xs text-white/55">{priceLabel}</span>
                </label>
              );
            })}
          </div>
        </fieldset>

        <fieldset>
          <legend className={LEGEND}>
            <StepNum n={2} /> {needsSchedule ? "Pick your slot" : "Tournament details"}
          </legend>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            {isConsole && (
              <div className="sm:col-span-2">
                <span id="bk-console-label" className={LABEL}>
                  Select Console
                </span>
                <div role="radiogroup" aria-labelledby="bk-console-label" className="mt-2 grid grid-cols-2 gap-2">
                  {CONSOLE_OPTIONS.map((option) => {
                    const checked = form.consolePref === option.id;
                    return (
                      <label
                        key={option.id}
                        className={cn(
                          "flex flex-col items-center justify-center rounded-xl border px-2.5 py-2 text-center transition-all has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-blood-400",
                          option.disabled
                            ? "cursor-not-allowed border-white/5 bg-white/[0.02] opacity-40"
                            : checked
                              ? "cursor-pointer border-blood bg-blood/15 text-white"
                              : "cursor-pointer border-white/10 text-white/60 hover:border-white/25",
                        )}
                      >
                        <input
                          type="radio"
                          name="bk-console"
                          value={option.id}
                          disabled={option.disabled}
                          checked={checked}
                          onChange={() => update({ consolePref: option.id })}
                          className="sr-only"
                        />
                        <span className="font-tech text-sm font-bold uppercase tracking-wider">{option.label}</span>
                        <span className="text-[11px] uppercase text-blood-300">{option.rate}</span>
                      </label>
                    );
                  })}
                </div>
              </div>
            )}

            {needsSchedule && (
              <>
                <div>
                  <label htmlFor="bk-date" className={LABEL}>
                    Date
                  </label>
                  <input
                    id="bk-date"
                    type="date"
                    className="field mt-2"
                    min={today}
                    max={maxDate}
                    value={form.date}
                    onChange={(e) => update({ date: e.target.value })}
                    aria-invalid={Boolean(errors.date)}
                    aria-describedby={errors.date ? "bk-date-err" : undefined}
                  />
                  <FieldError id="bk-date-err" message={errors.date} />
                </div>
                <div>
                  <label htmlFor="bk-time" className={LABEL}>
                    Start time
                  </label>
                  <select
                    id="bk-time"
                    className="field mt-2"
                    value={form.time}
                    onChange={(e) => update({ time: e.target.value })}
                    aria-invalid={Boolean(errors.time)}
                    aria-describedby={errors.time ? "bk-time-err" : undefined}
                  >
                    {slots.length === 0 ? (
                      <option value="">No slots left — pick another date</option>
                    ) : (
                      slots.map((slot) => (
                        <option key={slot.value} value={slot.value}>
                          {slot.label}
                          {slot.peak ? " · Peak" : ""}
                        </option>
                      ))
                    )}
                  </select>
                  <FieldError id="bk-time-err" message={errors.time} />
                </div>
              </>
            )}

            {form.service === "hourly" && (
              <StepperField
                id="bk-hours"
                label="Hours"
                value={form.hours}
                min={1}
                max={8}
                suffix={form.hours === 1 ? "hr" : "hrs"}
                onChange={(v) => update({ hours: v })}
              />
            )}
            {isConsole && (
              <StepperField id="bk-players" label="Players" value={form.players} min={1} max={4} onChange={(v) => update({ players: v })} />
            )}
            {service.kind === "group" && (
              <StepperField
                id="bk-group"
                label="Group size"
                value={form.groupSize}
                min={2}
                max={40}
                suffix="people"
                onChange={(v) => update({ groupSize: v })}
              />
            )}

            {isConsole && (
              <div className="sm:col-span-2">
                <label htmlFor="bk-game" className={LABEL}>
                  Game (optional)
                </label>
                <select id="bk-game" className="field mt-2" value={form.game} onChange={(e) => update({ game: e.target.value })}>
                  <option value="">Decide at the venue</option>
                  {GAMES.map((g) => (
                    <option key={g.id} value={g.title}>
                      {g.title}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {service.kind === "group" && (
              <p className="flex items-start gap-3 rounded-xl border border-blood/30 bg-blood/[0.07] p-4 text-sm text-white/75 sm:col-span-2">
                <Gamepad2 className="mt-0.5 h-4 w-4 shrink-0 text-blood-400" />
                Reserves the entire gaming lounge (both PS4 and PS4 Pro stations) once approved by our team.
              </p>
            )}

            {service.kind === "tournament" && (
              <>
                <div className="sm:col-span-2">
                  <label htmlFor="bk-tournament" className={LABEL}>
                    Tournament
                  </label>
                  <select
                    id="bk-tournament"
                    className="field mt-2"
                    value={form.tournament}
                    onChange={(e) => update({ tournament: e.target.value })}
                  >
                    {tournaments.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.title} — {t.game_name} (Entry ₹{Number(t.entry_fee)})
                      </option>
                    ))}
                  </select>
                </div>
                <div className="sm:col-span-2">
                  <label htmlFor="bk-tag" className={LABEL}>
                    Gamer tag / PSN ID (optional)
                  </label>
                  <input
                    id="bk-tag"
                    className="field mt-2"
                    value={form.gamerTag}
                    onChange={(e) => update({ gamerTag: e.target.value })}
                    placeholder="e.g. CrimsonReaper"
                    maxLength={40}
                    autoComplete="off"
                  />
                </div>
              </>
            )}
          </div>
        </fieldset>

        <fieldset>
          <legend className={LEGEND}>
            <StepNum n={3} /> Your details
          </legend>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="bk-name" className={LABEL}>
                Full name
              </label>
              <input
                id="bk-name"
                className="field mt-2"
                value={form.name}
                onChange={(e) => update({ name: e.target.value })}
                autoComplete="name"
                placeholder="Your name"
                maxLength={60}
                aria-invalid={Boolean(errors.name)}
                aria-describedby={errors.name ? "bk-name-err" : undefined}
              />
              <FieldError id="bk-name-err" message={errors.name} />
            </div>
            <div>
              <label htmlFor="bk-phone" className={LABEL}>
                Mobile number
              </label>
              <div className="relative mt-2">
                <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 font-tech text-base font-bold text-white/50">
                  +91
                </span>
                <input
                  id="bk-phone"
                  type="tel"
                  inputMode="tel"
                  className="field pl-14"
                  value={form.phone}
                  onChange={(e) => update({ phone: e.target.value })}
                  autoComplete="tel-national"
                  placeholder="98765 43210"
                  maxLength={16}
                  aria-invalid={Boolean(errors.phone)}
                  aria-describedby={errors.phone ? "bk-phone-err" : undefined}
                />
              </div>
              <FieldError id="bk-phone-err" message={errors.phone} />
            </div>
            <div className="sm:col-span-2">
              <label htmlFor="bk-notes" className={LABEL}>
                Notes (optional)
              </label>
              <textarea
                id="bk-notes"
                rows={3}
                className="field mt-2 resize-none"
                value={form.notes}
                onChange={(e) => update({ notes: e.target.value })}
                placeholder="Anything we should know?"
                maxLength={300}
              />
            </div>
          </div>
        </fieldset>
      </div>

      <aside className="lg:sticky lg:top-4 lg:self-start">
        <div className="rounded-2xl border border-white/10 bg-black/50 p-5">
          <p className="font-tech text-xs font-bold uppercase tracking-[0.3em] text-white/45">Booking summary</p>
          <dl className="mt-4 space-y-2.5 text-sm">
            {rows.map(([label, value]) => (
              <div key={label} className="flex items-start justify-between gap-4">
                <dt className="text-white/50">{label}</dt>
                <dd className="text-right font-medium text-white">{value}</dd>
              </div>
            ))}
          </dl>
          <div aria-hidden="true" className="my-4 h-px bg-white/10" />
          <div className="flex items-end justify-between gap-3">
            <span className="font-tech text-xs font-bold uppercase tracking-[0.24em] text-white/45">
              {estimate !== null ? "Estimated total" : "Entry details"}
            </span>
            {estimate !== null ? (
              <span className="font-display text-2xl font-black">
                <Rupee className="text-[0.85em]" />
                {estimate}
              </span>
            ) : (
              <span className="font-tech text-sm font-bold uppercase tracking-wider text-white/70">On WhatsApp</span>
            )}
          </div>
          <p className="mt-2 text-xs text-white/45">{service.note}</p>
          <Button type="submit" disabled={submitting} className="mt-5 w-full">
            <Gamepad2 />
            {submitting
              ? "Submitting..."
              : service.kind === "tournament"
                ? "Register Now"
                : backendConnected
                  ? "Confirm Booking"
                  : "Book on WhatsApp"}
          </Button>
          <a
            href={telHref}
            className="mt-3 flex items-center justify-center gap-2 text-sm text-white/55 transition-colors hover:text-white"
          >
            <Phone className="h-4 w-4" /> Prefer to call? {BUSINESS.phoneDisplay}
          </a>
          <a
            href={mailtoHref}
            className="mt-2 flex items-center justify-center gap-2 break-all text-center text-xs text-white/45 transition-colors hover:text-white"
          >
            <Mail className="h-3.5 w-3.5 shrink-0" /> {BUSINESS.email}
          </a>
        </div>
      </aside>
    </form>
  );
}

interface BookingModalProps {
  open: boolean;
  prefill: BookingPrefill;
  onClose: () => void;
}

export function BookingModal({ open, prefill, onClose }: BookingModalProps) {
  const tournament = prefill.service === "tournament";
  return (
    <Modal
      open={open}
      onClose={onClose}
      size="lg"
      title={tournament ? "Join a Tournament" : "Book Your Session"}
      subtitle={
        tournament
          ? "Register directly to lock your tournament seat."
          : "Choose your console and time — real-time slot protection enabled."
      }
    >
      <BookingForm prefill={prefill} onClose={onClose} />
    </Modal>
  );
}

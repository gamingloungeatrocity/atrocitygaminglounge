import { useEffect, useMemo, useState, type ComponentType, type FormEvent } from "react";
import { Check, CircleCheckBig, Clock, Crown, CreditCard, Gamepad2, Hourglass, Info, LoaderCircle, Mail, Minus, Phone, Plus, Trophy, Users } from "lucide-react";
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
import { api, ApiClientError, type AvailabilityResponse, type PricingRecord, type TournamentRecord } from "@/lib/api";
import { mailtoHref, normalizeIndianMobile, telHref, whatsappHref } from "@/lib/contact";
import { addDaysYmd, buildSlots, formatYmd, getIstNow, valueToLabel } from "@/lib/time";
import { cn } from "@/utils/cn";
import { Modal } from "./Modal";
import { Button } from "./ui/Button";
import { Rupee } from "./ui/Rupee";
import { WhatsAppIcon } from "./ui/icons";
import {
  clearBookingConfirmation,
  loadBookingConfirmation,
  saveBookingConfirmation,
  type SavedBookingConfirmation,
} from "@/lib/booking-confirmation";

interface FormState {
  service: ServiceId;
  consolePref: ConsolePref;
  pricingId: string;
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
  const selected = getService(service);
  return selected.kind === "console" ? selected.durationMins : selected.durationMins || hours * 60;
}

function formatDuration(durationMinutes: number): string {
  if (durationMinutes % 60 === 0) {
    const hours = durationMinutes / 60;
    return `${hours} ${hours === 1 ? "hour" : "hours"}`;
  }
  return `${durationMinutes} minutes`;
}

function openSlotsFor(date: string, service: ServiceId, hours: number, durationOverride?: number) {
  return buildSlots(date, durationOverride ?? sessionMinutes(service, hours), 30).filter((slot) => !slot.past);
}

function getAvailabilityConsoleSlug(
  consoles: AvailabilityResponse["consoles"],
  consolePref: ConsolePref,
): string | undefined {
  const expectedSlug = consolePref === "PS4 Pro" ? "ps4pro" : "ps4";
  const expectedTypes = consolePref === "PS4 Pro" ? ["ps4pro", "playstation4pro"] : ["ps4", "playstation4"];
  const normalize = (value: string) => value.trim().toLowerCase().replace(/[^a-z0-9]/g, "");
  return (
    consoles.find((consoleRecord) => normalize(consoleRecord.slug) === expectedSlug)?.slug ??
    consoles.find((consoleRecord) =>
      [consoleRecord.console_type, consoleRecord.name].some((value) => expectedTypes.includes(normalize(value))),
    )?.slug
  );
}

function getRateFromPricing(pricing: PricingRecord[], category: "ps4" | "ps4pro" | "whole_lounge", mins: number): number | null {
  const exact = pricing.find((p) => p.category === category && p.duration_minutes === mins && p.is_active);
  if (exact) return Number(exact.price);
  if (category === "whole_lounge") {
    const anyWl = pricing.find((p) => p.category === "whole_lounge" && p.is_active);
    if (anyWl) return Number(anyWl.price);
  }
  return null;
}

function estimateFor(
  service: ServiceId,
  selectedPricing: PricingRecord | undefined,
  pricing: PricingRecord[],
  tournaments: TournamentRecord[],
  selectedTournamentId: string,
  players: number,
): number | null {
  const serviceDetails = getService(service);
  if (serviceDetails.kind === "console") {
    return selectedPricing ? Number(selectedPricing.price) * Math.max(1, players) : null;
  }
  if (serviceDetails.kind === "group") return getRateFromPricing(pricing, "whole_lounge", 180);
  if (serviceDetails.kind === "tournament") {
    const t = tournaments.find((x) => x.id === selectedTournamentId || x.title === selectedTournamentId);
    return t ? Number(t.entry_fee) : null;
  }
  return null;
}

function getServicePriceLabel(service: Service, pricing: PricingRecord[]): string {
  if (service.kind === "group") {
    const price = getRateFromPricing(pricing, "whole_lounge", 180);
    return price === null ? "Unavailable" : `₹${price} flat`;
  }
  if (service.kind === "tournament") return "Register";
  return "Select a configured package";
}

function serviceForDuration(durationMinutes: number): ServiceId {
  if (durationMinutes === 180) return "pack3";
  if (durationMinutes === 300) return "daypass";
  return "hourly";
}

function createInitialState(
  prefill: BookingPrefill,
  tournaments: TournamentRecord[],
  pricing: PricingRecord[],
): FormState {
  const today = getIstNow().ymd;
  const requestedService = prefill.service ?? "hourly";
  const consolePref = prefill.consolePref ?? "PS4";
  const category = consolePref === "PS4 Pro" ? "ps4pro" : "ps4";
  const matchingPricing = pricing.filter((item) => item.category === category && item.is_active && item.duration_minutes > 0);
  const selectedPricing = prefill.pricingId
    ? matchingPricing.find((item) => item.id === prefill.pricingId)
    : matchingPricing.find((item) => item.duration_minutes === getService(requestedService).durationMins);
  const service = selectedPricing ? serviceForDuration(selectedPricing.duration_minutes) : requestedService;
  const hours = selectedPricing
    ? selectedPricing.duration_minutes / 60
    : Math.max(1, getService(service).durationMins / 60);
  let date = prefill.date && prefill.date >= today ? prefill.date : today;
  let slots = openSlotsFor(date, service, hours, selectedPricing?.duration_minutes);
  if (!slots.length && !prefill.date) {
    date = addDaysYmd(today, 1);
    slots = openSlotsFor(date, service, hours, selectedPricing?.duration_minutes);
  }
  const time = prefill.time && slots.some((s) => s.value === prefill.time) ? prefill.time : (slots[0]?.value ?? "");
  const defaultTournament =
    prefill.tournament ||
    tournaments.find((t) => t.status === "registration_open" || t.status === "upcoming")?.id ||
    "";
  return {
    service,
    consolePref,
    pricingId: selectedPricing?.id ?? "",
    hours,
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

function summaryRows(
  form: FormState,
  tournaments: TournamentRecord[],
  selectedPricing?: PricingRecord,
): [string, string][] {
  const svc = getService(form.service);
  const rows: [string, string][] = [["Experience", selectedPricing?.label.trim() || svc.name]];
  if (svc.kind === "console") rows.push(["Console", form.consolePref]);
  if (svc.kind === "console") rows.push(["Duration", formatDuration(selectedPricing?.duration_minutes ?? svc.durationMins)]);
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
  selectedPricing?: PricingRecord,
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
    ...summaryRows(form, tournaments, selectedPricing).map(([label, value]) => `• ${label}: ${value}`),
  ];
  if (estimate !== null && estimate > 0) lines.push(`• Total payable: ₹${estimate}`);
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
  const [form, setForm] = useState<FormState>(() => createInitialState(prefill, tournaments, pricing));
  const [errors, setErrors] = useState<FieldErrors>({});
  const [submitting, setSubmitting] = useState(false);
  const [confirmed, setConfirmed] = useState<SavedBookingConfirmation | null>(() => loadBookingConfirmation());
  const [restoredOrderId] = useState(() => loadBookingConfirmation()?.orderId || null);
  const [payProcessing, setPayProcessing] = useState(false);
  const [payNotice, setPayNotice] = useState<string | null>(null);
  const [availability, setAvailability] = useState<AvailabilityResponse | null>(null);
  const [availabilityLoading, setAvailabilityLoading] = useState(false);
  const [availabilityError, setAvailabilityError] = useState<string | null>(null);
  const [availabilityRetry, setAvailabilityRetry] = useState(0);

  const today = useMemo(() => getIstNow().ymd, []);
  const maxDate = useMemo(() => addDaysYmd(today, 60), [today]);

  const ps4Hourly = getRateFromPricing(pricing, "ps4", 60);
  const ps4ProHourly = getRateFromPricing(pricing, "ps4pro", 60);
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
      rate:
        ps4Row?.status === "maintenance" || ps4Row?.status === "disabled"
          ? ps4Row.status
          : ps4Hourly === null
            ? "No hourly tier"
            : `₹${ps4Hourly}/player/hr`,
      disabled: ps4Row?.status === "maintenance" || ps4Row?.status === "disabled",
    },
    {
      id: "PS4 Pro",
      label: "PS4 Pro",
      rate:
        ps4ProRow?.status === "maintenance" || ps4ProRow?.status === "disabled"
          ? ps4ProRow.status
          : ps4ProHourly === null
            ? "No hourly tier"
            : `₹${ps4ProHourly}/player/hr`,
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
  const pricingCategory = form.consolePref === "PS4 Pro" ? "ps4pro" : "ps4";
  const consolePackages = backendConnected
    ? pricing
        .filter((entry) => entry.category === pricingCategory && entry.is_active && entry.duration_minutes > 0)
        .sort((a, b) => a.sort_order - b.sort_order || a.duration_minutes - b.duration_minutes)
    : [];
  const selectedPricing = isConsole
    ? consolePackages.find((entry) => entry.id === form.pricingId)
    : undefined;
  const durationMinutes = isConsole
    ? selectedPricing?.duration_minutes ?? service.durationMins
    : sessionMinutes(form.service, form.hours);
  const generatedSlots = useMemo(
    () => (needsSchedule ? openSlotsFor(form.date, form.service, form.hours, isConsole ? durationMinutes : undefined) : []),
    [needsSchedule, form.date, form.service, form.hours, isConsole, durationMinutes],
  );
  const availabilityForSelection =
    isConsole &&
    availability &&
    availability.date === form.date &&
    availability.durationMinutes === durationMinutes
      ? availability
      : null;
  const availabilityConsoleSlug = availabilityForSelection
    ? getAvailabilityConsoleSlug(availabilityForSelection.consoles, form.consolePref)
    : undefined;
  const availabilityReady = Boolean(
    backendConnected &&
      availabilityForSelection &&
      availabilityConsoleSlug &&
      !availabilityLoading &&
      !availabilityError,
  );
  const slots = useMemo(() => {
    if (!isConsole || !availabilityForSelection) return generatedSlots;
    return availabilityForSelection.slots
      .filter((slot) => !slot.past)
      .map((slot) => {
        const generatedSlot = generatedSlots.find((candidate) => candidate.value === slot.time);
        if (generatedSlot) return generatedSlot;
        const [hour, minute] = slot.time.split(":").map(Number);
        return {
          value: slot.time,
          minutes: hour * 60 + minute,
          label: valueToLabel(slot.time),
          past: slot.past,
          peak: false,
        };
      });
  }, [availabilityForSelection, generatedSlots, isConsole]);
  const isTimeAvailable = (time: string) => {
    if (!isConsole) return true;
    if (!availabilityReady || !availabilityForSelection || !availabilityConsoleSlug) return false;
    const slot = availabilityForSelection.slots.find((entry) => entry.time === time);
    return Boolean(slot && !slot.past && slot.consoles[availabilityConsoleSlug]?.available);
  };
  const availableSlotsCount = slots.filter((slot) => isTimeAvailable(slot.value)).length;
  const availabilityUnavailable = isConsole && !availabilityLoading && !availabilityError && !availabilityReady;
  const estimate = estimateFor(form.service, selectedPricing, pricing, tournaments, form.tournament, form.players);
  const rows = summaryRows(form, tournaments, selectedPricing);
  const wholeLoungePrice = getRateFromPricing(pricing, "whole_lounge", 180);
  const bookingServiceNote = isConsole
    ? [
        selectedPricing?.bonus_minutes ? `${selectedPricing.bonus_minutes} mins bonus play time` : null,
        form.service === "daypass" ? "Priority booking" : null,
        "Full game library access",
        "DualShock 4 controllers",
      ]
        .filter(Boolean)
        .join(" · ")
    : service.note;
  const experienceOptions = [
    ...consolePackages.map((tier) => {
      const optionService = serviceForDuration(tier.duration_minutes);
      return {
        key: tier.id,
        service: optionService,
        pricingId: tier.id,
        label: tier.label.trim() || formatDuration(tier.duration_minutes),
        priceLabel: `₹${Number(tier.price)} / player`,
        Icon: SERVICE_ICONS[optionService],
        checked: form.pricingId === tier.id,
        disabled: false,
      };
    }),
    ...SERVICES.filter((item) => item.kind !== "console" && !prefill.game).map((item) => ({
      key: item.id,
      service: item.id,
      pricingId: "",
      label: item.short,
      priceLabel: getServicePriceLabel(item, pricing),
      Icon: SERVICE_ICONS[item.id],
      checked: form.service === item.id,
      disabled: item.kind === "group" && wholeLoungePrice === null,
    })),
  ];

  const update = (patch: Partial<FormState>) => {
    setForm((prev) => {
      const next = { ...prev, ...patch };
      const selectedService = getService(next.service);
      const availabilityInputsChanged = Object.keys(patch).some(
        (key) => key === "date" || key === "service" || key === "hours" || key === "consolePref" || key === "pricingId",
      );
      let selectedDuration: number | undefined;
      if (selectedService.kind === "console") {
        const category = next.consolePref === "PS4 Pro" ? "ps4pro" : "ps4";
        const selectedTier = pricing.find(
          (entry) => entry.id === next.pricingId && entry.category === category && entry.is_active,
        );
        selectedDuration = selectedTier?.duration_minutes;
        next.hours = selectedTier
          ? selectedTier.duration_minutes / 60
          : Math.max(1, selectedService.durationMins / 60);
      }
      if (selectedService.kind === "console" && availabilityInputsChanged) {
        next.time = "";
      } else if (selectedService.kind !== "tournament") {
        const open = openSlotsFor(next.date, next.service, next.hours, selectedDuration);
        if (!open.some((s) => s.value === next.time)) next.time = open[0]?.value ?? "";
      }
      return next;
    });
    setErrors((prev) => {
      const keys = Object.keys(patch);
      const scheduleChange = keys.some(
        (k) => k === "date" || k === "service" || k === "hours" || k === "consolePref" || k === "pricingId",
      );
      const copy = { ...prev };
      delete copy.server;
      for (const k of keys) delete copy[k as keyof FieldErrors];
      if (scheduleChange) delete copy.time;
      return copy;
    });
  };

  useEffect(() => {
    if (!isConsole || !backendConnected) return;
    const activeTiers = pricing.filter(
      (entry) => entry.category === pricingCategory && entry.is_active && entry.duration_minutes > 0,
    );
    if (activeTiers.some((entry) => entry.id === form.pricingId)) return;
    if (activeTiers.length === 0) {
      if (form.pricingId) setForm((prev) => ({ ...prev, pricingId: "" }));
      return;
    }

    const previousTier = pricing.find((entry) => entry.id === form.pricingId);
    const preferredDuration = previousTier?.duration_minutes ?? service.durationMins;
    const nextTier = activeTiers.find((entry) => entry.duration_minutes === preferredDuration) ?? activeTiers[0];
    update({ service: serviceForDuration(nextTier.duration_minutes), pricingId: nextTier.id });
  }, [backendConnected, form.pricingId, form.service, isConsole, pricing, pricingCategory]);

  useEffect(() => {
    if (!isConsole) {
      setAvailability(null);
      setAvailabilityLoading(false);
      setAvailabilityError(null);
      return;
    }

    if (!backendConnected) {
      setAvailability(null);
      setAvailabilityLoading(false);
      setAvailabilityError("Availability service is unavailable. Please try again shortly.");
      return;
    }

    let active = true;
    setAvailability(null);
    setAvailabilityLoading(true);
    setAvailabilityError(null);

    api.public
      .getAvailability(form.date, durationMinutes, 30)
      .then((result) => {
        if (!active) return;
        if (!getAvailabilityConsoleSlug(result.consoles, form.consolePref)) {
          setAvailability(null);
          setAvailabilityError("Could not determine availability for this console.");
          return;
        }
        setAvailability(result);
      })
      .catch(() => {
        if (active) {
          setAvailability(null);
          setAvailabilityError("Could not load time-slot availability.");
        }
      })
      .finally(() => {
        if (active) setAvailabilityLoading(false);
      });

    return () => {
      active = false;
    };
  }, [backendConnected, durationMinutes, form.consolePref, form.date, isConsole, availabilityRetry]);

  useEffect(() => {
    if (
      !isConsole ||
      !form.time ||
      availabilityLoading ||
      availabilityError ||
      !availabilityReady ||
      isTimeAvailable(form.time)
    ) {
      return;
    }

    setForm((prev) => (prev.time === form.time ? { ...prev, time: "" } : prev));
    setErrors((prev) => ({ ...prev, time: "That slot is no longer available. Please choose another time." }));
  }, [availabilityError, availabilityLoading, availabilityReady, form.time, isConsole]);

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const next: FieldErrors = {};
    const phone = normalizeIndianMobile(form.phone);
    if (needsSchedule) {
      if (!form.date) next.date = "Please pick a date.";
      else if (form.date < today) next.date = "That date has already passed.";
      if (isConsole && availabilityLoading) {
        next.time = "Please wait while time-slot availability is checked.";
      } else if (isConsole && (!availabilityReady || availabilityError)) {
        next.time = availabilityError || "Time-slot availability is unavailable. Please retry.";
      } else if (isConsole && availableSlotsCount === 0) {
        next.time = "No available slots for this date.";
      } else if (!form.time) {
        next.time = "Please choose an available time slot.";
      } else if (isConsole && !isTimeAvailable(form.time)) {
        next.time = "That slot is no longer available. Please choose another time.";
      }
    }
    if (form.name.trim().length < 2) next.name = "Please enter your name.";
    if (!phone) next.phone = "Enter a valid 10-digit Indian mobile number.";
    if (backendConnected && isConsole && !selectedPricing) {
      next.server = "This package is no longer available. Please choose another package or try again shortly.";
    }
    setErrors(next);

    const firstInvalid = (["date", "time", "name", "phone"] as const).find((key) => next[key]);
    if (firstInvalid || next.server || !phone) {
      if (firstInvalid) document.getElementById(`bk-${firstInvalid}`)?.focus();
      return;
    }

    if (!backendConnected) {
      setErrors({ server: "The booking service is unavailable. Nothing has been saved or confirmed; please try again shortly." });
      return;
    }

    setSubmitting(true);
    setPayNotice(null);

    try {
      let bookingCode: string | undefined;
      let recordId: string | undefined;
      let bookingType: "console" | "group" | "tournament" = "console";
      let totalAmount = estimate;
      let confirmationRows = rows;

      if (service.kind === "console") {
        bookingType = "console";
        const targetConsole = form.consolePref;
        const res = await api.public.createBooking({
          customer_name: form.name.trim(),
          customer_phone: phone,
          console_type: targetConsole,
          booking_date: form.date,
          start_time: form.time,
          duration: durationMinutes,
          pricing_id: selectedPricing?.id ?? "",
          game_title: form.game || null,
          players: form.players,
          notes: form.notes.trim() || null,
        });
        bookingCode = res.booking_code;
        recordId = res.id;
        totalAmount = Number(res.total_amount);
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
        totalAmount = Number(res.total_amount);
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
        totalAmount = Number(res.tournaments?.entry_fee ?? 0);
        confirmationRows = [
          ...rows.filter(([label]) => label !== "Tournament"),
          ["Tournament", res.tournaments?.title || "Tournament"] as [string, string],
        ];
      }

      const url = whatsappHref(buildMessage(form, phone, totalAmount, tournaments, selectedPricing, bookingCode));
      if (!bookingCode || !recordId) {
        throw new ApiClientError(500, "BOOKING_NOT_SAVED", "The server did not return a saved booking reference.");
      }
      const savedConfirmation: SavedBookingConfirmation = {
        whatsappUrl: url,
        bookingCode,
        recordId,
        bookingType,
        totalAmount: Number(totalAmount || 0),
        paymentStatus: "pending",
        customerPhone: phone,
        summary: confirmationRows,
      };
      saveBookingConfirmation(savedConfirmation);
      setConfirmed(savedConfirmation);
    } catch (err) {
      if (err instanceof ApiClientError && err.code === "BOOKING_CONFLICT" && service.kind === "console") {
        setForm((prev) => ({ ...prev, time: "" }));
        setErrors({ time: "This slot was just booked. Please choose another time." });
        setAvailabilityRetry((retry) => retry + 1);
      } else if (err instanceof ApiClientError) {
        setErrors({ server: err.message });
      } else {
        setErrors({ server: "Unable to complete booking right now. Please try another slot or contact us." });
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handlePayOnline = async () => {
    if (!confirmed?.recordId || payProcessing || confirmed.paymentStatus === "paid") return;
    setPayProcessing(true);
    setPayNotice(null);
    try {
      const order = await api.public.createCashfreeOrder({
        booking_type: confirmed.bookingType,
        record_id: confirmed.recordId,
        reference: confirmed.bookingCode,
        customer_phone: confirmed.customerPhone,
      });
      setConfirmed((current) => {
        if (!current) return current;
        const updated = { ...current, orderId: order.order_id, totalAmount: Number(order.amount) };
        saveBookingConfirmation(updated);
        return updated;
      });

      type CashfreeResult = {
        error?: { message?: string };
        redirect?: boolean;
        paymentDetails?: unknown;
      };
      type CashfreeFactory = (opts: { mode: "sandbox" }) => {
        checkout: (opts: { paymentSessionId: string; redirectTarget?: string }) => Promise<{
          error?: CashfreeResult["error"];
          redirect?: CashfreeResult["redirect"];
          paymentDetails?: CashfreeResult["paymentDetails"];
        }>;
      };
      const getCashfreeSdk = async (): Promise<CashfreeFactory | null> => {
        const win = window as Window & { Cashfree?: CashfreeFactory };
        if (typeof win.Cashfree === "function") return win.Cashfree;
        return new Promise((resolve) => {
          const script = document.createElement("script");
          script.src = "https://sdk.cashfree.com/js/v3/cashfree.js";
          script.async = true;
          script.onload = () => resolve((window as Window & { Cashfree?: CashfreeFactory }).Cashfree || null);
          script.onerror = () => resolve(null);
          document.head.appendChild(script);
        });
      };

      const CashfreeCtor = await getCashfreeSdk();
      if (!CashfreeCtor) {
        setPayNotice("Cashfree checkout could not be loaded. Your booking is saved with payment pending; please retry.");
        return;
      }

      const cashfree = CashfreeCtor({
        mode: "sandbox",
      });

      const result = await cashfree.checkout({
        paymentSessionId: order.payment_session_id,
        redirectTarget: "_modal",
      });

      try {
        const payment = await api.public.verifyCashfreeOrder({
          order_id: order.order_id,
          reference: confirmed.bookingCode,
          customer_phone: confirmed.customerPhone,
        });
        setConfirmed((current) => {
          if (!current) return current;
          const updated = { ...current, paymentStatus: payment.payment_status };
          saveBookingConfirmation(updated);
          return updated;
        });
        setPayNotice(
          payment.payment_status === "paid"
            ? "Payment successfully verified by the server."
            : payment.payment_status === "failed"
              ? "Payment failed. You can retry using the button below."
              : result?.error
                ? "Checkout was closed or interrupted. Payment is still pending; you can retry."
                : "Payment is pending confirmation. You can retry if needed.",
        );
      } catch (e) {
        setPayNotice(
          e instanceof ApiClientError
            ? `${e.message} Your booking remains saved; retry payment to check again.`
            : "Payment status could not be verified. Your booking remains saved and payment is pending.",
        );
      }
    } catch (err) {
      setPayNotice(err instanceof ApiClientError ? err.message : "Online payment could not be started. Please retry.");
    } finally {
      setPayProcessing(false);
    }
  };

  const callbackOrderId = new URLSearchParams(window.location.search).get("cf_order_id");
  const orderIdToVerify = callbackOrderId || restoredOrderId;
  useEffect(() => {
    if (!orderIdToVerify || !confirmed || confirmed.orderId !== orderIdToVerify || payProcessing) return;
    let active = true;
    setPayProcessing(true);
    api.public
      .verifyCashfreeOrder({
        order_id: orderIdToVerify,
        reference: confirmed.bookingCode,
        customer_phone: confirmed.customerPhone,
      })
      .then((payment) => {
        if (!active) return;
        const updated = {
          ...confirmed,
          paymentStatus: payment.payment_status,
        };
        saveBookingConfirmation(updated);
        setConfirmed(updated);
        setPayNotice(
          payment.payment_status === "paid"
            ? "Payment successfully verified by the server."
            : payment.payment_status === "failed"
              ? "Payment failed. You can retry using the button below."
              : "Payment is pending confirmation. You can retry if needed.",
        );
      })
      .catch(() => {
        if (active) setPayNotice("Payment status could not be verified. Your booking remains saved and payment is pending.");
      })
      .finally(() => {
        if (active) setPayProcessing(false);
        const url = new URL(window.location.href);
        url.searchParams.delete("cf_order_id");
        window.history.replaceState({}, "", `${url.pathname}${url.search}${url.hash}`);
      });
    return () => {
      active = false;
    };
  }, [callbackOrderId, orderIdToVerify, confirmed?.orderId]);

  if (confirmed) {
    const typeLabel = confirmed.bookingType === "console" ? "Console booking" : confirmed.bookingType === "group" ? "Whole-lounge booking" : "Tournament registration";
    return (
      <div className="p-6 text-center sm:p-10">
        <div className={`mx-auto grid h-20 w-20 place-items-center rounded-full ring-1 ${confirmed.paymentStatus === "paid" ? "bg-emerald-500/15 ring-emerald-400/50" : "bg-blood/15 ring-blood/50"}`}>
          {confirmed.paymentStatus === "paid" ? <CircleCheckBig className="h-10 w-10 text-emerald-300" /> : <Clock className="h-10 w-10 text-blood-400" />}
        </div>
        <h3 className="mt-6 font-display text-2xl font-black uppercase sm:text-3xl">
          {confirmed.paymentStatus === "paid" ? "Payment successful" : "Request saved"}
        </h3>
        <p className="mx-auto mt-3 max-w-md text-white/65">
          {confirmed.paymentStatus === "paid"
            ? "Your payment was verified by our server. Your saved reference and booking details are below."
            : "Your request is saved, but payment is not confirmed. Pay securely online or send the saved summary on WhatsApp."}
        </p>

        <p className="mx-auto mt-3 w-fit rounded-full border border-white/15 bg-white/[0.04] px-4 py-1 font-tech text-xs font-bold uppercase text-white/80">
          Payment status: {confirmed.paymentStatus}
        </p>
        {payNotice && <p role="status" aria-live="polite" className="mt-3 text-xs text-amber-200">{payNotice}</p>}

        <dl className="mx-auto mt-6 max-w-sm space-y-2 rounded-2xl border border-white/10 bg-black/40 p-4 text-left text-sm">
          {[
            ["Reference", confirmed.bookingCode],
            ["Booking type", typeLabel],
            ...confirmed.summary,
            ["Payable amount", `₹${confirmed.totalAmount}`],
            ["Payment status", confirmed.paymentStatus],
          ].map(([label, value]) => (
            <div key={label} className="flex items-start justify-between gap-4">
              <dt className="text-white/50">{label}</dt>
              <dd className="text-right font-medium">{value}</dd>
            </div>
          ))}
        </dl>

        {confirmed.paymentStatus !== "paid" && (
          <div className="mt-7 flex flex-col justify-center gap-3 sm:flex-row">
            {!["paid", "refunded"].includes(confirmed.paymentStatus) && confirmed.totalAmount > 0 && (
              <Button onClick={handlePayOnline} disabled={payProcessing}>
                {payProcessing ? <LoaderCircle className="animate-spin" /> : <CreditCard />}
                {payProcessing ? "Processing payment..." : confirmed.paymentStatus === "failed" ? `Retry Payment (₹${confirmed.totalAmount})` : `Pay Now (₹${confirmed.totalAmount})`}
              </Button>
            )}
            <Button variant="outline" href={confirmed.whatsappUrl} target="_blank" rel="noopener noreferrer">
              <WhatsAppIcon /> Send on WhatsApp
            </Button>
            <Button variant="outline" href={telHref}>
              <Phone /> Call {BUSINESS.phoneDisplay}
            </Button>
          </div>
        )}
        <button
          type="button"
          onClick={() => {
            clearBookingConfirmation();
            onClose();
          }}
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
            {experienceOptions.map((option) => {
              const Icon = option.Icon;
              return (
                <label
                  key={option.key}
                  className={cn(
                    "relative flex cursor-pointer flex-col rounded-xl border p-3 transition-all duration-200 has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-blood-400",
                    option.disabled
                      ? "cursor-not-allowed border-white/5 bg-white/[0.02] opacity-40"
                      : option.checked
                      ? "border-blood bg-blood/10 shadow-[0_0_24px_-8px_rgba(229,9,20,0.9)]"
                      : "border-white/10 bg-white/[0.02] hover:border-white/25",
                  )}
                >
                  <input
                    type="radio"
                    name="bk-service"
                    value={option.key}
                    checked={option.checked}
                    disabled={option.disabled}
                    onChange={() => update({ service: option.service, pricingId: option.pricingId })}
                    className="sr-only"
                  />
                  <span className="flex items-center justify-between">
                    <Icon className={cn("h-5 w-5", option.checked ? "text-blood-400" : "text-white/60")} />
                    <span
                      className={cn(
                        "grid h-4 w-4 place-items-center rounded-full border",
                        option.checked ? "border-blood bg-blood" : "border-white/25",
                      )}
                    >
                      {option.checked && <Check className="h-2.5 w-2.5" strokeWidth={4} />}
                    </span>
                  </span>
                  <span className="mt-2.5 font-tech text-sm font-bold uppercase tracking-wider">{option.label}</span>
                  <span className="text-xs text-white/55">{option.priceLabel}</span>
                </label>
              );
            })}
          </div>
          {isConsole && consolePackages.length === 0 && (
            <p className="mt-3 text-sm text-white/50" role="status">
              {backendConnected
                ? `No active packages are configured for ${form.consolePref}.`
                : "Pricing is unavailable while the booking service is offline."}
            </p>
          )}
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
                    disabled={isConsole && (availabilityLoading || !availabilityReady || availableSlotsCount === 0)}
                    aria-invalid={Boolean(errors.time)}
                    aria-describedby={errors.time ? "bk-time-err" : undefined}
                  >
                    <option value="">
                      {isConsole && availabilityLoading
                        ? "Loading available times..."
                        : isConsole && (!availabilityReady || availabilityError)
                          ? "Availability unavailable"
                          : isConsole && availableSlotsCount === 0
                            ? "No available slots for this date"
                            : slots.length === 0
                              ? "No slots left — pick another date"
                              : "Choose a time"}
                    </option>
                    {slots.map((slot) => {
                      const available = isTimeAvailable(slot.value);
                      return (
                        <option key={slot.value} value={slot.value} disabled={isConsole && !available}>
                          {slot.label}
                          {slot.peak ? " · Peak" : ""}
                          {isConsole && !available ? " · Unavailable" : ""}
                        </option>
                      );
                    })}
                  </select>
                  <FieldError id="bk-time-err" message={errors.time} />
                  {isConsole && availabilityLoading && (
                    <p className="mt-2 font-tech text-xs text-white/55" role="status">
                      Checking availability for {form.consolePref}...
                    </p>
                  )}
                  {isConsole && availabilityError && (
                    <div className="mt-2 flex items-center justify-between gap-3" role="alert">
                      <p className="font-tech text-xs text-blood-300">{availabilityError}</p>
                      <button
                        type="button"
                        onClick={() => setAvailabilityRetry((retry) => retry + 1)}
                        className="font-tech text-xs font-bold uppercase tracking-wider text-white underline underline-offset-2"
                      >
                        Retry
                      </button>
                    </div>
                  )}
                  {availabilityUnavailable && (
                    <div className="mt-2 flex items-center justify-between gap-3" role="alert">
                      <p className="font-tech text-xs text-blood-300">
                        Could not determine availability for this console.
                      </p>
                      <button
                        type="button"
                        onClick={() => setAvailabilityRetry((retry) => retry + 1)}
                        className="font-tech text-xs font-bold uppercase tracking-wider text-white underline underline-offset-2"
                      >
                        Retry
                      </button>
                    </div>
                  )}
                  {isConsole &&
                    !availabilityLoading &&
                    !availabilityError &&
                    availabilityReady &&
                    availableSlotsCount === 0 && (
                      <p className="mt-2 font-tech text-xs text-white/55" role="status">
                        No available slots for this date.
                      </p>
                    )}
                </div>
              </>
            )}

            {isConsole && (
              <div>
                <span className={LABEL}>Package duration</span>
                <output className="mt-2 flex h-12 items-center rounded-xl border border-white/10 bg-black/45 px-4 font-display text-base font-bold">
                  {selectedPricing ? formatDuration(selectedPricing.duration_minutes) : "Unavailable"}
                </output>
              </div>
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
              {estimate !== null ? "Estimated total" : service.kind === "tournament" ? "Entry details" : "Pricing unavailable"}
            </span>
            {estimate !== null ? (
              <span className="font-display text-2xl font-black">
                <Rupee className="text-[0.85em]" />
                {estimate}
              </span>
            ) : (
              <span className="font-tech text-sm font-bold uppercase tracking-wider text-white/70">
                {service.kind === "tournament" ? "On WhatsApp" : "Unavailable"}
              </span>
            )}
          </div>
          <p className="mt-2 text-xs text-white/45">{bookingServiceNote}</p>
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

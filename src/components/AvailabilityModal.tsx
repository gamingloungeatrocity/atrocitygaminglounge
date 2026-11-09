import { useEffect, useMemo, useState } from "react";
import { CalendarCheck, Clock, Flame, Info } from "lucide-react";
import { useBooking } from "@/context/booking";
import { usePublicData } from "@/context/publicData";
import { useIstNow } from "@/hooks/useIstNow";
import { api, type AvailabilityResponse } from "@/lib/api";
import { addDaysYmd, buildSlots, formatYmd, upcomingDays, valueToLabel } from "@/lib/time";
import { cn } from "@/utils/cn";
import { Modal } from "./Modal";
import { Button } from "./ui/Button";
import { OpenStatus } from "./ui/OpenStatus";
import { Tabs, type TabItem } from "./ui/Tabs";

type Station = "ps4" | "ps4pro";

const STEP_TITLE = "flex items-center gap-2.5 font-tech text-sm font-bold uppercase tracking-[0.2em] text-white/80";

function StepBadge({ n }: { n: number }) {
  return (
    <span className="grid h-6 w-6 place-items-center rounded-md bg-blood/15 font-display text-[11px] font-black text-blood-400">
      {n}
    </span>
  );
}

function AvailabilityBody() {
  const { openBooking } = useBooking();
  const { pricing } = usePublicData();
  const now = useIstNow();
  const days = useMemo(() => upcomingDays(7, now), [now.ymd]); // eslint-disable-line react-hooks/exhaustive-deps
  const [station, setStation] = useState<Station>("ps4pro");
  const [day, setDay] = useState<string>(() =>
    buildSlots(now.ymd, 60, 60, now).some((s) => !s.past) ? now.ymd : addDaysYmd(now.ymd, 1),
  );
  const [time, setTime] = useState<string | null>(null);
  const [liveAvailability, setLiveAvailability] = useState<AvailabilityResponse | null>(null);

  useEffect(() => {
    let cancelled = false;
    api.public
      .getAvailability(day, 60, 60)
      .then((res) => {
        if (!cancelled) setLiveAvailability(res);
      })
      .catch(() => {
        if (!cancelled) setLiveAvailability(null);
      });
    return () => {
      cancelled = true;
    };
  }, [day]);

  const ps4Rate = pricing.find((p) => p.category === "ps4" && p.duration_minutes === 60 && p.is_active)?.price ?? 70;
  const ps4ProRate = pricing.find((p) => p.category === "ps4pro" && p.duration_minutes === 60 && p.is_active)?.price ?? 90;

  const STATIONS: TabItem<Station>[] = [
    { id: "ps4", label: "Station 1: PS4", icon: <span className="rounded bg-black/30 px-1.5 py-0.5 text-[10px]">₹{Number(ps4Rate)}/hr</span> },
    { id: "ps4pro", label: "Station 2: PS4 Pro", icon: <span className="rounded bg-black/30 px-1.5 py-0.5 text-[10px]">₹{Number(ps4ProRate)}/hr</span> },
  ];

  const baseSlots = buildSlots(day, 60, 60, now);
  const slots = baseSlots.map((slot) => {
    const liveMatch = liveAvailability?.slots.find((s) => s.time === slot.value);
    const consoleState = liveMatch?.consoles?.[station];
    const unavailableReason = consoleState && !consoleState.available ? consoleState.reason : null;
    const isBookedOrBlocked = Boolean(unavailableReason && unavailableReason !== "past");
    return {
      ...slot,
      disabled: slot.past || isBookedOrBlocked,
      unavailableReason: slot.past ? "Passed" : unavailableReason === "maintenance" ? "Maint." : unavailableReason === "disabled" ? "Off" : isBookedOrBlocked ? "Booked" : null,
    };
  });

  const openCount = slots.filter((s) => !s.disabled).length;
  const selected = time ? slots.find((s) => s.value === time) : undefined;
  const canRequest = Boolean(selected && !selected.disabled);
  const stationLabel = station === "ps4pro" ? `PS4 Pro (₹${Number(ps4ProRate)}/hr)` : `PS4 (₹${Number(ps4Rate)}/hr)`;

  const request = () => {
    if (!canRequest || !time) return;
    openBooking({
      service: "hourly",
      consolePref: station === "ps4pro" ? "PS4 Pro" : "PS4",
      date: day,
      time,
    });
  };

  return (
    <>
      <div className="space-y-7 p-5 sm:p-7">
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-white/10 bg-black/40 p-3.5">
          <OpenStatus />
          <span className="flex items-center gap-2 font-tech text-sm font-semibold text-white/60">
            <Clock className="h-4 w-4 text-blood-400" />
            {liveAvailability ? "Live schedule synced" : "Open daily · 10:00 AM – 10:00 PM"}
          </span>
        </div>

        <section aria-labelledby="av-day">
          <h3 id="av-day" className={STEP_TITLE}>
            <StepBadge n={1} /> Choose a day
          </h3>
          <div className="no-scrollbar -mx-5 mt-3 flex gap-2 overflow-x-auto px-5 pb-1 sm:mx-0 sm:grid sm:grid-cols-7 sm:px-0">
            {days.map((d) => {
              const isSelected = d.ymd === day;
              return (
                <button
                  key={d.ymd}
                  type="button"
                  onClick={() => {
                    setDay(d.ymd);
                    setTime(null);
                  }}
                  aria-pressed={isSelected}
                  aria-label={formatYmd(d.ymd)}
                  className={cn(
                    "flex min-w-[4.6rem] shrink-0 flex-col items-center rounded-xl border px-2 py-2.5 transition-all duration-200",
                    isSelected
                      ? "border-blood bg-blood text-white shadow-[0_0_24px_-6px_rgba(229,9,20,0.9)]"
                      : "border-white/10 bg-white/[0.03] text-white/70 hover:border-white/25 hover:text-white",
                  )}
                >
                  <span className="font-tech text-[11px] font-bold uppercase tracking-[0.14em]">{d.label}</span>
                  <span className="mt-0.5 font-display text-xl font-black leading-none">{d.dayNum}</span>
                  <span className={cn("mt-1 font-tech text-[11px] uppercase tracking-wider", isSelected ? "text-white/80" : "text-white/40")}>
                    {d.monthShort}
                  </span>
                </button>
              );
            })}
          </div>
        </section>

        <section aria-labelledby="av-station">
          <h3 id="av-station" className={STEP_TITLE}>
            <StepBadge n={2} /> Select station (2 consoles available)
          </h3>
          <Tabs
            items={STATIONS}
            value={station}
            onChange={(val) => {
              setStation(val);
              setTime(null);
            }}
            label="Station"
            idPrefix="avail"
            stretch
            className="mt-3"
          />
        </section>

        <section aria-labelledby="av-time">
          <div className="flex items-center justify-between gap-3">
            <h3 id="av-time" className={STEP_TITLE}>
              <StepBadge n={3} /> Pick a start time
            </h3>
            <span className="font-tech text-xs font-semibold uppercase tracking-[0.16em] text-white/45">{openCount} open</span>
          </div>
          <div className="mt-3">
            {openCount === 0 ? (
              <p className="rounded-xl border border-dashed border-white/15 p-6 text-center text-sm text-white/60">
                No open slots available on this console for the selected date. Try switching stations or picking another day.
              </p>
            ) : (
              <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                {slots.map((slot) => {
                  const isSelected = time === slot.value;
                  return (
                    <button
                      key={slot.value}
                      type="button"
                      disabled={slot.disabled}
                      onClick={() => setTime(slot.value)}
                      aria-pressed={isSelected}
                      aria-label={`${slot.label}${slot.unavailableReason ? ` — ${slot.unavailableReason}` : " — open"}`}
                      className={cn(
                        "relative rounded-xl border px-2 py-3 text-center transition-all duration-200",
                        slot.disabled
                          ? "cursor-not-allowed border-white/5 bg-white/[0.015] text-white/25"
                          : isSelected
                            ? "border-blood bg-blood text-white shadow-[0_0_24px_-6px_rgba(229,9,20,0.9)]"
                            : "border-white/10 bg-white/[0.03] text-white hover:-translate-y-0.5 hover:border-blood/60 hover:bg-blood/10",
                      )}
                    >
                      {slot.peak && !slot.disabled && (
                        <Flame className={cn("absolute right-1.5 top-1.5 h-3.5 w-3.5", isSelected ? "text-white" : "text-blood-400")} />
                      )}
                      <span className={cn("block font-display text-[13px] font-bold sm:text-sm", slot.disabled && "line-through")}>
                        {slot.label.replace(":00", "")}
                      </span>
                      <span
                        className={cn(
                          "mt-1 block font-tech text-[10px] font-bold uppercase tracking-[0.2em]",
                          isSelected
                            ? "text-white/85"
                            : slot.disabled
                              ? "text-white/30"
                              : slot.peak
                                ? "text-blood-300"
                                : "text-emerald-400/80",
                        )}
                      >
                        {slot.unavailableReason || (slot.peak ? "Peak" : "Open")}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
          <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 font-tech text-xs font-semibold uppercase tracking-[0.14em] text-white/50">
            <span className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-sm bg-emerald-400/80" /> Open
            </span>
            <span className="flex items-center gap-2">
              <Flame className="h-3.5 w-3.5 text-blood-400" /> Peak hours
            </span>
            <span className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-sm bg-white/15" /> Booked / Passed
            </span>
          </div>
        </section>

        <p className="flex items-start gap-2.5 rounded-xl border border-white/10 bg-white/[0.02] p-4 text-sm text-white/55">
          <Info className="mt-0.5 h-4 w-4 shrink-0 text-blood-400" />
          Overlapping individual bookings, active walk-in sessions, and approved whole-lounge reservations are automatically blocked.
        </p>
      </div>

      <div className="sticky bottom-0 z-10 flex flex-col items-stretch gap-3 border-t border-white/10 bg-coal/95 px-5 py-4 backdrop-blur-md sm:flex-row sm:items-center sm:justify-between sm:px-7">
        <p className="text-sm text-white/60" aria-live="polite">
          {canRequest && time ? (
            <>
              Selected:{" "}
              <strong className="text-white">
                {stationLabel} · {formatYmd(day, "short")} · {valueToLabel(time)}
              </strong>
            </>
          ) : (
            "Select a time slot to continue."
          )}
        </p>
        <Button onClick={request} disabled={!canRequest}>
          <CalendarCheck /> Request this slot
        </Button>
      </div>
    </>
  );
}

export function AvailabilityModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      size="lg"
      title="Check Availability"
      subtitle="Pick a day, console and start time — checked against live lounge reservations."
    >
      <AvailabilityBody />
    </Modal>
  );
}

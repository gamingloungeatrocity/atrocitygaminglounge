/**
 * Time helpers — all business logic runs on India Standard Time (Asia/Kolkata),
 * regardless of the visitor's device timezone.
 */
export const OPEN_HOUR = 10; // 10:00 AM
export const CLOSE_HOUR = 22; // 10:00 PM
const TIME_ZONE = "Asia/Kolkata";

export interface IstNow {
  ymd: string;
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  /** Minutes since midnight (IST). */
  minutes: number;
  /** 0 = Sunday … 6 = Saturday. */
  weekday: number;
}

let formatter: Intl.DateTimeFormat | null = null;

function getParts(date: Date): Record<string, string> {
  const parts: Record<string, string> = {};
  try {
    formatter ??= new Intl.DateTimeFormat("en-US", {
      timeZone: TIME_ZONE,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
    });
    for (const part of formatter.formatToParts(date)) parts[part.type] = part.value;
  } catch {
    // Fallback: shift manually to UTC+5:30
    const ist = new Date(date.getTime() + (330 + date.getTimezoneOffset()) * 60_000);
    parts.year = String(ist.getFullYear());
    parts.month = String(ist.getMonth() + 1).padStart(2, "0");
    parts.day = String(ist.getDate()).padStart(2, "0");
    parts.hour = String(ist.getHours()).padStart(2, "0");
    parts.minute = String(ist.getMinutes()).padStart(2, "0");
  }
  return parts;
}

export function getIstNow(date: Date = new Date()): IstNow {
  const p = getParts(date);
  const year = Number(p.year);
  const month = Number(p.month);
  const day = Number(p.day);
  const hour = Number(p.hour) % 24;
  const minute = Number(p.minute);
  return {
    ymd: `${p.year}-${p.month}-${p.day}`,
    year,
    month,
    day,
    hour,
    minute,
    minutes: hour * 60 + minute,
    weekday: new Date(Date.UTC(year, month - 1, day)).getUTCDay(),
  };
}

function ymdToDate(ymd: string): Date {
  const [y, m, d] = ymd.split("-").map(Number);
  return new Date(Date.UTC(y || 1970, (m || 1) - 1, d || 1, 12));
}

export function addDaysYmd(ymd: string, days: number): string {
  const date = ymdToDate(ymd);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

export function weekdayOfYmd(ymd: string): number {
  return ymdToDate(ymd).getUTCDay();
}

export function formatYmd(ymd: string, style: "long" | "short" = "long"): string {
  if (!ymd) return "";
  return ymdToDate(ymd).toLocaleDateString(
    "en-IN",
    style === "long"
      ? { weekday: "short", day: "numeric", month: "short", year: "numeric", timeZone: "UTC" }
      : { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" },
  );
}

export function minutesToValue(mins: number): string {
  return `${String(Math.floor(mins / 60)).padStart(2, "0")}:${String(mins % 60).padStart(2, "0")}`;
}

export function minutesToLabel(mins: number): string {
  const h = Math.floor(mins / 60) % 24;
  const m = mins % 60;
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${String(m).padStart(2, "0")} ${h >= 12 ? "PM" : "AM"}`;
}

export function valueToLabel(value: string): string {
  if (!value) return "";
  const [h, m] = value.split(":").map(Number);
  return minutesToLabel((h || 0) * 60 + (m || 0));
}

export interface OpenStatus {
  open: boolean;
  label: string;
  detail: string;
}

export function getOpenStatus(now: IstNow): OpenStatus {
  const openAt = OPEN_HOUR * 60;
  const closeAt = CLOSE_HOUR * 60;
  if (now.minutes >= openAt && now.minutes < closeAt) {
    const left = closeAt - now.minutes;
    return { open: true, label: "Open now", detail: left <= 60 ? `Closes in ${left} min` : "Closes 10:00 PM" };
  }
  return {
    open: false,
    label: "Closed now",
    detail: now.minutes < openAt ? "Opens today 10:00 AM" : "Opens tomorrow 10:00 AM",
  };
}

export interface DayOption {
  ymd: string;
  label: string;
  dayNum: number;
  monthShort: string;
  isWeekend: boolean;
}

export function upcomingDays(count: number, now: IstNow): DayOption[] {
  return Array.from({ length: count }, (_, i) => {
    const ymd = addDaysYmd(now.ymd, i);
    const date = ymdToDate(ymd);
    const weekday = date.getUTCDay();
    const short = date.toLocaleDateString("en-IN", { weekday: "short", timeZone: "UTC" });
    return {
      ymd,
      label: i === 0 ? "Today" : i === 1 ? "Tomorrow" : short,
      dayNum: date.getUTCDate(),
      monthShort: date.toLocaleDateString("en-IN", { month: "short", timeZone: "UTC" }),
      isWeekend: weekday === 0 || weekday === 6,
    };
  });
}

export interface Slot {
  value: string;
  minutes: number;
  label: string;
  past: boolean;
  peak: boolean;
}

/**
 * Builds start-time slots for a date so that a session of `durationMins`
 * finishes by closing time. Slots that have already passed (IST) are flagged.
 */
export function buildSlots(ymd: string, durationMins: number, stepMins: number, now: IstNow = getIstNow()): Slot[] {
  if (!ymd) return [];
  const openAt = OPEN_HOUR * 60;
  const closeAt = CLOSE_HOUR * 60;
  const duration = Math.max(30, Math.min(durationMins || 60, closeAt - openAt));
  const isPastDay = ymd < now.ymd;
  const isToday = ymd === now.ymd;
  const weekday = weekdayOfYmd(ymd);
  const weekend = weekday === 0 || weekday === 6;
  const slots: Slot[] = [];
  for (let m = openAt; m + duration <= closeAt; m += stepMins) {
    slots.push({
      value: minutesToValue(m),
      minutes: m,
      label: minutesToLabel(m),
      past: isPastDay || (isToday && m < now.minutes + 10),
      peak: m >= 17 * 60 || (weekend && m >= 13 * 60),
    });
  }
  return slots;
}

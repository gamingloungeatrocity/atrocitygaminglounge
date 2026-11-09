import crypto from "node:crypto";

export const LOUNGE_TIMEZONE = "Asia/Kolkata";

export function getIstTodayYmd(now = new Date()) {
  const parts = {};
  const fmt = new Intl.DateTimeFormat("en-US", {
    timeZone: LOUNGE_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  });
  for (const p of fmt.formatToParts(now)) parts[p.type] = p.value;
  return {
    ymd: `${parts.year}-${parts.month}-${parts.day}`,
    hour: Number(parts.hour) % 24,
    minute: Number(parts.minute),
    minutes: (Number(parts.hour) % 24) * 60 + Number(parts.minute),
  };
}

export function parseTimeToMinutes(timeStr) {
  const [h, m] = String(timeStr || "00:00").split(":").map(Number);
  return (h || 0) * 60 + (m || 0);
}

export function minutesToTimeString(totalMinutes) {
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:00`;
}

export function istDateTimeToUtcIso(dateYmd, timeStr) {
  const hhmm = String(timeStr).slice(0, 5);
  return new Date(`${dateYmd}T${hhmm}:00+05:30`).toISOString();
}

export function addMinutesToIso(isoStr, minutes) {
  return new Date(new Date(isoStr).getTime() + minutes * 60_000).toISOString();
}

export function normalizeIndianPhone(input) {
  let digits = String(input || "").replace(/\D/g, "");
  if (digits.length === 12 && digits.startsWith("91")) digits = digits.slice(2);
  else if (digits.length === 11 && digits.startsWith("0")) digits = digits.slice(1);
  if (!/^[6-9]\d{9}$/.test(digits)) return null;
  return digits;
}

export function slugify(text) {
  const base = String(text || "tournament")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 50);
  const suffix = crypto.randomBytes(2).toString("hex");
  return `${base || "tournament"}-${suffix}`;
}

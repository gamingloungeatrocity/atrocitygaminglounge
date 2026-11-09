import { consoleRepository } from "../repositories/console.repository.js";
import { settingsRepository } from "../repositories/settings.repository.js";
import {
  getIstTodayYmd,
  istDateTimeToUtcIso,
  minutesToTimeString,
  parseTimeToMinutes,
} from "../utils/time.js";

/**
 * Pure helper to determine if [slotStartMs, slotEndMs) overlaps any reservation range string.
 */
export function parsePgRangeMs(rangeStr) {
  if (!rangeStr || typeof rangeStr !== "string") return null;
  const cleaned = rangeStr.trim();
  const match = cleaned.match(/^[\[|\(]"?([^",]+)"?,\s*"?([^"\)\]]+)"?[\)\]]$/);
  if (!match) return null;
  const start = Date.parse(match[1]);
  const end = Date.parse(match[2]);
  if (Number.isNaN(start) || Number.isNaN(end)) return null;
  return { start, end };
}

export function intervalsOverlap(aStart, aEnd, bStart, bEnd) {
  return aStart < bEnd && bStart < aEnd;
}

export const availabilityService = {
  async getAvailability({ date, durationMinutes = 60, stepMinutes = 30 }) {
    const todayIst = getIstTodayYmd();
    const targetDate = date || todayIst.ymd;
    const duration = Math.max(30, Math.min(Number(durationMinutes) || 60, 720));
    const step = stepMinutes === 60 ? 60 : 30;

    const [consoles, settings] = await Promise.all([
      consoleRepository.findAll(),
      settingsRepository.get(),
    ]);

    const openMins = parseTimeToMinutes(settings.opening_time || "10:00");
    const closeMins = parseTimeToMinutes(settings.closing_time || "22:00");

    const dayStartIso = istDateTimeToUtcIso(targetDate, minutesToTimeString(openMins));
    const dayEndIso = istDateTimeToUtcIso(targetDate, minutesToTimeString(closeMins));
    const reservations = await consoleRepository.findActiveReservationsInRange(dayStartIso, dayEndIso);

    const parsedByConsole = new Map();
    for (const c of consoles) parsedByConsole.set(c.id, []);
    for (const r of reservations) {
      const parsed = parsePgRangeMs(r.slot_range);
      if (parsed && parsedByConsole.has(r.console_id)) {
        parsedByConsole.get(r.console_id).push({ ...parsed, sourceType: r.source_type });
      }
    }

    const nowMs = Date.now();
    const slots = [];

    for (let m = openMins; m + duration <= closeMins; m += step) {
      const startTimeStr = minutesToTimeString(m).slice(0, 5);
      const endTimeStr = minutesToTimeString(m + duration).slice(0, 5);
      const slotStartMs = Date.parse(istDateTimeToUtcIso(targetDate, startTimeStr));
      const slotEndMs = slotStartMs + duration * 60_000;
      const isPast = targetDate < todayIst.ymd || (targetDate === todayIst.ymd && slotStartMs < nowMs + 5 * 60_000);

      const consoleStatusMap = {};
      let allConsolesFree = true;

      for (const c of consoles) {
        if (c.status === "maintenance" || c.status === "disabled") {
          consoleStatusMap[c.slug] = { available: false, reason: c.status };
          allConsolesFree = false;
          continue;
        }
        const conflict = (parsedByConsole.get(c.id) || []).find((res) =>
          intervalsOverlap(slotStartMs, slotEndMs, res.start, res.end),
        );
        if (conflict) {
          consoleStatusMap[c.slug] = { available: false, reason: conflict.sourceType };
          allConsolesFree = false;
        } else {
          consoleStatusMap[c.slug] = { available: !isPast, reason: isPast ? "past" : "open" };
        }
      }

      slots.push({
        time: startTimeStr,
        endTime: endTimeStr,
        past: isPast,
        consoles: consoleStatusMap,
        wholeLoungeAvailable: !isPast && allConsolesFree && consoles.length > 0,
      });
    }

    return {
      date: targetDate,
      durationMinutes: duration,
      openingTime: String(settings.opening_time || "10:00:00").slice(0, 5),
      closingTime: String(settings.closing_time || "22:00:00").slice(0, 5),
      consoles: consoles.map((c) => ({
        id: c.id,
        slug: c.slug,
        name: c.name,
        console_type: c.console_type,
        status: c.status,
      })),
      slots,
    };
  },

  /**
   * Computes live console status right now combining manual operational overrides
   * (maintenance/disabled) and active current-time reservations.
   */
  async getConsolesWithLiveAvailability() {
    const consoles = await consoleRepository.findAll();
    const nowIso = new Date().toISOString();
    const plusOneMin = new Date(Date.now() + 60_000).toISOString();
    const activeReservations = await consoleRepository.findActiveReservationsInRange(nowIso, plusOneMin);
    const activeConsoleIds = new Set(activeReservations.map((r) => r.console_id));

    return consoles.map((c) => {
      const hasActiveReservation = activeConsoleIds.has(c.id);
      const effectiveStatus =
        c.status === "maintenance" || c.status === "disabled"
          ? c.status
          : hasActiveReservation || c.status === "occupied"
            ? "occupied"
            : "available";
      return {
        ...c,
        effective_status: effectiveStatus,
        has_active_reservation: hasActiveReservation,
      };
    });
  },
};

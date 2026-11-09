import { groupBookingRepository } from "../repositories/groupBooking.repository.js";
import { pricingService } from "./pricing.service.js";
import { recordAuditLog } from "../utils/audit.js";
import { ApiError, generateCode } from "../utils/errors.js";
import {
  getIstTodayYmd,
  istDateTimeToUtcIso,
  minutesToTimeString,
  normalizeIndianPhone,
  parseTimeToMinutes,
} from "../utils/time.js";
import { settingsRepository } from "../repositories/settings.repository.js";

export const groupBookingService = {
  async list(filters) {
    return groupBookingRepository.findAll(filters);
  },

  async getById(id) {
    const item = await groupBookingRepository.findById(id);
    if (!item) throw new ApiError(404, "NOT_FOUND", "Whole lounge booking not found.");
    return item;
  },

  /**
   * Public customer request for Whole Lounge exclusive reservation.
   * Starts as `pending` (does NOT reserve the consoles until approved atomically).
   */
  async createRequest(input) {
    const phone = normalizeIndianPhone(input.customer_phone);
    if (!phone) {
      throw new ApiError(400, "INVALID_PHONE", "Please enter a valid 10-digit Indian mobile number.");
    }

    const todayIst = getIstTodayYmd();
    if (input.booking_date < todayIst.ymd) {
      throw new ApiError(400, "PAST_DATE", "Cannot request a booking date in the past.");
    }
    const startUtc = Date.parse(istDateTimeToUtcIso(input.booking_date, input.start_time));
    if (startUtc < Date.now() - 5 * 60_000) {
      throw new ApiError(400, "PAST_TIME", "Selected start time has already passed.");
    }

    const duration = Number(input.duration || 180);
    const settings = await settingsRepository.get();
    const startMins = parseTimeToMinutes(input.start_time);
    const endMins = startMins + duration;
    const openMins = parseTimeToMinutes(settings.opening_time || "10:00");
    const closeMins = parseTimeToMinutes(settings.closing_time || "22:00");

    if (startMins < openMins || endMins > closeMins || endMins <= startMins) {
      throw new ApiError(400, "OUTSIDE_HOURS", "Selected time falls outside lounge operating hours.");
    }

    const { price } = await pricingService.calculatePrice({
      category: "whole_lounge",
      durationMinutes: duration,
    });

    const created = await groupBookingRepository.create({
      booking_code: generateCode("WL"),
      customer_name: input.customer_name.trim(),
      customer_phone: phone,
      booking_date: input.booking_date,
      start_time: `${input.start_time.slice(0, 5)}:00`,
      end_time: minutesToTimeString(endMins),
      duration,
      number_of_people: Number(input.number_of_people || 6),
      total_amount: price,
      booking_status: "pending",
      payment_status: "pending",
      notes: input.notes?.trim() || null,
    });

    return created;
  },

  /**
   * Atomically validates that BOTH PS4 and PS4 Pro are free and operational for the
   * full duration, inserts reservations for BOTH consoles, and marks confirmed.
   */
  async approve(id, actor, ipAddress) {
    const approved = await groupBookingRepository.approveAtomic(id, actor.id);
    await recordAuditLog({
      actorId: actor.id,
      actorEmail: actor.email,
      actorRole: actor.role,
      action: "APPROVE_GROUP_BOOKING",
      entityType: "group_booking",
      entityId: id,
      details: {
        booking_code: approved.booking_code,
        booking_date: approved.booking_date,
        start_time: approved.start_time,
        end_time: approved.end_time,
      },
      ipAddress,
    });
    return approved;
  },

  async reject(id, reason, actor, ipAddress) {
    const existing = await groupBookingRepository.findById(id);
    if (!existing) throw new ApiError(404, "NOT_FOUND", "Whole lounge booking not found.");
    if (existing.booking_status === "completed") {
      throw new ApiError(400, "INVALID_TRANSITION", "Completed bookings cannot be rejected.");
    }
    const updated = await groupBookingRepository.update(id, {
      booking_status: "rejected",
      rejection_reason: reason?.trim() || "Rejected by lounge team",
      reviewed_by: actor.id,
      reviewed_at: new Date().toISOString(),
    });
    await recordAuditLog({
      actorId: actor.id,
      actorEmail: actor.email,
      actorRole: actor.role,
      action: "REJECT_GROUP_BOOKING",
      entityType: "group_booking",
      entityId: id,
      details: { booking_code: existing.booking_code, reason },
      ipAddress,
    });
    return updated;
  },

  async cancel(id, actor, ipAddress) {
    const existing = await groupBookingRepository.findById(id);
    if (!existing) throw new ApiError(404, "NOT_FOUND", "Whole lounge booking not found.");
    const updated = await groupBookingRepository.update(id, {
      booking_status: "cancelled",
      reviewed_by: actor.id,
      reviewed_at: new Date().toISOString(),
    });
    await recordAuditLog({
      actorId: actor.id,
      actorEmail: actor.email,
      actorRole: actor.role,
      action: "CANCEL_GROUP_BOOKING",
      entityType: "group_booking",
      entityId: id,
      details: { booking_code: existing.booking_code },
      ipAddress,
    });
    return updated;
  },
};

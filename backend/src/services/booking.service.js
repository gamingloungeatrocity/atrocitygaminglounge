import { bookingRepository } from "../repositories/booking.repository.js";
import { consoleRepository } from "../repositories/console.repository.js";
import { pricingService } from "./pricing.service.js";
import { recordAuditLog } from "../utils/audit.js";
import { ApiError, generateCode } from "../utils/errors.js";
import { getIstTodayYmd, istDateTimeToUtcIso, normalizeIndianPhone } from "../utils/time.js";

export const bookingService = {
  async list(filters) {
    return bookingRepository.findAll(filters);
  },

  async getById(id) {
    const booking = await bookingRepository.findById(id);
    if (!booking) throw new ApiError(404, "NOT_FOUND", "Booking not found.");
    return booking;
  },

  /**
   * Creates an individual console booking atomically via PostgreSQL RPC.
   * Server resolves console, verifies active status, computes price from `pricing` table,
   * and inserts into `console_reservations` under GiST exclusion constraints.
   */
  async createBooking(input, actor = null, ipAddress = null) {
    const phone = normalizeIndianPhone(input.customer_phone);
    if (!phone) {
      throw new ApiError(400, "INVALID_PHONE", "Please provide a valid 10-digit Indian mobile number.");
    }

    const consoleRow = await consoleRepository.findByTypeOrSlug(input.console_id || input.console_type);
    if (!consoleRow) {
      throw new ApiError(404, "CONSOLE_NOT_FOUND", "Selected console station was not found.");
    }

    const todayIst = getIstTodayYmd();
    if (input.booking_date < todayIst.ymd) {
      throw new ApiError(400, "PAST_DATE", "Cannot book a date in the past.");
    }
    const startUtc = Date.parse(istDateTimeToUtcIso(input.booking_date, input.start_time));
    if (startUtc < Date.now() - 5 * 60_000) {
      throw new ApiError(400, "PAST_TIME", "Selected start time has already passed.");
    }

    const category = consoleRow.slug === "ps4pro" || consoleRow.console_type === "PS4 Pro" ? "ps4pro" : "ps4";
    const { price, bonusMinutes } = await pricingService.calculatePrice({
      category,
      durationMinutes: input.duration,
    });

    const bookingCode = generateCode("BKG");
    const isStaffWalkin = Boolean(actor && input.booking_source === "walkin");

    const created = await bookingRepository.createAtomic({
      p_booking_code: bookingCode,
      p_customer_name: input.customer_name,
      p_customer_phone: phone,
      p_console_id: consoleRow.id,
      p_booking_date: input.booking_date,
      p_start_time: input.start_time.length === 5 ? `${input.start_time}:00` : input.start_time,
      p_duration: input.duration,
      p_bonus_minutes: bonusMinutes,
      p_game_title: input.game_title || null,
      p_players: input.players || 1,
      p_total_amount: price,
      p_booking_source: isStaffWalkin ? "walkin" : "online",
      p_booking_status: isStaffWalkin ? "confirmed" : input.booking_status || "confirmed",
      p_payment_status: "pending",
      p_notes: input.notes || null,
      p_created_by: actor?.id || null,
    });

    if (actor) {
      await recordAuditLog({
        actorId: actor.id,
        actorEmail: actor.email,
        actorRole: actor.role,
        action: "CREATE_BOOKING",
        entityType: "booking",
        entityId: created.id,
        details: { booking_code: created.booking_code, console: consoleRow.console_type, amount: price },
        ipAddress,
      });
    }

    return { ...created, consoles: consoleRow };
  },

  async updateStatus(id, bookingStatus, actor, ipAddress) {
    const existing = await bookingRepository.findById(id);
    if (!existing) throw new ApiError(404, "NOT_FOUND", "Booking not found.");

    // Prevent reactivating a cancelled booking blindly (must go through reschedule/recreate conflict check)
    if (existing.booking_status === "cancelled" && ["pending", "confirmed", "active"].includes(bookingStatus)) {
      throw new ApiError(400, "INVALID_TRANSITION", "Cancelled bookings cannot be reopened directly; create a new booking to verify availability.");
    }

    const updated = await bookingRepository.updateStatus(id, bookingStatus);
    await recordAuditLog({
      actorId: actor.id,
      actorEmail: actor.email,
      actorRole: actor.role,
      action: "UPDATE_BOOKING_STATUS",
      entityType: "booking",
      entityId: id,
      details: { from: existing.booking_status, to: bookingStatus, booking_code: existing.booking_code },
      ipAddress,
    });
    return updated;
  },

  async reschedule(id, { console_id, booking_date, start_time, duration }, actor, ipAddress) {
    const existing = await bookingRepository.findById(id);
    if (!existing) throw new ApiError(404, "NOT_FOUND", "Booking not found.");

    const targetConsole = console_id
      ? await consoleRepository.findByTypeOrSlug(console_id)
      : existing.consoles;
    if (!targetConsole) throw new ApiError(404, "CONSOLE_NOT_FOUND", "Console not found.");

    const updated = await bookingRepository.rescheduleAtomic({
      p_booking_id: id,
      p_console_id: targetConsole.id,
      p_booking_date: booking_date || existing.booking_date,
      p_start_time: (start_time || existing.start_time).slice(0, 5) + ":00",
      p_duration: duration || existing.duration,
    });

    await recordAuditLog({
      actorId: actor.id,
      actorEmail: actor.email,
      actorRole: actor.role,
      action: "RESCHEDULE_BOOKING",
      entityType: "booking",
      entityId: id,
      details: {
        booking_code: existing.booking_code,
        booking_date: updated.booking_date,
        start_time: updated.start_time,
        duration: updated.duration,
        console_id: updated.console_id,
      },
      ipAddress,
    });

    return bookingRepository.findById(id);
  },

  async cancel(id, actor, ipAddress) {
    return this.updateStatus(id, "cancelled", actor, ipAddress);
  },
};

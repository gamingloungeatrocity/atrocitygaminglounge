import { consoleRepository } from "../repositories/console.repository.js";
import { walkinRepository } from "../repositories/walkin.repository.js";
import { pricingService } from "./pricing.service.js";
import { recordAuditLog } from "../utils/audit.js";
import { ApiError, generateCode } from "../utils/errors.js";
import { getIstTodayYmd, istDateTimeToUtcIso, normalizeIndianPhone } from "../utils/time.js";

export const walkinService = {
  async list(filters) {
    return walkinRepository.findAll(filters);
  },

  async listActive() {
    return walkinRepository.findActive();
  },

  async createWalkin(input, actor, ipAddress) {
    const phone = normalizeIndianPhone(input.customer_phone);
    if (!phone) {
      throw new ApiError(400, "INVALID_PHONE", "Please enter a valid 10-digit Indian mobile number.");
    }

    const consoleRow = await consoleRepository.findByTypeOrSlug(input.console_id || input.console_type);
    if (!consoleRow) {
      throw new ApiError(404, "CONSOLE_NOT_FOUND", "Selected console was not found.");
    }

    const category = consoleRow.slug === "ps4pro" || consoleRow.console_type === "PS4 Pro" ? "ps4pro" : "ps4";
    const { price: dbPrice } = await pricingService.calculatePrice({
      category,
      durationMinutes: input.duration_minutes,
    });

    const startIso = input.start_time
      ? input.start_time.includes("T")
        ? new Date(input.start_time).toISOString()
        : istDateTimeToUtcIso(getIstTodayYmd().ymd, input.start_time)
      : new Date().toISOString();

    const amountCollected =
      typeof input.amount_collected === "number" && input.amount_collected >= 0 ? input.amount_collected : dbPrice;

    const result = await walkinRepository.createAtomic({
      p_booking_code: generateCode("WLK"),
      p_customer_name: input.customer_name,
      p_customer_phone: phone,
      p_console_id: consoleRow.id,
      p_duration_minutes: input.duration_minutes,
      p_start_timestamptz: startIso,
      p_amount_collected: amountCollected,
      p_payment_method: input.payment_method,
      p_staff_id: actor.id,
      p_notes: input.notes || null,
      p_transaction_id: generateCode("PAY"),
    });

    await recordAuditLog({
      actorId: actor.id,
      actorEmail: actor.email,
      actorRole: actor.role,
      action: "CREATE_WALKIN",
      entityType: "walkin_session",
      entityId: result?.walkin?.id,
      details: {
        console: consoleRow.console_type,
        duration_minutes: input.duration_minutes,
        amount_collected: amountCollected,
        payment_method: input.payment_method,
      },
      ipAddress,
    });

    return {
      ...result,
      console: consoleRow,
    };
  },

  async completeWalkin(id, actor, ipAddress) {
    const existing = await walkinRepository.findById(id);
    if (!existing) throw new ApiError(404, "NOT_FOUND", "Walk-in session not found.");
    if (existing.session_status === "completed") return existing;

    const completed = await walkinRepository.completeAtomic(id);
    await recordAuditLog({
      actorId: actor.id,
      actorEmail: actor.email,
      actorRole: actor.role,
      action: "COMPLETE_WALKIN",
      entityType: "walkin_session",
      entityId: id,
      details: { customer_name: existing.customer_name, console_id: existing.console_id },
      ipAddress,
    });
    return completed;
  },
};

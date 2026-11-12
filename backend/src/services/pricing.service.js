import { pricingRepository } from "../repositories/pricing.repository.js";
import { recordAuditLog } from "../utils/audit.js";
import { ApiError } from "../utils/errors.js";

export const pricingService = {
  async listPublic() {
    return pricingRepository.findAll({ activeOnly: true });
  },

  async listAdmin() {
    return pricingRepository.findAll({ activeOnly: false });
  },

  /**
   * Computes exact authoritative price & bonus minutes from the database `pricing` table.
   * Existing bookings never change when pricing is later updated.
   */
  async calculatePrice({ category, durationMinutes }) {
    const exact = await pricingRepository.findByCategoryAndDuration(category, durationMinutes);
    if (exact) {
      return {
        price: Number(exact.price),
        bonusMinutes: Number(exact.bonus_minutes || 0),
        pricingId: exact.id,
        label: exact.label,
      };
    }

    if (category === "whole_lounge") {
      const allLounge = (await pricingRepository.findAll({ activeOnly: true })).filter(
        (p) => p.category === "whole_lounge",
      );
      if (allLounge.length > 0) {
        return {
          price: Number(allLounge[0].price),
          bonusMinutes: 0,
          pricingId: allLounge[0].id,
          label: allLounge[0].label,
        };
      }
      throw new ApiError(400, "PRICING_NOT_CONFIGURED", "Whole lounge pricing is not configured.");
    }

    // Fallback to hourly pricing scaled proportionally by 30-min increments if custom duration
    const hourly = await pricingRepository.findByCategoryAndDuration(category, 60);
    if (!hourly) {
      throw new ApiError(400, "PRICING_NOT_CONFIGURED", `No active pricing configured for ${category}.`);
    }
    const computed = Math.round((Number(hourly.price) * (durationMinutes / 60)) * 100) / 100;
    return {
      price: computed,
      bonusMinutes: 0,
      pricingId: hourly.id,
      label: `${durationMinutes} mins (${category})`,
    };
  },

  /**
   * Resolves a public booking package from its database record. Both the
   * duration and amount are validated against that record so neither can be
   * altered by a browser or API client.
   */
  async resolveBookingPackage({ pricingId, category, durationMinutes }) {
    const selected = await pricingRepository.findById(pricingId);
    if (!selected || !selected.is_active || selected.category !== category) {
      throw new ApiError(400, "INVALID_PACKAGE", "The selected booking package is no longer available for this console.");
    }

    if (Number(selected.duration_minutes) !== durationMinutes) {
      throw new ApiError(400, "PACKAGE_DURATION_MISMATCH", "The booking duration must match the selected package.");
    }

    return {
      price: Number(selected.price),
      bonusMinutes: Number(selected.bonus_minutes || 0),
      pricingId: selected.id,
      label: selected.label,
      durationMinutes: Number(selected.duration_minutes),
    };
  },

  async upsertPricing(payload, actor, ipAddress) {
    const saved = await pricingRepository.upsert(payload);
    await recordAuditLog({
      actorId: actor.id,
      actorEmail: actor.email,
      actorRole: actor.role,
      action: payload.id ? "UPDATE_PRICING" : "CREATE_PRICING",
      entityType: "pricing",
      entityId: saved.id,
      details: saved,
      ipAddress,
    });
    return saved;
  },

  async deletePricing(id, actor, ipAddress) {
    const existing = await pricingRepository.findById(id);
    if (!existing) throw new ApiError(404, "NOT_FOUND", "Pricing entry not found.");
    await pricingRepository.remove(id);
    await recordAuditLog({
      actorId: actor.id,
      actorEmail: actor.email,
      actorRole: actor.role,
      action: "DELETE_PRICING",
      entityType: "pricing",
      entityId: id,
      details: existing,
      ipAddress,
    });
    return { deleted: true };
  },
};

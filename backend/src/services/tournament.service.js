import { tournamentRepository } from "../repositories/tournament.repository.js";
import { recordAuditLog } from "../utils/audit.js";
import { ApiError, generateCode } from "../utils/errors.js";
import { normalizeIndianPhone, slugify } from "../utils/time.js";
import { removeCover } from "./media.service.js";

export const tournamentService = {
  async listPublic() {
    return tournamentRepository.findAll({ publishedOnly: true });
  },

  async listAll(filters) {
    return tournamentRepository.findAll(filters);
  },

  async getById(id) {
    const item = await tournamentRepository.findById(id);
    if (!item) throw new ApiError(404, "NOT_FOUND", "Tournament not found.");
    return item;
  },

  async create(input, actor, ipAddress) {
    const created = await tournamentRepository.create({
      ...input,
      slug: slugify(input.title),
      start_time: input.start_time.length === 5 ? `${input.start_time}:00` : input.start_time,
      created_by: actor.id,
    });
    await recordAuditLog({
      actorId: actor.id,
      actorEmail: actor.email,
      actorRole: actor.role,
      action: "CREATE_TOURNAMENT",
      entityType: "tournament",
      entityId: created.id,
      details: { title: created.title, game_name: created.game_name },
      ipAddress,
    });
    return created;
  },

  async update(id, patch, actor, ipAddress) {
    const existing = await tournamentRepository.findById(id);
    if (!existing) throw new ApiError(404, "NOT_FOUND", "Tournament not found.");

    const cleanPatch = { ...patch };
    if (cleanPatch.start_time && cleanPatch.start_time.length === 5) {
      cleanPatch.start_time = `${cleanPatch.start_time}:00`;
    }
    if (Object.prototype.hasOwnProperty.call(cleanPatch, "cover_image_path") && cleanPatch.cover_image_path !== existing.cover_image_path) {
      await removeCover(existing.cover_image_path);
    }

    const updated = await tournamentRepository.update(id, cleanPatch);
    await recordAuditLog({
      actorId: actor.id,
      actorEmail: actor.email,
      actorRole: actor.role,
      action: "UPDATE_TOURNAMENT",
      entityType: "tournament",
      entityId: id,
      details: cleanPatch,
      ipAddress,
    });
    return updated;
  },

  async updateStatus(id, status, actor, ipAddress) {
    const existing = await tournamentRepository.findById(id);
    if (!existing) throw new ApiError(404, "NOT_FOUND", "Tournament not found.");

    const updated = await tournamentRepository.update(id, { status });
    await recordAuditLog({
      actorId: actor.id,
      actorEmail: actor.email,
      actorRole: actor.role,
      action: "UPDATE_TOURNAMENT_STATUS",
      entityType: "tournament",
      entityId: id,
      details: { from: existing.status, to: status },
      ipAddress,
    });
    return updated;
  },

  async remove(id, actor, ipAddress) {
    const existing = await tournamentRepository.findById(id);
    if (!existing) throw new ApiError(404, "NOT_FOUND", "Tournament not found.");
    await tournamentRepository.remove(id);
    await removeCover(existing.cover_image_path);
    await recordAuditLog({
      actorId: actor.id,
      actorEmail: actor.email,
      actorRole: actor.role,
      action: "DELETE_TOURNAMENT",
      entityType: "tournament",
      entityId: id,
      details: { title: existing.title },
      ipAddress,
    });
    return { deleted: true };
  },

  async registerParticipant(tournamentId, input) {
    const phone = normalizeIndianPhone(input.phone);
    if (!phone) {
      throw new ApiError(400, "INVALID_PHONE", "Please enter a valid 10-digit Indian mobile number.");
    }

    const reg = await tournamentRepository.registerAtomic({
      p_registration_code: generateCode("TRN"),
      p_tournament_id: tournamentId,
      p_participant_name: input.participant_name,
      p_phone: phone,
      p_gamer_tag: input.gamer_tag || null,
      p_payment_status: "pending",
      p_notes: input.notes || null,
    });

    return reg;
  },

  async listRegistrations(tournamentId, filters) {
    return tournamentRepository.findRegistrations(tournamentId, filters);
  },

  async updateRegistration(regId, patch, actor, ipAddress) {
    const updated = await tournamentRepository.updateRegistration(regId, {
      ...patch,
      reviewed_by: actor.id,
    });
    if (!updated) throw new ApiError(404, "NOT_FOUND", "Registration not found.");

    await recordAuditLog({
      actorId: actor.id,
      actorEmail: actor.email,
      actorRole: actor.role,
      action: "UPDATE_TOURNAMENT_REGISTRATION",
      entityType: "tournament_registration",
      entityId: regId,
      details: patch,
      ipAddress,
    });
    return updated;
  },

  async exportRegistrationsCsv(tournamentId) {
    const rows = await tournamentRepository.findRegistrations(tournamentId, {});
    const headers = [
      "Registration Code",
      "Tournament",
      "Participant Name",
      "Phone",
      "Gamer Tag",
      "Registration Status",
      "Payment Status",
      "Registration Date",
    ];
    const escape = (v) => `"${String(v ?? "").replace(/"/g, '""')}"`;
    const lines = [
      headers.join(","),
      ...rows.map((r) =>
        [
          r.registration_code,
          r.tournaments?.title || "",
          r.participant_name,
          r.phone,
          r.gamer_tag || "",
          r.registration_status,
          r.payment_status,
          r.registration_date,
        ]
          .map(escape)
          .join(","),
      ),
    ];
    return lines.join("\n");
  },
};

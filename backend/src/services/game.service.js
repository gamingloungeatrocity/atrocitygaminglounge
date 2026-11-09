import { gameRepository } from "../repositories/game.repository.js";
import { recordAuditLog } from "../utils/audit.js";
import { ApiError } from "../utils/errors.js";
import { removeCover } from "./media.service.js";

export const gameService = {
  listPublic: () => gameRepository.findAll({ publishedOnly: true }),
  listAdmin: () => gameRepository.findAll(),

  async create(payload, actor, ipAddress) {
    const game = await gameRepository.create(payload);
    await recordAuditLog({ actorId: actor.id, actorEmail: actor.email, actorRole: actor.role, action: "CREATE_GAME", entityType: "game", entityId: game.id, details: game, ipAddress });
    return game;
  },

  async update(id, payload, actor, ipAddress) {
    const existing = await gameRepository.findById(id);
    if (!existing) throw new ApiError(404, "NOT_FOUND", "Game not found.");
    if (Object.prototype.hasOwnProperty.call(payload, "cover_image_path") && payload.cover_image_path !== existing.cover_image_path) {
      await removeCover(existing.cover_image_path);
    }
    const game = await gameRepository.update(id, payload);
    await recordAuditLog({ actorId: actor.id, actorEmail: actor.email, actorRole: actor.role, action: "UPDATE_GAME", entityType: "game", entityId: id, details: game, ipAddress });
    return game;
  },

  async remove(id, actor, ipAddress) {
    const existing = await gameRepository.findById(id);
    if (!existing) throw new ApiError(404, "NOT_FOUND", "Game not found.");
    await gameRepository.remove(id);
    await removeCover(existing.cover_image_path);
    await recordAuditLog({ actorId: actor.id, actorEmail: actor.email, actorRole: actor.role, action: "DELETE_GAME", entityType: "game", entityId: id, details: existing, ipAddress });
    return { deleted: true };
  },
};

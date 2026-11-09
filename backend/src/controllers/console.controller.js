import { consoleRepository } from "../repositories/console.repository.js";
import { availabilityService } from "../services/availability.service.js";
import { recordAuditLog } from "../utils/audit.js";
import { ApiError } from "../utils/errors.js";
import { getIstTodayYmd } from "../utils/time.js";

export const consoleController = {
  async list(_req, res, next) {
    try {
      const data = await availabilityService.getConsolesWithLiveAvailability();
      return res.json({ success: true, data });
    } catch (err) {
      return next(err);
    }
  },

  async getById(req, res, next) {
    try {
      const consoleRow = await consoleRepository.findById(req.params.id);
      if (!consoleRow) throw new ApiError(404, "NOT_FOUND", "Console not found.");
      const today = getIstTodayYmd().ymd;
      const schedule = await consoleRepository.findConsoleSchedule(consoleRow.id, today);
      return res.json({ success: true, data: { ...consoleRow, schedule } });
    } catch (err) {
      return next(err);
    }
  },

  async availability(req, res, next) {
    try {
      const data = await availabilityService.getAvailability({
        date: req.query.date,
        durationMinutes: req.query.duration ? Number(req.query.duration) : 60,
        stepMinutes: req.query.step ? Number(req.query.step) : 30,
      });
      return res.json({ success: true, data });
    } catch (err) {
      return next(err);
    }
  },

  async create(req, res, next) {
    try {
      const created = await consoleRepository.create(req.validatedBody);
      await recordAuditLog({
        actorId: req.staffProfile.id,
        actorEmail: req.staffProfile.email,
        actorRole: req.staffProfile.role,
        action: "CREATE_CONSOLE",
        entityType: "console",
        entityId: created.id,
        details: created,
        ipAddress: req.ip,
      });
      return res.status(201).json({ success: true, data: created });
    } catch (err) {
      return next(err);
    }
  },

  async update(req, res, next) {
    try {
      const updated = await consoleRepository.update(req.params.id, req.validatedBody);
      if (!updated) throw new ApiError(404, "NOT_FOUND", "Console not found.");
      await recordAuditLog({
        actorId: req.staffProfile.id,
        actorEmail: req.staffProfile.email,
        actorRole: req.staffProfile.role,
        action: "UPDATE_CONSOLE",
        entityType: "console",
        entityId: req.params.id,
        details: req.validatedBody,
        ipAddress: req.ip,
      });
      return res.json({ success: true, data: updated });
    } catch (err) {
      return next(err);
    }
  },

  async updateStatus(req, res, next) {
    try {
      const { status, maintenance_note } = req.validatedBody;
      // Staff operational status permissions exclude 'disabled' unless admin
      if (req.staffProfile.role !== "admin" && status === "disabled") {
        throw new ApiError(403, "ADMIN_ONLY", "Only administrators can disable a console.");
      }
      const updated = await consoleRepository.update(req.params.id, {
        status,
        ...(maintenance_note !== undefined ? { maintenance_note } : {}),
      });
      if (!updated) throw new ApiError(404, "NOT_FOUND", "Console not found.");
      await recordAuditLog({
        actorId: req.staffProfile.id,
        actorEmail: req.staffProfile.email,
        actorRole: req.staffProfile.role,
        action: "UPDATE_CONSOLE_STATUS",
        entityType: "console",
        entityId: req.params.id,
        details: { status, maintenance_note },
        ipAddress: req.ip,
      });
      return res.json({ success: true, data: updated });
    } catch (err) {
      return next(err);
    }
  },
};

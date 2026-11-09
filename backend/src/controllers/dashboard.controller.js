import { dashboardService } from "../services/dashboard.service.js";
import { settingsRepository } from "../repositories/settings.repository.js";
import { staffRepository } from "../repositories/staff.repository.js";
import { recordAuditLog } from "../utils/audit.js";

export const dashboardController = {
  async adminOverview(_req, res, next) {
    try {
      const data = await dashboardService.getAdminDashboard();
      return res.json({ success: true, data });
    } catch (err) {
      return next(err);
    }
  },

  async staffOverview(_req, res, next) {
    try {
      const data = await dashboardService.getStaffDashboard();
      return res.json({ success: true, data });
    } catch (err) {
      return next(err);
    }
  },

  async getSettings(_req, res, next) {
    try {
      const data = await settingsRepository.get();
      return res.json({ success: true, data });
    } catch (err) {
      return next(err);
    }
  },

  async updateSettings(req, res, next) {
    try {
      const data = await settingsRepository.update(req.validatedBody);
      await recordAuditLog({
        actorId: req.staffProfile.id,
        actorEmail: req.staffProfile.email,
        actorRole: req.staffProfile.role,
        action: "UPDATE_SETTINGS",
        entityType: "lounge_settings",
        entityId: "1",
        details: req.validatedBody,
        ipAddress: req.ip,
      });
      return res.json({ success: true, data });
    } catch (err) {
      return next(err);
    }
  },

  async listAuditLogs(req, res, next) {
    try {
      const limit = Math.min(200, Math.max(10, Number(req.query.limit || 80)));
      const data = await staffRepository.findActivity(req.query.actor_id || null, limit);
      return res.json({ success: true, data });
    } catch (err) {
      return next(err);
    }
  },
};

import { staffService } from "../services/staff.service.js";

export const staffController = {
  async list(_req, res, next) {
    try {
      const data = await staffService.list();
      return res.json({ success: true, data });
    } catch (err) {
      return next(err);
    }
  },

  async create(req, res, next) {
    try {
      const data = await staffService.createStaff(req.validatedBody, req.staffProfile, req.ip);
      return res.status(201).json({ success: true, data });
    } catch (err) {
      return next(err);
    }
  },

  async update(req, res, next) {
    try {
      const data = await staffService.updateStaff(req.params.id, req.validatedBody, req.staffProfile, req.ip);
      return res.json({ success: true, data });
    } catch (err) {
      return next(err);
    }
  },

  async toggleStatus(req, res, next) {
    try {
      const data = await staffService.toggleStatus(req.params.id, req.validatedBody.is_active, req.staffProfile, req.ip);
      return res.json({ success: true, data });
    } catch (err) {
      return next(err);
    }
  },

  async resetPassword(req, res, next) {
    try {
      const data = await staffService.resetCredentials(req.params.id, req.validatedBody, req.staffProfile, req.ip);
      return res.json({ success: true, data });
    } catch (err) {
      return next(err);
    }
  },

  async activity(req, res, next) {
    try {
      const data = await staffService.getActivity(req.params.id);
      return res.json({ success: true, data });
    } catch (err) {
      return next(err);
    }
  },
};

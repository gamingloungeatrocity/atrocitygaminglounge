import { walkinService } from "../services/walkin.service.js";

export const walkinController = {
  async list(req, res, next) {
    try {
      const data = await walkinService.list({
        status: req.query.status,
        consoleId: req.query.console_id,
        date: req.query.date,
      });
      return res.json({ success: true, data });
    } catch (err) {
      return next(err);
    }
  },

  async listActive(_req, res, next) {
    try {
      const data = await walkinService.listActive();
      return res.json({ success: true, data });
    } catch (err) {
      return next(err);
    }
  },

  async create(req, res, next) {
    try {
      const data = await walkinService.createWalkin(req.validatedBody, req.staffProfile, req.ip);
      return res.status(201).json({ success: true, data });
    } catch (err) {
      return next(err);
    }
  },

  async complete(req, res, next) {
    try {
      const data = await walkinService.completeWalkin(req.params.id, req.staffProfile, req.ip);
      return res.json({ success: true, data });
    } catch (err) {
      return next(err);
    }
  },
};

import { groupBookingService } from "../services/groupBooking.service.js";

export const groupBookingController = {
  async list(req, res, next) {
    try {
      const data = await groupBookingService.list({
        date: req.query.date,
        status: req.query.status,
        paymentStatus: req.query.payment_status,
        search: req.query.search,
      });
      return res.json({ success: true, data });
    } catch (err) {
      return next(err);
    }
  },

  async getById(req, res, next) {
    try {
      const data = await groupBookingService.getById(req.params.id);
      return res.json({ success: true, data });
    } catch (err) {
      return next(err);
    }
  },

  async create(req, res, next) {
    try {
      const data = await groupBookingService.createRequest(req.validatedBody);
      return res.status(201).json({ success: true, data });
    } catch (err) {
      return next(err);
    }
  },

  async approve(req, res, next) {
    try {
      const data = await groupBookingService.approve(req.params.id, req.staffProfile, req.ip);
      return res.json({ success: true, data });
    } catch (err) {
      return next(err);
    }
  },

  async reject(req, res, next) {
    try {
      const data = await groupBookingService.reject(
        req.params.id,
        req.validatedBody?.rejection_reason,
        req.staffProfile,
        req.ip,
      );
      return res.json({ success: true, data });
    } catch (err) {
      return next(err);
    }
  },

  async cancel(req, res, next) {
    try {
      const data = await groupBookingService.cancel(req.params.id, req.staffProfile, req.ip);
      return res.json({ success: true, data });
    } catch (err) {
      return next(err);
    }
  },
};

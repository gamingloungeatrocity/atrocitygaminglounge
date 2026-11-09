import { bookingService } from "../services/booking.service.js";

export const bookingController = {
  async list(req, res, next) {
    try {
      const data = await bookingService.list({
        date: req.query.date,
        consoleId: req.query.console_id,
        bookingStatus: req.query.booking_status,
        paymentStatus: req.query.payment_status,
        source: req.query.source,
        search: req.query.search,
      });
      return res.json({ success: true, data });
    } catch (err) {
      return next(err);
    }
  },

  async getById(req, res, next) {
    try {
      const data = await bookingService.getById(req.params.id);
      return res.json({ success: true, data });
    } catch (err) {
      return next(err);
    }
  },

  async create(req, res, next) {
    try {
      const data = await bookingService.createBooking(req.validatedBody, req.staffProfile || null, req.ip);
      return res.status(201).json({ success: true, data });
    } catch (err) {
      return next(err);
    }
  },

  async updateStatus(req, res, next) {
    try {
      const data = await bookingService.updateStatus(
        req.params.id,
        req.validatedBody.booking_status,
        req.staffProfile,
        req.ip,
      );
      return res.json({ success: true, data });
    } catch (err) {
      return next(err);
    }
  },

  async reschedule(req, res, next) {
    try {
      const data = await bookingService.reschedule(req.params.id, req.validatedBody, req.staffProfile, req.ip);
      return res.json({ success: true, data });
    } catch (err) {
      return next(err);
    }
  },

  async remove(req, res, next) {
    try {
      const data = await bookingService.cancel(req.params.id, req.staffProfile, req.ip);
      return res.json({ success: true, data });
    } catch (err) {
      return next(err);
    }
  },
};

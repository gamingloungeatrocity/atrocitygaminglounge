import { env } from "../config/supabase.js";
import { paymentService, verifyCashfreeWebhookSignature } from "../services/payment.service.js";

export const paymentController = {
  async list(req, res, next) {
    try {
      const data = await paymentService.list({
        status: req.query.status,
        method: req.query.method,
        bookingType: req.query.booking_type,
        fromDate: req.query.from_date,
        toDate: req.query.to_date,
      });
      return res.json({ success: true, data });
    } catch (err) {
      return next(err);
    }
  },

  async createCashfreeOrder(req, res, next) {
    try {
      const data = await paymentService.createCashfreeOrder(req.validatedBody);
      return res.json({ success: true, data });
    } catch (err) {
      return next(err);
    }
  },

  async verifyCashfreeOrder(req, res, next) {
    try {
      const data = await paymentService.verifyCashfreePayment(req.validatedBody);
      return res.json({ success: true, data });
    } catch (err) {
      return next(err);
    }
  },

  async handleCashfreeWebhook(req, res, next) {
    try {
      const signature = req.headers["x-webhook-signature"];
      const timestamp = req.headers["x-webhook-timestamp"];
      const rawBody = req.rawBody || JSON.stringify(req.body);

      if (signature && timestamp && env.cashfreeSecretKey) {
        const isValid = verifyCashfreeWebhookSignature({
          timestamp,
          rawBody,
          signature,
          secret: env.cashfreeSecretKey,
        });

        if (!isValid) {
          return res.status(400).json({ success: false, message: "Invalid webhook signature" });
        }
      }

      await paymentService.handleCashfreeWebhookEvent(req.body);
      return res.json({ success: true, received: true });
    } catch (err) {
      return next(err);
    }
  },

  async recordOffline(req, res, next) {
    try {
      const data = await paymentService.recordOfflinePayment(req.validatedBody, req.staffProfile, req.ip);
      return res.status(201).json({ success: true, data });
    } catch (err) {
      return next(err);
    }
  },

  async updateStatus(req, res, next) {
    try {
      const data = await paymentService.updateStatus(
        req.params.id,
        req.validatedBody.payment_status,
        req.staffProfile,
        req.ip,
      );
      return res.json({ success: true, data });
    } catch (err) {
      return next(err);
    }
  },
};

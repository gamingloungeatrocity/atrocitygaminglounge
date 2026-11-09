import { pricingService } from "../services/pricing.service.js";

export const pricingController = {
  async listPublic(_req, res, next) {
    try {
      const data = await pricingService.listPublic();
      return res.json({ success: true, data });
    } catch (err) {
      return next(err);
    }
  },

  async listAdmin(_req, res, next) {
    try {
      const data = await pricingService.listAdmin();
      return res.json({ success: true, data });
    } catch (err) {
      return next(err);
    }
  },

  async upsert(req, res, next) {
    try {
      const data = await pricingService.upsertPricing(req.validatedBody, req.staffProfile, req.ip);
      return res.json({ success: true, data });
    } catch (err) {
      return next(err);
    }
  },

  async remove(req, res, next) {
    try {
      const data = await pricingService.deletePricing(req.params.id, req.staffProfile, req.ip);
      return res.json({ success: true, data });
    } catch (err) {
      return next(err);
    }
  },
};

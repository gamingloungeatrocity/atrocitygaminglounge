import { authService } from "../services/auth.service.js";
import { extractBearerToken } from "../middleware/authenticate.js";

export const authController = {
  async login(req, res, next) {
    try {
      const data = await authService.login({ ...req.validatedBody, ipAddress: req.ip });
      return res.json({ success: true, data });
    } catch (err) {
      return next(err);
    }
  },

  async logout(req, res, next) {
    try {
      const token = extractBearerToken(req);
      const data = await authService.logout({ token, profile: req.staffProfile, ipAddress: req.ip });
      return res.json({ success: true, data });
    } catch (err) {
      return next(err);
    }
  },

  async me(req, res, next) {
    try {
      const data = await authService.me({
        user: req.user,
        profile: req.staffProfile,
        settings: req.loungeSettings,
      });
      return res.json({ success: true, data });
    } catch (err) {
      return next(err);
    }
  },
};

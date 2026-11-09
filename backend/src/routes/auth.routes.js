import { Router } from "express";
import rateLimit from "express-rate-limit";
import { z } from "zod";
import { authController } from "../controllers/auth.controller.js";
import { authenticate } from "../middleware/authenticate.js";
import { validateBody } from "../middleware/validateRequest.js";

const router = Router();

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 25,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: { code: "RATE_LIMIT", message: "Too many login attempts. Please wait a few minutes." } },
});

const loginSchema = z.object({
  email: z.string().email("Please enter a valid email address."),
  password: z.string().min(6, "Password must be at least 6 characters."),
  portal: z.enum(["admin", "staff"]).optional(),
});

router.post("/login", authLimiter, validateBody(loginSchema), authController.login);
router.post("/logout", authenticate, authController.logout);
router.get("/me", authenticate, authController.me);

export default router;

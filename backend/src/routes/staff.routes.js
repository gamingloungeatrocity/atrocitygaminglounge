import { Router } from "express";
import { z } from "zod";
import { staffController } from "../controllers/staff.controller.js";
import { authenticate } from "../middleware/authenticate.js";
import { requireRole } from "../middleware/authorize.js";
import { validateBody } from "../middleware/validateRequest.js";

const router = Router();

const createStaffSchema = z.object({
  full_name: z.string().min(2).max(80),
  email: z.string().email(),
  phone: z.string().max(18).optional().nullable(),
  password: z.string().min(8, "Staff password must be at least 8 characters."),
  role: z.enum(["admin", "staff"]).default("staff"),
});

const updateStaffSchema = z.object({
  full_name: z.string().min(2).max(80).optional(),
  phone: z.string().max(18).nullable().optional(),
  role: z.enum(["admin", "staff"]).optional(),
});

const statusSchema = z.object({
  is_active: z.boolean(),
});

const resetSchema = z.object({
  newPassword: z.string().min(8).optional(),
});

router.use(authenticate, requireRole("admin"));

router.get("/", staffController.list);
router.post("/", validateBody(createStaffSchema), staffController.create);
router.put("/:id", validateBody(updateStaffSchema), staffController.update);
router.patch("/:id/status", validateBody(statusSchema), staffController.toggleStatus);
router.post("/:id/reset-password", validateBody(resetSchema), staffController.resetPassword);
router.get("/:id/activity", staffController.activity);

export default router;

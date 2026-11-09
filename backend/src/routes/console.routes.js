import { Router } from "express";
import { z } from "zod";
import { consoleController } from "../controllers/console.controller.js";
import { authenticate } from "../middleware/authenticate.js";
import { requireRole, requireStaffPermission } from "../middleware/authorize.js";
import { validateBody } from "../middleware/validateRequest.js";

const router = Router();

const createConsoleSchema = z.object({
  slug: z.string().min(2).max(40),
  name: z.string().min(2).max(80),
  console_type: z.string().min(2).max(40),
  description: z.string().max(400).optional(),
  specs: z.record(z.string()).optional(),
  status: z.enum(["available", "occupied", "maintenance", "disabled"]).optional(),
});

const updateConsoleSchema = z.object({
  name: z.string().min(2).max(80).optional(),
  description: z.string().max(400).optional(),
  specs: z.record(z.string()).optional(),
  status: z.enum(["available", "occupied", "maintenance", "disabled"]).optional(),
  maintenance_note: z.string().max(240).nullable().optional(),
});

const statusSchema = z.object({
  status: z.enum(["available", "occupied", "maintenance", "disabled"]),
  maintenance_note: z.string().max(240).nullable().optional(),
});

// Public catalog & live availability checks
router.get("/consoles", consoleController.list);
router.get("/consoles/:id", authenticate, requireRole("admin", "staff"), consoleController.getById);
router.get("/availability", consoleController.availability);

// Protected console status & management
router.post("/admin/consoles", authenticate, requireRole("admin"), validateBody(createConsoleSchema), consoleController.create);
router.put("/admin/consoles/:id", authenticate, requireRole("admin"), validateBody(updateConsoleSchema), consoleController.update);
router.patch(
  "/admin/consoles/:id/status",
  authenticate,
  requireRole("admin"),
  validateBody(statusSchema),
  consoleController.updateStatus,
);
router.patch(
  "/consoles/:id/status",
  authenticate,
  requireRole("admin", "staff"),
  requireStaffPermission("staff_can_update_console_status", "update console status"),
  validateBody(statusSchema),
  consoleController.updateStatus,
);

export default router;

import { Router } from "express";
import { z } from "zod";
import { dashboardController } from "../controllers/dashboard.controller.js";
import { authenticate } from "../middleware/authenticate.js";
import { requireRole } from "../middleware/authorize.js";
import { validateBody } from "../middleware/validateRequest.js";

const router = Router();

const settingsSchema = z.object({
  lounge_name: z.string().min(2).max(120).optional(),
  opening_time: z.string().regex(/^\d{2}:\d{2}(:\d{2})?$/).optional(),
  closing_time: z.string().regex(/^\d{2}:\d{2}(:\d{2})?$/).optional(),
  staff_can_approve_group_bookings: z.boolean().optional(),
  staff_can_cancel_bookings: z.boolean().optional(),
  staff_can_update_console_status: z.boolean().optional(),
  staff_can_manage_tournaments: z.boolean().optional(),
  tournament_manual_approval: z.boolean().optional(),
  online_booking_auto_reserve_lounge: z.boolean().optional(),
});

router.get("/admin/dashboard", authenticate, requireRole("admin"), dashboardController.adminOverview);
router.get("/admin/settings", authenticate, requireRole("admin"), dashboardController.getSettings);
router.put("/admin/settings", authenticate, requireRole("admin"), validateBody(settingsSchema), dashboardController.updateSettings);
router.get("/admin/audit-logs", authenticate, requireRole("admin"), dashboardController.listAuditLogs);

router.get("/staff/dashboard", authenticate, requireRole("admin", "staff"), dashboardController.staffOverview);

export default router;

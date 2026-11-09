import { Router } from "express";
import rateLimit from "express-rate-limit";
import { z } from "zod";
import { groupBookingController } from "../controllers/groupBooking.controller.js";
import { authenticate } from "../middleware/authenticate.js";
import { requireRole, requireStaffPermission } from "../middleware/authorize.js";
import { validateBody } from "../middleware/validateRequest.js";

const router = Router();

const limiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
});

const createGroupSchema = z.object({
  customer_name: z.string().min(2).max(80),
  customer_phone: z.string().min(10).max(18),
  booking_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  start_time: z.string().regex(/^\d{2}:\d{2}(:\d{2})?$/),
  duration: z.number().int().min(60).max(720).default(180),
  number_of_people: z.number().int().min(2).max(60).default(6),
  notes: z.string().max(400).optional().nullable(),
});

const rejectSchema = z.object({
  rejection_reason: z.string().max(250).optional(),
});

// Public customer whole-lounge reservation request
router.post("/", limiter, validateBody(createGroupSchema), groupBookingController.create);

// Protected management endpoints
router.get("/", authenticate, requireRole("admin", "staff"), groupBookingController.list);
router.get("/:id", authenticate, requireRole("admin", "staff"), groupBookingController.getById);

router.patch(
  "/:id/approve",
  authenticate,
  requireRole("admin", "staff"),
  requireStaffPermission("staff_can_approve_group_bookings", "approve whole lounge bookings"),
  groupBookingController.approve,
);
router.patch(
  "/:id/reject",
  authenticate,
  requireRole("admin", "staff"),
  requireStaffPermission("staff_can_approve_group_bookings", "reject whole lounge bookings"),
  validateBody(rejectSchema),
  groupBookingController.reject,
);
router.patch(
  "/:id/cancel",
  authenticate,
  requireRole("admin", "staff"),
  requireStaffPermission("staff_can_cancel_bookings", "cancel whole lounge bookings"),
  groupBookingController.cancel,
);

export default router;

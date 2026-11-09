import { Router } from "express";
import rateLimit from "express-rate-limit";
import { z } from "zod";
import { bookingController } from "../controllers/booking.controller.js";
import { authenticate } from "../middleware/authenticate.js";
import { requireRole, requireStaffPermission } from "../middleware/authorize.js";
import { validateBody } from "../middleware/validateRequest.js";

const router = Router();

const publicBookingLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: { code: "RATE_LIMIT", message: "Too many booking requests. Please try again shortly." } },
});

const createBookingSchema = z
  .object({
    customer_name: z.string().min(2, "Customer name must be at least 2 characters.").max(80),
    customer_phone: z.string().min(10, "Valid mobile number is required.").max(18),
    console_id: z.string().uuid().optional(),
    console_type: z.string().min(2).optional(),
    booking_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be YYYY-MM-DD."),
    start_time: z.string().regex(/^\d{2}:\d{2}(:\d{2})?$/, "Start time must be HH:MM."),
    duration: z.number().int().min(30).max(720),
    game_title: z.string().max(120).optional().nullable(),
    players: z.number().int().min(1).max(8).optional(),
    notes: z.string().max(400).optional().nullable(),
  })
  .refine((data) => Boolean(data.console_id || data.console_type), {
    message: "Please specify console_id or console_type.",
  });

const statusSchema = z.object({
  booking_status: z.enum(["pending", "confirmed", "active", "completed", "cancelled"]),
});

const rescheduleSchema = z.object({
  console_id: z.string().optional(),
  booking_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  start_time: z.string().regex(/^\d{2}:\d{2}(:\d{2})?$/).optional(),
  duration: z.number().int().min(30).max(720).optional(),
});

// Public booking submission (no customer account required)
router.post("/", publicBookingLimiter, validateBody(createBookingSchema), bookingController.create);

// Staff & Admin read/manage bookings
router.get("/", authenticate, requireRole("admin", "staff"), bookingController.list);
router.get("/:id", authenticate, requireRole("admin", "staff"), bookingController.getById);
router.put("/:id", authenticate, requireRole("admin"), validateBody(rescheduleSchema), bookingController.reschedule);
router.patch("/:id/status", authenticate, requireRole("admin", "staff"), validateBody(statusSchema), bookingController.updateStatus);
router.delete(
  "/:id",
  authenticate,
  requireRole("admin", "staff"),
  requireStaffPermission("staff_can_cancel_bookings", "cancel bookings"),
  bookingController.remove,
);

export default router;

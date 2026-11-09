import { Router } from "express";
import rateLimit from "express-rate-limit";
import { z } from "zod";
import { tournamentController } from "../controllers/tournament.controller.js";
import { authenticate } from "../middleware/authenticate.js";
import { requireRole, requireStaffPermission } from "../middleware/authorize.js";
import { validateBody } from "../middleware/validateRequest.js";

const router = Router();

const regLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 25,
  standardHeaders: true,
  legacyHeaders: false,
});

const tournamentSchema = z.object({
  title: z.string().min(2).max(120),
  game_name: z.string().min(2).max(80),
  description: z.string().max(1000).optional().default(""),
  tournament_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  start_time: z.string().regex(/^\d{2}:\d{2}(:\d{2})?$/),
  registration_deadline: z.string().min(10),
  entry_fee: z.number().min(0),
  max_participants: z.number().int().min(2).max(512),
  format: z.string().min(2).max(80).default("Knockout bracket"),
  rules: z.string().max(2000).optional().default(""),
  status: z.enum(["upcoming", "registration_open", "registration_closed", "ongoing", "completed", "cancelled"]).optional(),
  is_published: z.boolean().optional(),
  winner_name: z.string().max(100).nullable().optional(),
  runner_up_name: z.string().max(100).nullable().optional(),
  results_notes: z.string().max(500).nullable().optional(),
  cover_image_url: z.string().url().nullable().optional(),
  cover_image_path: z.string().max(300).nullable().optional(),
  cover_fallback_text: z.string().max(300).optional().default(""),
});

const statusSchema = z.object({
  status: z.enum(["upcoming", "registration_open", "registration_closed", "ongoing", "completed", "cancelled"]),
});

const registerSchema = z.object({
  participant_name: z.string().min(2).max(80),
  phone: z.string().min(10).max(18),
  gamer_tag: z.string().max(60).optional().nullable(),
  notes: z.string().max(300).optional().nullable(),
});

const updateRegSchema = z.object({
  registration_status: z.enum(["pending", "approved", "rejected", "cancelled"]).optional(),
  payment_status: z.enum(["pending", "paid", "failed", "refunded"]).optional(),
  notes: z.string().max(300).nullable().optional(),
});

// Public tournament endpoints
router.get("/tournaments", tournamentController.listPublic);
router.get("/tournaments/:id", tournamentController.getById);
router.post("/tournaments/:id/register", regLimiter, validateBody(registerSchema), tournamentController.register);

// Staff & Admin tournament schedule and participant verification
router.get("/tournaments/:id/registrations", authenticate, requireRole("admin", "staff"), tournamentController.listRegistrations);

// Admin (or staff with explicit permission) tournament management
router.get("/admin/tournaments", authenticate, requireRole("admin", "staff"), tournamentController.listAll);
router.post(
  "/admin/tournaments",
  authenticate,
  requireRole("admin", "staff"),
  requireStaffPermission("staff_can_manage_tournaments", "create tournaments"),
  validateBody(tournamentSchema),
  tournamentController.create,
);
router.put(
  "/admin/tournaments/:id",
  authenticate,
  requireRole("admin", "staff"),
  requireStaffPermission("staff_can_manage_tournaments", "modify tournaments"),
  validateBody(tournamentSchema.partial()),
  tournamentController.update,
);
router.patch(
  "/admin/tournaments/:id/status",
  authenticate,
  requireRole("admin", "staff"),
  requireStaffPermission("staff_can_manage_tournaments", "update tournament status"),
  validateBody(statusSchema),
  tournamentController.updateStatus,
);
router.delete(
  "/admin/tournaments/:id",
  authenticate,
  requireRole("admin"),
  tournamentController.remove,
);

router.get("/admin/tournaments/:id/registrations", authenticate, requireRole("admin", "staff"), tournamentController.listRegistrations);
router.get(
  "/admin/tournaments/:id/registrations/export",
  authenticate,
  requireRole("admin"),
  tournamentController.exportRegistrations,
);
router.patch(
  "/admin/tournaments/:id/registrations/:regId",
  authenticate,
  requireRole("admin", "staff"),
  validateBody(updateRegSchema),
  tournamentController.updateRegistration,
);

export default router;

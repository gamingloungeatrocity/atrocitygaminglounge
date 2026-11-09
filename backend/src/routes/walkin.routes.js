import { Router } from "express";
import { z } from "zod";
import { walkinController } from "../controllers/walkin.controller.js";
import { authenticate } from "../middleware/authenticate.js";
import { requireRole } from "../middleware/authorize.js";
import { validateBody } from "../middleware/validateRequest.js";

const router = Router();

const createWalkinSchema = z
  .object({
    customer_name: z.string().min(2).max(80),
    customer_phone: z.string().min(10).max(18),
    console_id: z.string().uuid().optional(),
    console_type: z.string().min(2).optional(),
    duration_minutes: z.number().int().min(30).max(720),
    start_time: z.string().optional(),
    payment_method: z.enum(["cash", "upi"]),
    amount_collected: z.number().min(0).optional(),
    notes: z.string().max(400).optional().nullable(),
  })
  .refine((data) => Boolean(data.console_id || data.console_type), {
    message: "Please select a console.",
  });

router.use(authenticate, requireRole("admin", "staff"));

router.get("/", walkinController.list);
router.get("/active", walkinController.listActive);
router.post("/", validateBody(createWalkinSchema), walkinController.create);
router.patch("/:id/complete", walkinController.complete);

export default router;

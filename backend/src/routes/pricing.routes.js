import { Router } from "express";
import { z } from "zod";
import { pricingController } from "../controllers/pricing.controller.js";
import { authenticate } from "../middleware/authenticate.js";
import { requireRole } from "../middleware/authorize.js";
import { validateBody } from "../middleware/validateRequest.js";

const router = Router();

const upsertSchema = z.object({
  id: z.string().uuid().optional(),
  category: z.enum(["ps4", "ps4pro", "whole_lounge", "tournament"]),
  label: z.string().min(2).max(100),
  duration_minutes: z.number().int().min(0).max(1440),
  bonus_minutes: z.number().int().min(0).max(240).default(0),
  price: z.number().min(0),
  is_active: z.boolean().default(true),
  sort_order: z.number().int().min(0).default(0),
});

router.get("/pricing", pricingController.listPublic);

router.get("/admin/pricing", authenticate, requireRole("admin"), pricingController.listAdmin);
router.put("/admin/pricing", authenticate, requireRole("admin"), validateBody(upsertSchema), pricingController.upsert);
router.post("/admin/pricing", authenticate, requireRole("admin"), validateBody(upsertSchema), pricingController.upsert);
router.delete("/admin/pricing/:id", authenticate, requireRole("admin"), pricingController.remove);

export default router;

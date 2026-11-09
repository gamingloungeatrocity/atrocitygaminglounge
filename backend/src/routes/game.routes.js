import { Router } from "express";
import multer from "multer";
import { z } from "zod";
import { gameController } from "../controllers/game.controller.js";
import { authenticate } from "../middleware/authenticate.js";
import { requireRole } from "../middleware/authorize.js";
import { validateBody } from "../middleware/validateRequest.js";

const router = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 7 * 1024 * 1024 } });
const gameSchema = z.object({
  title: z.string().min(2).max(120),
  studio: z.string().max(100).default(""),
  tag: z.string().max(60).default("Premium Title"),
  genres: z.array(z.string().min(1).max(40)).max(10).default([]),
  modes: z.array(z.string().min(1).max(40)).max(10).default([]),
  blurb: z.string().max(500).default(""),
  cover_image_url: z.string().url().nullable().optional(),
  cover_image_path: z.string().max(300).nullable().optional(),
  is_published: z.boolean().default(true),
  sort_order: z.number().int().min(0).default(0),
});

router.get("/games", gameController.listPublic);
router.get("/admin/games", authenticate, requireRole("admin"), gameController.listAdmin);
router.post("/admin/media/upload", authenticate, requireRole("admin"), upload.single("file"), gameController.upload);
router.post("/admin/games", authenticate, requireRole("admin"), validateBody(gameSchema), gameController.create);
router.put("/admin/games/:id", authenticate, requireRole("admin"), validateBody(gameSchema.partial()), gameController.update);
router.delete("/admin/games/:id", authenticate, requireRole("admin"), gameController.remove);

export default router;

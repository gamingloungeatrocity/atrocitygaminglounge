import { Router } from "express";
import rateLimit from "express-rate-limit";
import { z } from "zod";
import { paymentController } from "../controllers/payment.controller.js";
import { authenticate } from "../middleware/authenticate.js";
import { requireRole } from "../middleware/authorize.js";
import { validateBody } from "../middleware/validateRequest.js";

const router = Router();

const onlinePaymentLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
});

const cashfreeOrderSchema = z.object({
  booking_type: z.enum(["console", "group", "tournament"]),
  record_id: z.string().uuid(),
  reference: z.string().min(3).max(40),
  customer_phone: z.string().min(10).max(18),
});

const cashfreeVerifySchema = z.object({
  order_id: z.string().min(3),
  reference: z.string().min(3).max(40),
  customer_phone: z.string().min(10).max(18),
});

const offlineSchema = z.object({
  booking_type: z.enum(["console", "group", "tournament"]),
  record_id: z.string().uuid(),
  payment_method: z.enum(["cash", "upi"]),
  amount: z.number().min(0).optional(),
});

const statusSchema = z.object({
  payment_status: z.enum(["pending", "paid", "failed", "refunded"]),
});

// Public online Cashfree initiation, backend verification & webhook
router.post("/payments/cashfree/order", onlinePaymentLimiter, validateBody(cashfreeOrderSchema), paymentController.createCashfreeOrder);
router.post("/payments/cashfree/verify", onlinePaymentLimiter, validateBody(cashfreeVerifySchema), paymentController.verifyCashfreeOrder);
router.post("/payments/cashfree/webhook", paymentController.handleCashfreeWebhook);

// Staff & Admin offline cash/UPI payment recording
router.post("/payments/offline", authenticate, requireRole("admin", "staff"), validateBody(offlineSchema), paymentController.recordOffline);

// Admin payments ledger & status override
router.get("/admin/payments", authenticate, requireRole("admin"), paymentController.list);
router.patch("/admin/payments/:id/status", authenticate, requireRole("admin"), validateBody(statusSchema), paymentController.updateStatus);

export default router;

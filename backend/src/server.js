import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import cors from "cors";
import express from "express";
import rateLimit from "express-rate-limit";
import helmet from "helmet";
import { env, isCashfreeConfigured, isSupabaseConfigured } from "./config/supabase.js";
import { errorHandler, notFoundHandler } from "./middleware/errorHandler.js";
import authRoutes from "./routes/auth.routes.js";
import bookingRoutes from "./routes/booking.routes.js";
import consoleRoutes from "./routes/console.routes.js";
import dashboardRoutes from "./routes/dashboard.routes.js";
import groupBookingRoutes from "./routes/groupBooking.routes.js";
import gameRoutes from "./routes/game.routes.js";
import paymentRoutes from "./routes/payment.routes.js";
import pricingRoutes from "./routes/pricing.routes.js";
import staffRoutes from "./routes/staff.routes.js";
import tournamentRoutes from "./routes/tournament.routes.js";
import walkinRoutes from "./routes/walkin.routes.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export function createApp() {
  const app = express();

  app.set("trust proxy", 1);

  app.use(
    helmet({
      contentSecurityPolicy: false, // Allows Vite single-file inline scripts/styles when serving dist
      crossOriginEmbedderPolicy: false,
    }),
  );

  const allowedOrigins = new Set(
    [env.frontendUrl, "http://localhost:5173", "http://localhost:4173", "http://127.0.0.1:5173"]
      .flatMap((o) => String(o || "").split(","))
      .map((s) => s.trim())
      .filter(Boolean),
  );

  app.use(
    cors({
      origin(origin, callback) {
        if (!origin || allowedOrigins.has(origin) || env.nodeEnv !== "production") {
          return callback(null, true);
        }
        return callback(new Error("Origin not allowed by CORS"));
      },
      credentials: true,
    }),
  );

  app.use(
    express.json({
      limit: "1mb",
      verify: (req, _res, buf) => {
        req.rawBody = buf.toString("utf8");
      },
    }),
  );

  // General API rate limit
  app.use(
    "/api",
    rateLimit({
      windowMs: 15 * 60 * 1000,
      max: 600,
      standardHeaders: true,
      legacyHeaders: false,
    }),
  );

  // Health check
  app.get("/api/health", (_req, res) => {
    res.json({
      success: true,
      service: "Atrocity Gaming Lounge API",
      supabaseConfigured: isSupabaseConfigured(),
      cashfreeConfigured: isCashfreeConfigured(),
      timestamp: new Date().toISOString(),
    });
  });

  app.get("/api/keepalive", async (req, res, next) => {
      if (!env.keepaliveToken || req.get("x-keepalive-token") !== env.keepaliveToken) {
        return res.status(401).json({ success: false, error: { code: "UNAUTHORIZED", message: "Invalid keep-alive token." } });
      }
      try {
        const { getSupabaseAdmin } = await import("./config/supabase.js");
        const supabase = getSupabaseAdmin();
        const results = await Promise.all([
          supabase.from("games").select("id").limit(1),
          supabase.from("pricing").select("id").limit(1),
          supabase.from("tournaments").select("id").limit(1),
        ]);
        const failed = results.find(({ error }) => error);
        if (failed?.error) throw failed.error;
        return res.json({ success: true, data: { operations: results.length, timestamp: new Date().toISOString() } });
      } catch (err) {
        return next(err);
      }
  });

  // Mount API routes
  app.use("/api/auth", authRoutes);
  app.use("/api", dashboardRoutes);
  app.use("/api", consoleRoutes);
  app.use("/api/bookings", bookingRoutes);
  app.use("/api/group-bookings", groupBookingRoutes);
  app.use("/api", gameRoutes);
  app.use("/api/walkins", walkinRoutes);
  app.use("/api", tournamentRoutes);
  app.use("/api", paymentRoutes);
  app.use("/api", pricingRoutes);
  app.use("/api/admin/staff", staffRoutes);

  // 404 for unknown API routes
  app.use("/api", notFoundHandler);

  // Serve the SPA shell for browser routes (including unknown routes, which
  // the client renders with its 404 page).  Do not return HTML for a missing
  // static file: requests with an extension fall through to the normal 404.
  const distDir = path.resolve(__dirname, "../../dist");
  const distIndex = path.join(distDir, "index.html");
  if (fs.existsSync(distIndex)) {
    app.use(express.static(distDir));
    app.get(/.*/, (req, res, next) => {
      if (path.extname(req.path)) return next();
      res.sendFile(distIndex);
    });
  }

  app.use(errorHandler);
  return app;
}

const isDirectRun = process.argv[1] && path.resolve(process.argv[1]) === __filename;
if (isDirectRun) {
  const app = createApp();
  app.listen(env.port, () => {
    console.log(`Atrocity Gaming Lounge backend running on http://localhost:${env.port}`);
    if (!isSupabaseConfigured()) {
      console.warn(
        "[WARN] Supabase environment variables are not set in backend/.env. Copy backend/.env.example and set SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, SUPABASE_SECRET_KEY.",
      );
    }
  });
}

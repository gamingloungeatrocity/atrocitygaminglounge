import { env } from "../config/supabase.js";
import { ApiError, mapDatabaseError } from "../utils/errors.js";

export function notFoundHandler(req, _res, next) {
  next(new ApiError(404, "ROUTE_NOT_FOUND", `Endpoint not found: ${req.method} ${req.originalUrl}`));
}

export function errorHandler(err, _req, res, _next) {
  if (err?.code === "LIMIT_FILE_SIZE") {
    return res.status(413).json({
      success: false,
      error: {
        code: "IMAGE_TOO_LARGE",
        message: "Cover images must be 10 MB or smaller.",
      },
    });
  }
  const mapped = err instanceof ApiError ? err : mapDatabaseError(err);
  if (mapped) {
    return res.status(mapped.statusCode).json({
      success: false,
      error: {
        code: mapped.code,
        message: mapped.message,
        ...(mapped.details ? { details: mapped.details } : {}),
      },
    });
  }

  console.error("[unhandled_error]", err);
  const status = err.statusCode || err.status || 500;
  return res.status(status).json({
    success: false,
    error: {
      code: "INTERNAL_ERROR",
      message: env.nodeEnv === "production" ? "An unexpected server error occurred." : err.message || "Internal server error",
    },
  });
}

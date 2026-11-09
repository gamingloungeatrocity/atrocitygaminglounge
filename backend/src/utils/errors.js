import crypto from "node:crypto";

export class ApiError extends Error {
  constructor(statusCode, code, message, details = null) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
  }
}

export function generateCode(prefix) {
  return `${prefix}-${crypto.randomBytes(3).toString("hex").toUpperCase()}`;
}

export function mapDatabaseError(err) {
  if (!err) return null;
  // PostgreSQL exclusion constraint violation (conflict)
  if (err.code === "23P01") {
    return new ApiError(409, "BOOKING_CONFLICT", "This console or lounge slot overlaps an existing booking or active session.");
  }
  // Unique constraint violation
  if (err.code === "23505") {
    return new ApiError(409, "DUPLICATE_RECORD", err.details || err.message || "A matching record already exists.");
  }
  // Foreign key / check violation
  if (err.code === "23503" || err.code === "23514") {
    return new ApiError(400, "INVALID_REFERENCE", err.message || "Invalid reference or field constraint.");
  }
  // Custom raised PL/pgSQL business validation errors
  if (err.code === "P0001") {
    return new ApiError(400, "BUSINESS_RULE_VIOLATION", err.message);
  }
  if (err.code === "P0002") {
    return new ApiError(404, "NOT_FOUND", err.message);
  }
  return null;
}

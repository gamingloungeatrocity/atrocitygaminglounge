import { ApiError } from "../utils/errors.js";

export function validateBody(schema) {
  return function validateRequestBody(req, _res, next) {
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
      return next(
        new ApiError(
          400,
          "VALIDATION_ERROR",
          parsed.error.issues[0]?.message || "Invalid request payload.",
          parsed.error.issues.map((i) => ({ path: i.path.join("."), message: i.message })),
        ),
      );
    }
    req.validatedBody = parsed.data;
    return next();
  };
}

export function validateQuery(schema) {
  return function validateRequestQuery(req, _res, next) {
    const parsed = schema.safeParse(req.query);
    if (!parsed.success) {
      return next(
        new ApiError(
          400,
          "VALIDATION_ERROR",
          parsed.error.issues[0]?.message || "Invalid query parameters.",
          parsed.error.issues.map((i) => ({ path: i.path.join("."), message: i.message })),
        ),
      );
    }
    req.validatedQuery = parsed.data;
    return next();
  };
}

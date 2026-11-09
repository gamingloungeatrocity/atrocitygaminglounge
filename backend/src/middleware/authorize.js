import { ApiError } from "../utils/errors.js";

/**
 * Role-based authorization middleware.
 * Example:
 *  - requireRole("admin") -> denies staff (403)
 *  - requireRole("admin", "staff") -> permits both admin and staff
 */
export function requireRole(...allowedRoles) {
  return function authorizeRole(req, _res, next) {
    const profile = req.staffProfile;
    if (!profile || !profile.is_active) {
      return next(new ApiError(401, "AUTH_REQUIRED", "Valid authenticated staff session required."));
    }
    if (!allowedRoles.includes(profile.role)) {
      return next(
        new ApiError(
          403,
          "FORBIDDEN",
          `Access denied: ${allowedRoles.join(" or ")} privileges required.`,
        ),
      );
    }
    return next();
  };
}

/**
 * Checks configurable admin-delegated permissions for staff users.
 * Admin users always pass; staff users pass only if `lounge_settings[settingKey]` is true.
 */
export function requireStaffPermission(settingKey, actionLabel = "perform this action") {
  return function authorizePermission(req, _res, next) {
    const profile = req.staffProfile;
    if (!profile || !profile.is_active) {
      return next(new ApiError(401, "AUTH_REQUIRED", "Authentication required."));
    }
    if (profile.role === "admin") {
      return next();
    }
    const settings = req.loungeSettings || {};
    if (!settings[settingKey]) {
      return next(
        new ApiError(
          403,
          "PERMISSION_DISABLED",
          `Staff are not authorized to ${actionLabel}. Please ask an administrator.`,
        ),
      );
    }
    return next();
  };
}

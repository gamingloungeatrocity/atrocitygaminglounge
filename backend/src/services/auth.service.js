import { getSupabaseAdmin, getSupabaseAuth } from "../config/supabase.js";
import { settingsRepository } from "../repositories/settings.repository.js";
import { staffRepository } from "../repositories/staff.repository.js";
import { recordAuditLog } from "../utils/audit.js";
import { ApiError } from "../utils/errors.js";

export const authService = {
  async login({ email, password, portal, ipAddress }) {
    const supabaseAuth = getSupabaseAuth();
    const { data, error } = await supabaseAuth.auth.signInWithPassword({ email: email.trim().toLowerCase(), password });

    if (error || !data?.user || !data?.session) {
      throw new ApiError(401, "INVALID_CREDENTIALS", "Invalid email or password.");
    }

    const profile = await staffRepository.findByAuthUserId(data.user.id);
    if (!profile) {
      throw new ApiError(403, "NO_STAFF_PROFILE", "This account does not have dashboard access.");
    }
    if (!profile.is_active) {
      throw new ApiError(403, "ACCOUNT_DEACTIVATED", "Your account has been deactivated. Contact an administrator.");
    }

    if (portal === "admin" && profile.role !== "admin") {
      throw new ApiError(403, "ADMIN_ONLY", "Access denied. Only administrators can access the Admin Dashboard.");
    }

    const settings = await settingsRepository.get();

    await recordAuditLog({
      actorId: profile.id,
      actorEmail: profile.email,
      actorRole: profile.role,
      action: "LOGIN",
      entityType: "auth",
      entityId: profile.id,
      details: { portal: portal || profile.role },
      ipAddress,
    });

    return {
      access_token: data.session.access_token,
      refresh_token: data.session.refresh_token,
      expires_at: data.session.expires_at,
      user: {
        id: data.user.id,
        email: data.user.email,
      },
      profile,
      permissions: buildEffectivePermissions(profile, settings),
    };
  },

  async logout({ token, profile, ipAddress }) {
    if (token) {
      try {
        await getSupabaseAdmin().auth.admin.signOut(token);
      } catch {
        // Token may already be expired; proceed cleanly
      }
    }
    if (profile) {
      await recordAuditLog({
        actorId: profile.id,
        actorEmail: profile.email,
        actorRole: profile.role,
        action: "LOGOUT",
        entityType: "auth",
        entityId: profile.id,
        ipAddress,
      });
    }
    return { loggedOut: true };
  },

  async me({ user, profile, settings }) {
    return {
      user: { id: user.id, email: user.email },
      profile,
      permissions: buildEffectivePermissions(profile, settings),
    };
  },
};

export function buildEffectivePermissions(profile, settings = {}) {
  const isAdmin = profile.role === "admin";
  return {
    canAccessAdmin: isAdmin,
    canAccessStaff: isAdmin || profile.role === "staff",
    canApproveGroupBookings: isAdmin || Boolean(settings.staff_can_approve_group_bookings),
    canCancelBookings: isAdmin || Boolean(settings.staff_can_cancel_bookings),
    canUpdateConsoleStatus: isAdmin || Boolean(settings.staff_can_update_console_status),
    canManageTournaments: isAdmin || Boolean(settings.staff_can_manage_tournaments),
    canManagePricing: isAdmin,
    canManageStaff: isAdmin,
    canModifySettings: isAdmin,
  };
}

import { getSupabaseAdmin } from "../config/supabase.js";
import { staffRepository } from "../repositories/staff.repository.js";
import { recordAuditLog } from "../utils/audit.js";
import { ApiError } from "../utils/errors.js";

export const staffService = {
  async list() {
    return staffRepository.findAll();
  },

  async createStaff({ full_name, email, phone, password, role = "staff" }, actor, ipAddress) {
    const supabase = getSupabaseAdmin();
    const cleanEmail = email.trim().toLowerCase();

    const { data: authData, error: authErr } = await supabase.auth.admin.createUser({
      email: cleanEmail,
      password,
      email_confirm: true,
      user_metadata: { full_name: full_name.trim(), role },
    });

    if (authErr || !authData?.user) {
      throw new ApiError(400, "AUTH_CREATE_FAILED", authErr?.message || "Failed to create Supabase Auth user.");
    }

    try {
      const profile = await staffRepository.create({
        auth_user_id: authData.user.id,
        full_name: full_name.trim(),
        email: cleanEmail,
        phone: phone?.trim() || null,
        role,
        is_active: true,
      });

      await recordAuditLog({
        actorId: actor.id,
        actorEmail: actor.email,
        actorRole: actor.role,
        action: "CREATE_STAFF",
        entityType: "staff_profile",
        entityId: profile.id,
        details: { email: cleanEmail, role },
        ipAddress,
      });

      return profile;
    } catch (err) {
      // Roll back Auth user if staff_profiles insertion fails
      await supabase.auth.admin.deleteUser(authData.user.id).catch(() => {});
      throw err;
    }
  },

  async updateStaff(id, patch, actor, ipAddress) {
    const existing = await staffRepository.findById(id);
    if (!existing) throw new ApiError(404, "NOT_FOUND", "Staff member not found.");

    if (existing.id === actor.id && patch.role && patch.role !== "admin") {
      throw new ApiError(400, "SELF_DEMOTE_BLOCKED", "You cannot remove your own admin role.");
    }

    const updated = await staffRepository.update(id, {
      ...(patch.full_name ? { full_name: patch.full_name.trim() } : {}),
      ...(patch.phone !== undefined ? { phone: patch.phone?.trim() || null } : {}),
      ...(patch.role ? { role: patch.role } : {}),
    });

    await recordAuditLog({
      actorId: actor.id,
      actorEmail: actor.email,
      actorRole: actor.role,
      action: "UPDATE_STAFF",
      entityType: "staff_profile",
      entityId: id,
      details: patch,
      ipAddress,
    });

    return updated;
  },

  async toggleStatus(id, isActive, actor, ipAddress) {
    const existing = await staffRepository.findById(id);
    if (!existing) throw new ApiError(404, "NOT_FOUND", "Staff member not found.");

    if (existing.id === actor.id && !isActive) {
      throw new ApiError(400, "SELF_DEACTIVATE_BLOCKED", "You cannot deactivate your own admin account.");
    }

    const supabase = getSupabaseAdmin();
    // Enforce deactivation in Supabase Auth as well (bans/unbans user)
    await supabase.auth.admin.updateUserById(existing.auth_user_id, {
      ban_duration: isActive ? "none" : "876000h",
    });

    const updated = await staffRepository.update(id, { is_active: Boolean(isActive) });

    await recordAuditLog({
      actorId: actor.id,
      actorEmail: actor.email,
      actorRole: actor.role,
      action: isActive ? "ACTIVATE_STAFF" : "DEACTIVATE_STAFF",
      entityType: "staff_profile",
      entityId: id,
      details: { email: existing.email, is_active: isActive },
      ipAddress,
    });

    return updated;
  },

  async resetCredentials(id, { newPassword }, actor, ipAddress) {
    const existing = await staffRepository.findById(id);
    if (!existing) throw new ApiError(404, "NOT_FOUND", "Staff member not found.");

    const supabase = getSupabaseAdmin();
    if (newPassword) {
      const { error } = await supabase.auth.admin.updateUserById(existing.auth_user_id, {
        password: newPassword,
      });
      if (error) throw new ApiError(400, "PASSWORD_RESET_FAILED", error.message);

      await recordAuditLog({
        actorId: actor.id,
        actorEmail: actor.email,
        actorRole: actor.role,
        action: "RESET_STAFF_PASSWORD",
        entityType: "staff_profile",
        entityId: id,
        details: { method: "admin_set_temporary_password", target_email: existing.email },
        ipAddress,
      });
      return { reset: true, method: "password_updated" };
    }

    const { data, error } = await supabase.auth.admin.generateLink({
      type: "recovery",
      email: existing.email,
    });
    if (error) throw new ApiError(400, "RECOVERY_LINK_FAILED", error.message);

    await recordAuditLog({
      actorId: actor.id,
      actorEmail: actor.email,
      actorRole: actor.role,
      action: "GENERATE_STAFF_RECOVERY_LINK",
      entityType: "staff_profile",
      entityId: id,
      details: { method: "recovery_link", target_email: existing.email },
      ipAddress,
    });

    return { reset: true, method: "recovery_link", recoveryLink: data?.properties?.action_link || null };
  },

  async getActivity(staffId) {
    return staffRepository.findActivity(staffId === "all" ? null : staffId, 100);
  },
};

import { getSupabaseAdmin } from "../config/supabase.js";

export async function recordAuditLog({
  actorId = null,
  actorEmail = null,
  actorRole = null,
  action,
  entityType,
  entityId = null,
  details = {},
  ipAddress = null,
}) {
  try {
    const supabase = getSupabaseAdmin();
    await supabase.from("audit_logs").insert({
      actor_id: actorId,
      actor_email: actorEmail,
      actor_role: actorRole,
      action,
      entity_type: entityType,
      entity_id: entityId ? String(entityId) : null,
      details,
      ip_address: ipAddress,
    });
  } catch (err) {
    console.error("[audit_log_error]", err?.message || err);
  }
}

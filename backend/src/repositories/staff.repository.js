import { getSupabaseAdmin } from "../config/supabase.js";

export const staffRepository = {
  async findAll() {
    const { data, error } = await getSupabaseAdmin()
      .from("staff_profiles")
      .select("*")
      .order("role", { ascending: true })
      .order("created_at", { ascending: false });
    if (error) throw error;
    return data || [];
  },

  async findById(id) {
    const { data, error } = await getSupabaseAdmin()
      .from("staff_profiles")
      .select("*")
      .eq("id", id)
      .maybeSingle();
    if (error) throw error;
    return data;
  },

  async findByAuthUserId(authUserId) {
    const { data, error } = await getSupabaseAdmin()
      .from("staff_profiles")
      .select("*")
      .eq("auth_user_id", authUserId)
      .maybeSingle();
    if (error) throw error;
    return data;
  },

  async create(payload) {
    const { data, error } = await getSupabaseAdmin()
      .from("staff_profiles")
      .insert(payload)
      .select("*")
      .single();
    if (error) throw error;
    return data;
  },

  async update(id, patch) {
    const { data, error } = await getSupabaseAdmin()
      .from("staff_profiles")
      .update(patch)
      .eq("id", id)
      .select("*")
      .maybeSingle();
    if (error) throw error;
    return data;
  },

  async findActivity(staffId, limit = 50) {
    let query = getSupabaseAdmin()
      .from("audit_logs")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(limit);
    if (staffId) query = query.eq("actor_id", staffId);
    const { data, error } = await query;
    if (error) throw error;
    return data || [];
  },
};

import { getSupabaseAdmin } from "../config/supabase.js";

export const walkinRepository = {
  async createAtomic(params) {
    const { data, error } = await getSupabaseAdmin().rpc("create_walkin_session_atomic", params);
    if (error) throw error;
    return data;
  },

  async completeAtomic(walkinId) {
    const { data, error } = await getSupabaseAdmin().rpc("complete_walkin_session_atomic", {
      p_walkin_id: walkinId,
    });
    if (error) throw error;
    return data;
  },

  async findAll({ status, consoleId, date } = {}) {
    let query = getSupabaseAdmin()
      .from("walkin_sessions")
      .select("*, consoles(id, name, console_type, slug), staff:staff_profiles(id, full_name)")
      .order("start_time", { ascending: false });

    if (status) query = query.eq("session_status", status);
    if (consoleId) query = query.eq("console_id", consoleId);
    if (date) {
      query = query
        .gte("start_time", `${date}T00:00:00+05:30`)
        .lte("start_time", `${date}T23:59:59+05:30`);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data || [];
  },

  async findActive() {
    const { data, error } = await getSupabaseAdmin()
      .from("walkin_sessions")
      .select("*, consoles(id, name, console_type, slug), staff:staff_profiles(id, full_name)")
      .eq("session_status", "active")
      .order("expected_end_time", { ascending: true });
    if (error) throw error;
    return data || [];
  },

  async findById(id) {
    const { data, error } = await getSupabaseAdmin()
      .from("walkin_sessions")
      .select("*, consoles(id, name, console_type)")
      .eq("id", id)
      .maybeSingle();
    if (error) throw error;
    return data;
  },
};

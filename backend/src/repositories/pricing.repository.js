import { getSupabaseAdmin } from "../config/supabase.js";

export const pricingRepository = {
  async findAll({ activeOnly = false } = {}) {
    let query = getSupabaseAdmin()
      .from("pricing")
      .select("*")
      .order("category", { ascending: true })
      .order("sort_order", { ascending: true })
      .order("duration_minutes", { ascending: true });
    if (activeOnly) query = query.eq("is_active", true);
    const { data, error } = await query;
    if (error) throw error;
    return data || [];
  },

  async findByCategoryAndDuration(category, durationMinutes) {
    const { data, error } = await getSupabaseAdmin()
      .from("pricing")
      .select("*")
      .eq("category", category)
      .eq("duration_minutes", durationMinutes)
      .eq("is_active", true)
      .maybeSingle();
    if (error) throw error;
    return data;
  },

  async findById(id) {
    const { data, error } = await getSupabaseAdmin()
      .from("pricing")
      .select("*")
      .eq("id", id)
      .maybeSingle();
    if (error) throw error;
    return data;
  },

  async upsert(payload) {
    if (payload.id) {
      const { id, ...rest } = payload;
      const { data, error } = await getSupabaseAdmin()
        .from("pricing")
        .update(rest)
        .eq("id", id)
        .select("*")
        .single();
      if (error) throw error;
      return data;
    }
    const { data, error } = await getSupabaseAdmin()
      .from("pricing")
      .insert(payload)
      .select("*")
      .single();
    if (error) throw error;
    return data;
  },

  async remove(id) {
    const { error } = await getSupabaseAdmin().from("pricing").delete().eq("id", id);
    if (error) throw error;
  },
};

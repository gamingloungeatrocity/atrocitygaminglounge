import { getSupabaseAdmin } from "../config/supabase.js";

export const gameRepository = {
  async findAll({ publishedOnly = false } = {}) {
    let query = getSupabaseAdmin().from("games").select("*").order("sort_order").order("title");
    if (publishedOnly) query = query.eq("is_published", true);
    const { data, error } = await query;
    if (error) throw error;
    return data || [];
  },

  async findById(id) {
    const { data, error } = await getSupabaseAdmin().from("games").select("*").eq("id", id).maybeSingle();
    if (error) throw error;
    return data;
  },

  async create(payload) {
    const { data, error } = await getSupabaseAdmin().from("games").insert(payload).select("*").single();
    if (error) throw error;
    return data;
  },

  async update(id, payload) {
    const { data, error } = await getSupabaseAdmin().from("games").update(payload).eq("id", id).select("*").maybeSingle();
    if (error) throw error;
    return data;
  },

  async remove(id) {
    const { error } = await getSupabaseAdmin().from("games").delete().eq("id", id);
    if (error) throw error;
  },
};

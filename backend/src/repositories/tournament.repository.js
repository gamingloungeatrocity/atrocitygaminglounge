import { getSupabaseAdmin } from "../config/supabase.js";

export const tournamentRepository = {
  async findAll({ publishedOnly = false, status } = {}) {
    let query = getSupabaseAdmin()
      .from("tournaments")
      .select("*, tournament_registrations(id, registration_status)")
      .order("tournament_date", { ascending: true });
    if (publishedOnly) query = query.eq("is_published", true);
    if (status) query = query.eq("status", status);
    const { data, error } = await query;
    if (error) throw error;
    return (data || []).map((t) => {
      const activeRegs = (t.tournament_registrations || []).filter((r) =>
        ["pending", "approved"].includes(r.registration_status),
      );
      const { tournament_registrations: _omit, ...rest } = t;
      return { ...rest, registration_count: activeRegs.length };
    });
  },

  async findById(id) {
    const { data, error } = await getSupabaseAdmin()
      .from("tournaments")
      .select("*, tournament_registrations(id, registration_status)")
      .eq("id", id)
      .maybeSingle();
    if (error) throw error;
    if (!data) return null;
    const activeRegs = (data.tournament_registrations || []).filter((r) =>
      ["pending", "approved"].includes(r.registration_status),
    );
    const { tournament_registrations: _omit, ...rest } = data;
    return { ...rest, registration_count: activeRegs.length };
  },

  async create(payload) {
    const { data, error } = await getSupabaseAdmin()
      .from("tournaments")
      .insert(payload)
      .select("*")
      .single();
    if (error) throw error;
    return { ...data, registration_count: 0 };
  },

  async update(id, patch) {
    const { data, error } = await getSupabaseAdmin()
      .from("tournaments")
      .update(patch)
      .eq("id", id)
      .select("*")
      .maybeSingle();
    if (error) throw error;
    return data;
  },

  async remove(id) {
    const { error } = await getSupabaseAdmin().from("tournaments").delete().eq("id", id);
    if (error) throw error;
  },

  async registerAtomic(params) {
    const { data, error } = await getSupabaseAdmin().rpc("register_tournament_atomic", params);
    if (error) throw error;
    return data;
  },

  async findRegistrations(tournamentId, { search, regStatus, paymentStatus } = {}) {
    let query = getSupabaseAdmin()
      .from("tournament_registrations")
      .select("*, tournaments(id, title, game_name, entry_fee)")
      .order("registration_date", { ascending: false });

    if (tournamentId && tournamentId !== "all") query = query.eq("tournament_id", tournamentId);
    if (regStatus) query = query.eq("registration_status", regStatus);
    if (paymentStatus) query = query.eq("payment_status", paymentStatus);
    if (search) {
      const q = `%${search.trim()}%`;
      query = query.or(`participant_name.ilike.${q},phone.ilike.${q},gamer_tag.ilike.${q},registration_code.ilike.${q}`);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data || [];
  },

  async updateRegistration(regId, patch) {
    const { data, error } = await getSupabaseAdmin()
      .from("tournament_registrations")
      .update(patch)
      .eq("id", regId)
      .select("*")
      .maybeSingle();
    if (error) throw error;
    return data;
  },
};

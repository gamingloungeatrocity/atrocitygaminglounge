import { getSupabaseAdmin } from "../config/supabase.js";

export const groupBookingRepository = {
  async create(payload) {
    const { data, error } = await getSupabaseAdmin()
      .from("group_bookings")
      .insert(payload)
      .select("*")
      .single();
    if (error) throw error;
    return data;
  },

  async approveAtomic(groupBookingId, reviewerId) {
    const { data, error } = await getSupabaseAdmin().rpc("approve_group_booking_atomic", {
      p_group_booking_id: groupBookingId,
      p_reviewer_id: reviewerId,
    });
    if (error) throw error;
    return data;
  },

  async findAll({ date, status, paymentStatus, search } = {}) {
    let query = getSupabaseAdmin()
      .from("group_bookings")
      .select("*, reviewer:staff_profiles!group_bookings_reviewed_by_fkey(id, full_name)")
      .order("booking_date", { ascending: false })
      .order("start_time", { ascending: false });

    if (date) query = query.eq("booking_date", date);
    if (status) query = query.eq("booking_status", status);
    if (paymentStatus) query = query.eq("payment_status", paymentStatus);
    if (search) {
      const q = `%${search.trim()}%`;
      query = query.or(`customer_name.ilike.${q},customer_phone.ilike.${q},booking_code.ilike.${q}`);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data || [];
  },

  async findById(id) {
    const { data, error } = await getSupabaseAdmin()
      .from("group_bookings")
      .select("*")
      .eq("id", id)
      .maybeSingle();
    if (error) throw error;
    return data;
  },

  async update(id, patch) {
    const { data, error } = await getSupabaseAdmin()
      .from("group_bookings")
      .update(patch)
      .eq("id", id)
      .select("*")
      .maybeSingle();
    if (error) throw error;
    return data;
  },
};

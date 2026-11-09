import { getSupabaseAdmin } from "../config/supabase.js";

export const paymentRepository = {
  async create(payload) {
    const { data, error } = await getSupabaseAdmin()
      .from("payments")
      .insert(payload)
      .select("*")
      .single();
    if (error) throw error;
    return data;
  },

  async findByCashfreeOrderId(orderId) {
    const { data, error } = await getSupabaseAdmin()
      .from("payments")
      .select("*")
      .eq("cashfree_order_id", orderId)
      .maybeSingle();
    if (error) throw error;
    return data;
  },

  async findById(id) {
    const { data, error } = await getSupabaseAdmin()
      .from("payments")
      .select("*")
      .eq("id", id)
      .maybeSingle();
    if (error) throw error;
    return data;
  },

  async update(id, patch) {
    const { data, error } = await getSupabaseAdmin()
      .from("payments")
      .update(patch)
      .eq("id", id)
      .select("*")
      .maybeSingle();
    if (error) throw error;
    return data;
  },

  async findAll({ status, method, bookingType, fromDate, toDate } = {}) {
    let query = getSupabaseAdmin()
      .from("payments")
      .select("*, collected:staff_profiles(id, full_name)")
      .order("created_at", { ascending: false });

    if (status) query = query.eq("payment_status", status);
    if (method) query = query.eq("payment_method", method);
    if (bookingType) query = query.eq("booking_type", bookingType);
    if (fromDate) query = query.gte("created_at", `${fromDate}T00:00:00+05:30`);
    if (toDate) query = query.lte("created_at", `${toDate}T23:59:59+05:30`);

    const { data, error } = await query;
    if (error) throw error;
    return data || [];
  },
};

import { getSupabaseAdmin } from "../config/supabase.js";

export const bookingRepository = {
  async createAtomic(params) {
    const { data, error } = await getSupabaseAdmin().rpc("create_console_booking_atomic", params);
    if (error) throw error;
    return data;
  },

  async rescheduleAtomic(params) {
    const { data, error } = await getSupabaseAdmin().rpc("reschedule_booking_atomic", params);
    if (error) throw error;
    return data;
  },

  async findAll({ date, consoleId, bookingStatus, paymentStatus, source, search } = {}) {
    let query = getSupabaseAdmin()
      .from("bookings")
      .select("*, consoles(id, name, console_type, slug)")
      .order("booking_date", { ascending: false })
      .order("start_time", { ascending: false });

    if (date) query = query.eq("booking_date", date);
    if (consoleId) query = query.eq("console_id", consoleId);
    if (bookingStatus) query = query.eq("booking_status", bookingStatus);
    if (paymentStatus) query = query.eq("payment_status", paymentStatus);
    if (source) query = query.eq("booking_source", source);
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
      .from("bookings")
      .select("*, consoles(id, name, console_type, slug)")
      .eq("id", id)
      .maybeSingle();
    if (error) throw error;
    return data;
  },

  async updateStatus(id, bookingStatus) {
    const { data, error } = await getSupabaseAdmin()
      .from("bookings")
      .update({ booking_status: bookingStatus })
      .eq("id", id)
      .select("*, consoles(id, name, console_type, slug)")
      .maybeSingle();
    if (error) throw error;
    return data;
  },

  async updatePaymentStatus(id, paymentStatus) {
    const { data, error } = await getSupabaseAdmin()
      .from("bookings")
      .update({ payment_status: paymentStatus })
      .eq("id", id)
      .select("*")
      .maybeSingle();
    if (error) throw error;
    return data;
  },

  async findByDateRange(fromDate, toDate) {
    const { data, error } = await getSupabaseAdmin()
      .from("bookings")
      .select("id, console_id, booking_date, start_time, end_time, duration, total_amount, booking_source, booking_status, payment_status, consoles(console_type)")
      .gte("booking_date", fromDate)
      .lte("booking_date", toDate);
    if (error) throw error;
    return data || [];
  },
};

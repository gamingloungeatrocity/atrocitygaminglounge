import { getSupabaseAdmin } from "../config/supabase.js";

export const consoleRepository = {
  async findAll() {
    const { data, error } = await getSupabaseAdmin()
      .from("consoles")
      .select("*")
      .order("console_type", { ascending: true });
    if (error) throw error;
    return data || [];
  },

  async findById(id) {
    const { data, error } = await getSupabaseAdmin()
      .from("consoles")
      .select("*")
      .eq("id", id)
      .maybeSingle();
    if (error) throw error;
    return data;
  },

  async findByTypeOrSlug(value) {
    const supabase = getSupabaseAdmin();
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
    if (isUuid) {
      const { data, error } = await supabase.from("consoles").select("*").eq("id", value).maybeSingle();
      if (error) throw error;
      return data;
    }

    const { data, error } = await supabase
      .from("consoles")
      .select("*")
      .or(`slug.eq.${value},console_type.eq.${value}`)
      .maybeSingle();
    if (error) throw error;
    return data;
  },

  async create(payload) {
    const { data, error } = await getSupabaseAdmin()
      .from("consoles")
      .insert(payload)
      .select("*")
      .single();
    if (error) throw error;
    return data;
  },

  async update(id, patch) {
    const { data, error } = await getSupabaseAdmin()
      .from("consoles")
      .update(patch)
      .eq("id", id)
      .select("*")
      .maybeSingle();
    if (error) throw error;
    return data;
  },

  async findActiveReservationsInRange(startIso, endIso) {
    const { data, error } = await getSupabaseAdmin()
      .from("console_reservations")
      .select("id, console_id, slot_range, source_type, source_id")
      .eq("is_active", true)
      .overlaps("slot_range", `[${startIso},${endIso})`);
    if (error) throw error;
    return data || [];
  },

  async findConsoleSchedule(consoleId, fromDate) {
    const supabase = getSupabaseAdmin();
    const { data: bookings, error: bErr } = await supabase
      .from("bookings")
      .select("id, booking_code, customer_name, booking_date, start_time, end_time, duration, booking_status, booking_source")
      .eq("console_id", consoleId)
      .gte("booking_date", fromDate)
      .in("booking_status", ["pending", "confirmed", "active"])
      .order("booking_date", { ascending: true })
      .order("start_time", { ascending: true });
    if (bErr) throw bErr;

    const { data: groups, error: gErr } = await supabase
      .from("group_bookings")
      .select("id, booking_code, customer_name, booking_date, start_time, end_time, duration, booking_status")
      .gte("booking_date", fromDate)
      .eq("booking_status", "confirmed")
      .order("booking_date", { ascending: true })
      .order("start_time", { ascending: true });
    if (gErr) throw gErr;

    return { bookings: bookings || [], groupBookings: groups || [] };
  },
};

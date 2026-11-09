import { getSupabaseAdmin } from "../config/supabase.js";

export const dashboardRepository = {
  async fetchAllOperationalSnapshots(from30Date) {
    const supabase = getSupabaseAdmin();
    const [
      consolesRes,
      bookingsRes,
      groupBookingsRes,
      walkinsRes,
      tournamentsRes,
      registrationsRes,
      paymentsRes,
    ] = await Promise.all([
      supabase.from("consoles").select("*").order("console_type"),
      supabase
        .from("bookings")
        .select("*, consoles(id, name, console_type)")
        .gte("booking_date", from30Date)
        .order("booking_date", { ascending: true })
        .order("start_time", { ascending: true }),
      supabase
        .from("group_bookings")
        .select("*")
        .gte("booking_date", from30Date)
        .order("booking_date", { ascending: true }),
      supabase
        .from("walkin_sessions")
        .select("*, consoles(id, name, console_type)")
        .gte("start_time", `${from30Date}T00:00:00+05:30`),
      supabase.from("tournaments").select("*"),
      supabase.from("tournament_registrations").select("id, tournament_id, registration_status, payment_status, created_at"),
      supabase.from("payments").select("*").gte("created_at", `${from30Date}T00:00:00+05:30`),
    ]);

    for (const res of [consolesRes, bookingsRes, groupBookingsRes, walkinsRes, tournamentsRes, registrationsRes, paymentsRes]) {
      if (res.error) throw res.error;
    }

    return {
      consoles: consolesRes.data || [],
      bookings: bookingsRes.data || [],
      groupBookings: groupBookingsRes.data || [],
      walkins: walkinsRes.data || [],
      tournaments: tournamentsRes.data || [],
      registrations: registrationsRes.data || [],
      payments: paymentsRes.data || [],
    };
  },
};

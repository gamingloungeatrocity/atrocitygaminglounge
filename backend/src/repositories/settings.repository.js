import { getSupabaseAdmin } from "../config/supabase.js";

export const settingsRepository = {
  async get() {
    const { data, error } = await getSupabaseAdmin()
      .from("lounge_settings")
      .select("*")
      .eq("id", 1)
      .maybeSingle();
    if (error) throw error;
    return (
      data || {
        id: 1,
        lounge_name: "Atrocity Gaming Lounge",
        opening_time: "10:00:00",
        closing_time: "22:00:00",
        staff_can_approve_group_bookings: false,
        staff_can_cancel_bookings: true,
        staff_can_update_console_status: true,
        staff_can_manage_tournaments: false,
        tournament_manual_approval: false,
        online_booking_auto_reserve_lounge: false,
      }
    );
  },

  async update(patch) {
    const { data, error } = await getSupabaseAdmin()
      .from("lounge_settings")
      .update(patch)
      .eq("id", 1)
      .select("*")
      .single();
    if (error) throw error;
    return data;
  },
};
